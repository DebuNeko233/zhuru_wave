"""Create 60,000-sample synchronized, explicitly synthetic XY trajectory examples."""
from __future__ import annotations
import argparse
import csv
from pathlib import Path
import numpy as np

NAMES = ('X1', 'Y1', 'X2', 'Y2')


def octagon(n: int, seed: int, noise: float = 0.003, blur: bool = False) -> tuple[np.ndarray, np.ndarray]:
    """Piecewise-linear X/Y scanners traverse an octagonal trajectory (synthetic model)."""
    rng = np.random.default_rng(seed)
    theta = np.arange(8, dtype=float) * (np.pi / 4) + np.pi / 8
    verts = np.column_stack((np.cos(theta), np.sin(theta)))
    period = 64
    ticks = np.arange(n) % period
    edge = (ticks // 8).astype(int)
    t = (ticks % 8) / 8
    coords = verts[edge] * (1 - t[:, None]) + verts[(edge + 1) % 8] * t[:, None]
    if blur:
        # Slow phase/radius wandering plus interior scattering mimics an unstable trace.
        tt = np.arange(n)
        angle = 0.12 * np.sin(2 * np.pi * tt / 5000)
        c, s = np.cos(angle), np.sin(angle)
        coords = np.stack((coords[:, 0] * c - coords[:, 1] * s,
                           coords[:, 0] * s + coords[:, 1] * c), axis=1)
        shrink = np.ones(n)
        mask = rng.random(n) < 0.23
        shrink[mask] = rng.uniform(0.2, 0.85, np.count_nonzero(mask))
        coords *= shrink[:, None]
    coords += rng.normal(0, noise, size=coords.shape)
    # Physical calibration is NOT implied; values are normalized raw scale.
    return coords[:, 0] * 18000.0, coords[:, 1] * 16000.0


def write(path: Path, arrays: dict[str, np.ndarray], label: str, rate: int = 125000) -> None:
    n = len(next(iter(arrays.values())))
    names = list(arrays)
    with path.open('w', newline='', encoding='utf-8') as out:
        w = csv.writer(out, lineterminator='\n')
        w.writerow(['meta_key', 'meta_value', 'sample_index', *names])
        for meta, value in [('format', 'zhuru-wave-v1'), ('sample_rate_hz', rate),
                            ('channel_count', len(names)), ('channel_names', '|'.join(names)),
                            ('amplitude_unit', 'raw'), ('scenario', label),
                            ('synchronized', 'true'), ('source', 'synthetic')]:
            w.writerow([meta, value, '', *([''] * len(names))])
        for i in range(n):
            w.writerow(['', '', i, *(f'{arrays[name][i]:.4f}' for name in names)])


def main() -> None:
    arg = argparse.ArgumentParser()
    arg.add_argument('--output', type=Path, default=Path('demo/xy'))
    arg.add_argument('--samples', type=int, default=60000)
    args = arg.parse_args()
    if args.samples < 20000:
        arg.error('--samples must be >= 20000')
    args.output.mkdir(parents=True, exist_ok=True)
    gx, gy = octagon(args.samples, 233, noise=.002)
    bx, by = octagon(args.samples, 233, noise=.125, blur=True)
    mx, my = octagon(args.samples, 233, noise=.04, blur=True)
    write(args.output / '01_clear_octagon.csv', {'X1': gx, 'Y1': gy}, 'clear_synthetic')
    write(args.output / '02_blurred_octagon.csv', {'X1': bx, 'Y1': by}, 'blurred_synthetic')
    write(args.output / '03_distorted_octagon.csv', {'X1': mx, 'Y1': my}, 'distorted_synthetic')
    write(args.output / '04_four_channels_compare.csv',
          {'X1': gx, 'Y1': gy, 'X2': bx, 'Y2': by}, 'four_channel_compare_synthetic')
    print(f'Wrote 4 synchronized CSV files with {args.samples} samples each to {args.output}')


if __name__ == '__main__':
    main()
