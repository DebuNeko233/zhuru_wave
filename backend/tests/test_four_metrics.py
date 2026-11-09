"""Regression checks for the single-channel demo metric contract."""
from pathlib import Path
import sys
import numpy as np
import pytest
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from detector import analyze_wave


def triangular(n_cycles=60, points=50):
    t = np.arange(n_cycles*points) / points
    return 1 - 4 * np.abs((t % 1) - .5)


def test_four_metrics_have_values_without_claiming_uncalibrated_pass():
    result = analyze_wave(triangular().tolist(), sample_rate_hz=100000)
    fields = result['metric_results']
    assert set(fields) == {'peak_to_peak', 'frequency', 'slope', 'peak_stable_cycles'}
    assert fields['peak_to_peak']['value'] == pytest.approx(2, rel=.05)
    assert fields['frequency']['value'] == pytest.approx(2000, rel=.02)
    assert fields['slope']['rise_value'] > 0
    assert fields['slope']['fall_value'] < 0
    assert fields['peak_stable_cycles']['value'] >= 50
    assert fields['peak_to_peak']['status'] == 'REFERENCE'
    assert result['peak_stable_spans'] and result['cycle_metrics']


def test_no_sample_rate_does_not_invent_frequency():
    result = analyze_wave(triangular().tolist())
    assert result['metric_results']['frequency']['value'] is None
    assert result['metric_results']['frequency']['status'] == 'DATA_INSUFFICIENT'


def test_isolated_subthreshold_reversal_is_suspect_not_forced_alarm():
    w = triangular()
    for k in range(20, 28):
        w[k*50 + 12] -= .12
    result = analyze_wave(w.tolist())
    assert len(result['suspect_cycles']) >= 3
    assert any(c['peak_index'] % 50 in (12, 13) for c in result['suspect_cycles'])
    assert result['pass_flag'] is True
