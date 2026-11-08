#!/usr/bin/env python3
"""Inspect raw DRC CSV exports without converting amplitudes to volts."""
from pathlib import Path
from argparse import ArgumentParser
import statistics

def load(path: Path):
    with path.open(encoding="utf-8-sig", errors="replace") as f:
        meta = [next(f, "").rstrip("\n") for _ in range(3)]
        values = []
        for row in f:
            parts = row.strip().split("\t")
            if len(parts) < 3:
                continue
            try:
                values.append(float(parts[2]))
            except ValueError:
                continue
    return meta, values

def main():
    parser = ArgumentParser()
    parser.add_argument("csv", type=Path)
    args = parser.parse_args()
    meta, values = load(args.csv)
    print("\n".join(meta))
    if not values:
        raise SystemExit("No samples parsed")
    print("count:", len(values), "min:", min(values), "max:", max(values))
    print("mean:", statistics.fmean(values))
    print("units: exported raw Value (not volts)")

if __name__ == "__main__":
    main()
