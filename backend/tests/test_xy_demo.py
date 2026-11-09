"""Repeatable synthetic XY geometry smoke tests; not field PASS/FAIL calibration."""
from __future__ import annotations
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
sys.path.insert(0, str(ROOT / 'scripts'))
from generate_xy_demo import octagon  # noqa: E402
from lissajous import analyze_lissajous  # noqa: E402


def test_synthetic_clear_vs_blurry_trajectory():
    a, b = octagon(2048, 233, noise=.002)
    c, d = octagon(2048, 233, noise=.125, blur=True)
    clear = analyze_lissajous(a.tolist(), b.tolist(), synchronized=True)
    blurry = analyze_lissajous(c.tolist(), d.tolist(), synchronized=True)
    assert clear['status'] == blurry['status'] == 'UNVERIFIED'
    assert clear['metrics']['polygon_side_count'] == 8
    assert clear['metrics']['clarity_score'] > blurry['metrics']['clarity_score'] + 0.3
    assert clear['metrics']['radial_thickness_ratio'] < blurry['metrics']['radial_thickness_ratio']
