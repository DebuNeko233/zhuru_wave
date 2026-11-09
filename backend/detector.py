"""Explainable, conservative triangle-wave diagnostics in original acquisition units.

No calibration of raw ADC counts to volts is implied. Detection labels require
validation on independently labelled field recordings before machine protection use.
"""
from __future__ import annotations

import numpy as np
from scipy.signal import find_peaks


def _median_mad(a: np.ndarray) -> tuple[float, float]:
    med = float(np.median(a))
    return med, 1.4826 * float(np.median(np.abs(a - med)))


def _period_estimate(y: np.ndarray) -> int:
    """Estimate period from FFT autocorrelation; zero crossing alone is too noisy."""
    n = min(len(y), 16000)
    z = y[:n] - np.median(y[:n])
    size = 1 << (2 * n - 1).bit_length()
    power = np.fft.rfft(z, size)
    ac = np.fft.irfft(power * np.conjugate(power), size)[:n]
    if ac[0] <= 1e-10:
        raise ValueError('constant signal')
    ac = ac / (ac[0] + 1e-12)
    upper = min(n // 5, 1500)
    if upper < 12:
        raise ValueError('insufficient complete cycles')
    peaks, _ = find_peaks(ac[8:upper], height=0.15, distance=6)
    if len(peaks) == 0:
        raise ValueError('no stable periodic structure')
    shifts = peaks + 8
    # Prefer an early strong peak to an integer multiple of the period.
    strong = shifts[ac[shifts] >= max(0.25, 0.72 * float(np.max(ac[shifts])))]
    return int(strong[0] if strong.size else shifts[np.argmax(ac[shifts])])


def _segments(y: np.ndarray, period: int) -> list[tuple[int, int]]:
    # Locate troughs on lightly-smoothed signal. Use actual period boundaries,
    # not fixed frames, to avoid treating normal waveform corners as glitches.
    filt = np.convolve(np.pad(y, (2, 2), mode='edge'), np.ones(5) / 5, mode='valid')
    rough_range = float(np.percentile(filt, 98) - np.percentile(filt, 2))
    troughs, _ = find_peaks(-filt, distance=max(8, int(period * .70)),
                            prominence=rough_range * .17)
    valid = []
    for a, b in zip(troughs[:-1], troughs[1:]):
        if .68 * period <= (b - a) <= 1.35 * period:
            valid.append((int(a), int(b)))
    return valid


def _linear(x: np.ndarray, z: np.ndarray) -> tuple[np.ndarray, float, float]:
    # Least-squares straight line. Leave endpoint discontinuities visible in residuals.
    if len(x) < 3:
        return z.copy(), 0.0, 0.0
    slope, intercept = np.polyfit(x, z, 1)
    pred = slope * x + intercept
    return pred, float(slope), float(np.sqrt(np.mean((z - pred) ** 2)))


def analyze_wave(wave: list[float], *, sample_rate_hz: float | None = None,
                 sensitivity: float = 1.0, min_bad_cycles: int = 2) -> dict:
    """Per-cycle features, defects and alarm state. Indexes relative to this input."""
    y = np.asarray(wave, dtype=float)
    if y.ndim != 1 or y.size < 256 or not np.all(np.isfinite(y)):
        raise ValueError('wave must contain at least 256 finite samples')
    if sample_rate_hz is not None and (not np.isfinite(sample_rate_hz) or sample_rate_hz <= 0):
        raise ValueError('sample_rate_hz must be positive or null')
    period = _period_estimate(y)
    spans = _segments(y, period)
    if len(spans) < 4:
        raise ValueError('insufficient reliable periods')

    cycles = []
    for start, end in spans:
        v = y[start:end + 1]
        # Strongly smooth only for locating maximum; analyse original trace.
        sv = np.convolve(np.pad(v, (2, 2), mode='edge'), np.ones(5) / 5, mode='valid')
        peak = int(np.argmax(sv))
        if peak < len(v) * .15 or peak > len(v) * .85:
            continue
        amp = float(np.percentile(v, 99) - np.percentile(v, 1))
        if amp <= 1e-9:
            continue
        left, rise_slope, rise_error = _linear(np.arange(peak + 1), v[:peak + 1])
        right, fall_slope, fall_error = _linear(np.arange(len(v) - peak), v[peak:])
        ideal = np.r_[left[:-1], right]
        residual = v - ideal
        residual_ratio = float(np.quantile(np.abs(residual), .95) / amp)
        peak_region = v[max(0, peak - 3):min(len(v), peak + 4)]
        top_flat = float(max(np.mean(v >= np.max(v) - amp * .05),
                             np.mean(v <= np.min(v) + amp * .05)))
        center = (np.max(v) + np.min(v)) / 2
        near_zero = (np.abs(v[:-1] - center) < .14 * amp) & (np.abs(v[1:] - center) < .14 * amp)
        zero_flat = float(np.mean(np.abs(np.diff(v)[near_zero]) < .009 * amp)) if np.any(near_zero) else 0.0
        # Max local departure from expected constant slope, away from natural corners.
        diffs = np.diff(v)
        slope_ideal = np.diff(ideal)
        kink = float(np.max(np.abs(diffs - slope_ideal)) / amp)
        err_i = int(np.argmax(np.abs(residual)))
        cycles.append({'start': start, 'end': end,
                       'period_samples': end - start,
                       'peak_to_peak_raw': amp,
                       'rise_slope_raw_per_sample': rise_slope,
                       'fall_slope_raw_per_sample': fall_slope,
                       'linearity_error': residual_ratio,
                       'kink_score': kink,
                       'peak_flat_ratio': top_flat,
                       'zero_plateau_ratio': zero_flat,
                       'worst_index': int(start + err_i),
                       'worst_residual_raw': float(residual[err_i])})
    if len(cycles) < 4:
        raise ValueError('insufficient complete triangle cycles')

    amps = np.array([c['peak_to_peak_raw'] for c in cycles])
    errors = np.array([c['linearity_error'] for c in cycles])
    kinks = np.array([c['kink_score'] for c in cycles])
    periods = np.array([c['period_samples'] for c in cycles])
    center_amp, amp_noise = _median_mad(amps)
    baseline_err = float(np.quantile(errors, .25))
    _, err_mad = _median_mad(errors)
    baseline_kink = float(np.quantile(kinks, .25))
    _, kink_mad = _median_mad(kinks)
    sensitivity = float(np.clip(sensitivity, .5, 2.0))
    # Both absolute lower bounds and context-dependent thresholds prevent runaway false alarms.
    err_thr = max(.105, baseline_err + max(.06, 3.5 * err_mad)) / sensitivity
    kink_thr = max(.20, baseline_kink + max(.13, 3.0 * kink_mad)) / sensitivity
    amp_thr = max(.34, 4.0 * amp_noise / (center_amp + 1e-9)) / sensitivity

    # Mild rounded peaks and a small zero crossing step are only actionable if
    # they recur in multiple neighboring periods. Suppress isolated sample noise.
    flat_flags = np.array([c['peak_flat_ratio'] > .088 / sensitivity for c in cycles])
    zero_flags = np.array([c['zero_plateau_ratio'] > .15 / sensitivity for c in cycles])
    sustained_flat = np.convolve(flat_flags.astype(int), np.ones(8, dtype=int), 'same') >= 5
    sustained_zero = np.convolve(zero_flags.astype(int), np.ones(8, dtype=int), 'same') >= 4

    bad = []
    for i, c in enumerate(cycles):
        amp_dev = abs(c['peak_to_peak_raw'] - center_amp) / (center_amp + 1e-9)
        reasons = []
        if c['linearity_error'] > err_thr:
            reasons.append('nonlinear_slope')
        if c['kink_score'] > kink_thr:
            reasons.append('spike_or_step')
        if amp_dev > amp_thr:
            reasons.append('amplitude_drift')
        if abs(c['period_samples'] - period) / period > .3 / sensitivity:
            reasons.append('period_jitter')
        if sustained_flat[i]:
            reasons.append('clipped_or_rounded_peak')
        if sustained_zero[i]:
            reasons.append('zero_crossing_step')
        if reasons:
            bad.append({'start_index': c['start'], 'end_index_exclusive': c['end'],
                        'peak_index': c['worst_index'], 'types': reasons,
                        'score': round(max(c['linearity_error'] / err_thr,
                                           c['kink_score'] / kink_thr,
                                           amp_dev / amp_thr,
                                           float(bool(sustained_flat[i] or sustained_zero[i])) * 1.1), 3)})

    # Collapse neighboring abnormal cycles into events; a single serious spike also triggers.
    events = []
    for item in bad:
        if events and item['start_index'] - events[-1]['end_index_exclusive'] <= 1.4 * period:
            ev = events[-1]
            ev['end_index_exclusive'] = item['end_index_exclusive']
            ev['count'] += 1
            ev['score'] = max(ev['score'], item['score'])
            ev['types'] = sorted(set(ev['types']) | set(item['types']))
            ev['peak_index'] = item['peak_index'] if item['score'] > ev['top_score'] else ev['peak_index']
            ev['top_score'] = max(ev['top_score'], item['score'])
        else:
            events.append({**item, 'count': 1, 'top_score': item['score']})
    confirmed = []
    for e in events:
        shape = set(e['types']) & {
            'nonlinear_slope', 'spike_or_step', 'clipped_or_rounded_peak', 'zero_crossing_step'}
        if (shape and (e['count'] >= max(3, min_bad_cycles) or e['score'] >= 2.6)) or \
           (not shape and e['count'] >= 6 and e['score'] >= 1.4):
            e.pop('top_score')
            confirmed.append(e)
    # Return every individually flagged cycle that belongs to a confirmed event.
    # The interval list is intentionally separate from grouped alarm events: the UI
    # must highlight each abnormal period without painting the healthy gaps red.
    confirmed_cycles = [
        cycle for cycle in bad
        if any(
            event['start_index'] <= cycle['start_index']
            and cycle['end_index_exclusive'] <= event['end_index_exclusive']
            for event in confirmed
        )
    ]

    # Peak-level duration: number of consecutive periods near maximum stable amplitude.
    ref = float(np.percentile(amps, 90))
    target = np.abs(amps - ref) <= .05 * max(ref, 1e-9)
    run = longest = 0
    for flag in target:
        run = run + 1 if flag else 0
        longest = max(longest, run)

    freq = float(sample_rate_hz / np.median(periods)) if sample_rate_hz else None
    return {
        'pass_flag': len(confirmed) == 0,
        'status': 'PASS' if not confirmed else 'FAIL',
        'metrics': {
            'amplitude_raw_pp_median': round(float(np.median(amps)), 5),
            'amplitude_raw_pp_cv': round(float(np.std(amps) / (np.mean(amps) + 1e-9)), 5),
            'period_samples_median': float(np.median(periods)),
            'frequency_hz': round(freq, 5) if freq else None,
            'period_jitter_cv': round(float(np.std(periods) / np.mean(periods)), 5),
            'rise_slope_raw_per_sample_median': float(np.median([c['rise_slope_raw_per_sample'] for c in cycles])),
            'fall_slope_raw_per_sample_median': float(np.median([c['fall_slope_raw_per_sample'] for c in cycles])),
            'linearity_error_p90': round(float(np.quantile(errors, .9)), 5),
            'peak_stable_cycle_count': longest,
            'total_cycles': len(cycles),
        },
        'thresholds': {'linearity_error': round(err_thr, 5), 'kink': round(kink_thr, 5), 'amplitude': round(amp_thr, 5)},
        'defects': confirmed,
        'defect_cycles': confirmed_cycles,
    }
