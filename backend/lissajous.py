"""Diagnostics for simultaneously sampled X/Y triangular scanner signals.

An uncalibrated geometric score cannot certify ion-beam uniformity. The default
response intentionally leaves the PASS/FAIL decision unset until independently
validated normal/abnormal paired field captures establish thresholds.
"""
from __future__ import annotations
import numpy as np
from scipy.spatial import ConvexHull


def _rdp(points: np.ndarray, epsilon: float) -> np.ndarray:
    if len(points) <= 2:
        return points
    a, b = points[0], points[-1]
    axis = b - a
    if np.linalg.norm(axis) < 1e-10:
        dist = np.linalg.norm(points[1:-1] - a, axis=1)
    else:
        offsets = points[1:-1] - a
        dist = np.abs(axis[0] * offsets[:, 1] - axis[1] * offsets[:, 0]) / np.linalg.norm(axis)
    if dist.size == 0 or float(np.max(dist)) <= epsilon:
        return points[[0, -1]]
    idx = int(np.argmax(dist)) + 1
    return np.vstack([_rdp(points[:idx + 1], epsilon)[:-1], _rdp(points[idx:], epsilon)])


def _polygon_sides(points: np.ndarray) -> int:
    hull = points[ConvexHull(points).vertices]
    if len(hull) < 4:
        return len(hull)
    other = int(np.argmax(np.linalg.norm(hull - hull[0], axis=1)))
    if other <= 0 or other >= len(hull) - 1:
        return 0
    tol = .035 * float(np.linalg.norm(np.ptp(points, axis=0)))
    part1 = _rdp(hull[:other + 1], tol)
    part2 = _rdp(np.vstack([hull[other:], hull[0]]), tol)
    return int(len(part1) + len(part2) - 2)


def _phase_metrics(a: np.ndarray, b: np.ndarray) -> tuple[float | None, float | None]:
    n = len(a)
    spectrum_x = np.abs(np.fft.rfft(a - np.mean(a)))
    spectrum_y = np.abs(np.fft.rfft(b - np.mean(b)))
    ix, iy = int(np.argmax(spectrum_x[1:]) + 1), int(np.argmax(spectrum_y[1:]) + 1)
    if ix != iy:
        # Do not claim a static phase shift if the dominant frequencies differ.
        return None, None
    frequency = ix / n
    t = np.arange(n)
    carrier = np.exp(-2j * np.pi * frequency * t)
    zx = np.sum((a - np.mean(a)) * carrier)
    zy = np.sum((b - np.mean(b)) * carrier)
    delta = float(np.angle(zy / zx))
    phases = []
    for block in np.array_split(t, 4):
        if len(block) < 64:
            continue
        ph_x = np.sum((a[block] - np.mean(a[block])) * carrier[block])
        ph_y = np.sum((b[block] - np.mean(b[block])) * carrier[block])
        if abs(ph_x) > 1e-9 and abs(ph_y) > 1e-9:
            phases.append(float(np.angle(ph_y / ph_x)))
    deviations = np.angle(np.exp(1j * (np.array(phases) - delta)))
    return float(np.degrees(delta)), float(np.degrees(np.std(deviations))) if len(deviations) else None


def analyze_lissajous(x: list[float], y: list[float], *, synchronized: bool = False,
                      thresholds: dict | None = None) -> dict:
    if not synchronized:
        raise ValueError('synchronized=true and simultaneous X/Y acquisition required')
    a, b = np.asarray(x, dtype=float), np.asarray(y, dtype=float)
    if a.ndim != 1 or b.ndim != 1 or len(a) != len(b) or len(a) < 256 or \
       not np.all(np.isfinite(a)) or not np.all(np.isfinite(b)):
        raise ValueError('X/Y must have the same length and >=256 finite paired samples')
    points = np.column_stack((a, b))
    center = np.median(points, axis=0)
    spread = np.percentile(points, 99, axis=0) - np.percentile(points, 1, axis=0)
    if np.any(spread <= 1e-10):
        raise ValueError('X/Y amplitude range too small')
    points = (points - center) / (spread / 2)
    angles = (np.arctan2(points[:, 1], points[:, 0]) + 2 * np.pi) % (2 * np.pi)
    radii = np.linalg.norm(points, axis=1)
    n_bins = 48
    bucket = np.floor(angles * n_bins / (2 * np.pi)).astype(int) % n_bins
    thickness = []
    interior = 0
    occupied = 0
    for i in range(n_bins):
        rs = radii[bucket == i]
        if len(rs) < 6:
            continue
        occupied += 1
        med = float(np.median(rs))
        thickness.append(float(np.median(np.abs(rs - med)) / max(med, 1e-9)))
        interior += int(np.count_nonzero(rs < med * .78))
    coverage = occupied / n_bins
    radial_thickness = float(np.median(thickness)) if thickness else 1.0
    interior_ratio = float(interior / len(points))
    sides = _polygon_sides(points)
    shape_score = float(max(0, 1 - abs(sides - 8) / 8))
    clarity = float(np.clip(np.exp(-7 * radial_thickness) * (1 - interior_ratio) * coverage, 0, 1))
    phase_deg, phase_std_deg = _phase_metrics(a, b)
    metrics = {
        'clarity_score': round(clarity, 5),
        'radial_thickness_ratio': round(radial_thickness, 5),
        'interior_fill_ratio': round(interior_ratio, 5),
        'angular_coverage': round(coverage, 5),
        'polygon_side_count': int(sides),
        'octagon_shape_score': round(shape_score, 5),
        'phase_difference_deg': round(phase_deg, 4) if phase_deg is not None else None,
        'phase_stability_std_deg': round(phase_std_deg, 4) if phase_std_deg is not None else None,
    }
    accepted = None
    if thresholds is not None:
        required = {'min_clarity', 'max_thickness', 'max_interior_ratio', 'min_shape_score'}
        if not required.issubset(thresholds):
            raise ValueError(f'calibrated thresholds must contain {sorted(required)}')
        accepted = bool(clarity >= thresholds['min_clarity'] and
                        radial_thickness <= thresholds['max_thickness'] and
                        interior_ratio <= thresholds['max_interior_ratio'] and
                        shape_score >= thresholds['min_shape_score'])
    return {
        'status': ('PASS' if accepted else 'FAIL') if accepted is not None else 'UNVERIFIED',
        'pass_flag': accepted,
        'octagon_ok': accepted,
        'metrics': metrics,
        'note': 'XY raw synchronized data; thresholds require onsite validation' if thresholds is None
                else 'Result uses caller-supplied candidate thresholds; verify calibration provenance',
    }
