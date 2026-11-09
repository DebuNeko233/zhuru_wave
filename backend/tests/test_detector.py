"""Offline, reproducible regression tests. Not evidence of onsite accuracy."""
from pathlib import Path
import sys
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from detector import analyze_wave
from lissajous import analyze_lissajous


def triangle(length: int = 50, cycles: int = 60):
    t = np.arange(length * cycles) / length
    return 1 - 4 * np.abs((t % 1) - .5)


def test_clean_triangle_passes_and_reports_raw_metrics():
    result = analyze_wave(triangle().tolist(), sample_rate_hz=100000)
    assert result['status'] == 'PASS'
    assert result['metrics']['frequency_hz'] == pytest.approx(2000, rel=.02)
    assert result['metrics']['total_cycles'] >= 50
    assert result['metrics']['peak_stable_cycle_count'] >= 40


def test_repeated_strong_impulses_are_detected():
    y = triangle()
    for c in range(20, 35):
        y[c * 50 + 12] += 1.2
    result = analyze_wave(y.tolist())
    assert not result['pass_flag']
    assert any(e['start_index'] < 1200 and e['end_index_exclusive'] > 1100 for e in result['defects'])


def test_invalid_signal_and_rate():
    with pytest.raises(ValueError):
        analyze_wave([0.0] * 1200)
    with pytest.raises(ValueError):
        analyze_wave([float('nan')] * 500)
    with pytest.raises(ValueError):
        analyze_wave(triangle().tolist(), sample_rate_hz=-1)


def octagon(cycles=4):
    theta = np.arange(8) * np.pi / 4
    corners = np.stack((np.cos(theta), np.sin(theta)), axis=1)
    return np.array([corners[k] * (1 - t) + corners[(k + 1) % 8] * t
                     for _ in range(cycles) for k in range(8)
                     for t in np.linspace(0, 1, 101, endpoint=False)])


def test_lissajous_separates_clear_from_blurry_and_requires_sync():
    clear = octagon()
    rng = np.random.default_rng(123)
    blurred = clear + rng.normal(0, .18, clear.shape)
    with pytest.raises(ValueError):
        analyze_lissajous(clear[:, 0].tolist(), clear[:, 1].tolist())
    good = analyze_lissajous(clear[:, 0].tolist(), clear[:, 1].tolist(), synchronized=True)
    bad = analyze_lissajous(blurred[:, 0].tolist(), blurred[:, 1].tolist(), synchronized=True)
    assert good['status'] == bad['status'] == 'UNVERIFIED'
    assert good['metrics']['polygon_side_count'] == 8
    assert good['metrics']['clarity_score'] > bad['metrics']['clarity_score']
    assert good['metrics']['radial_thickness_ratio'] < bad['metrics']['radial_thickness_ratio']
    thresholds = {'min_clarity': .75, 'max_thickness': .05,
                  'max_interior_ratio': .06, 'min_shape_score': .875}
    assert analyze_lissajous(clear[:, 0].tolist(), clear[:, 1].tolist(),
                             synchronized=True, thresholds=thresholds)['pass_flag'] is True
    assert analyze_lissajous(blurred[:, 0].tolist(), blurred[:, 1].tolist(),
                             synchronized=True, thresholds=thresholds)['pass_flag'] is False


def test_lissajous_rejects_asynchronous_files():
    p = octagon()
    with pytest.raises(ValueError):
        analyze_lissajous(p[:, 0].tolist(), p[1:, 1].tolist(), synchronized=True)


def test_confirmed_alarm_returns_every_flagged_cycle_as_separate_interval():
    y = triangle()
    for c in range(20, 35):
        y[c * 50 + 12] += 1.2
    result = analyze_wave(y.tolist())
    assert result['status'] == 'FAIL'
    assert len(result['defect_cycles']) >= 3
    assert len(result['defect_cycles']) > len(result['defects'])
    for cycle in result['defect_cycles']:
        assert 0 <= cycle['start_index'] < cycle['peak_index'] < cycle['end_index_exclusive'] <= len(y)
        assert cycle['types']
        assert any(event['start_index'] <= cycle['start_index'] and
                   cycle['end_index_exclusive'] <= event['end_index_exclusive']
                   for event in result['defects'])
    # All points are distinct and listed in chronological order.
    assert [c['start_index'] for c in result['defect_cycles']] == sorted(
        c['start_index'] for c in result['defect_cycles'])


def test_clean_wave_returns_no_cycle_highlights():
    result = analyze_wave(triangle().tolist())
    assert result['defect_cycles'] == []
