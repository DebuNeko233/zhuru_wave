"""Inspect raw HT acquisition exports without interpreting Value as voltage.

Usage:
    python inspect_legacy_csv.py path/to/60x1.csv [--limit 100000]
The export begins with DRC_File and metadata lines, then tab-delimited
CH, Index, Value rows. This tool is read-only and requires no third-party libs.
"""
from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from statistics import median


def inspect(path: Path, limit: int | None = None) -> dict:
    n = 0
    mean = 0.0
    m2 = 0.0
    min_value = math.inf
    max_value = -math.inf
    first_index = None
    last_index = None
    channel_ids: set[int] = set()
    previous: float | None = None
    previous_crossing: int | None = None
    half_period_gaps: list[int] = []
    crossing_count = 0
    skipped = 0
    metadata: list[str] = []

    with path.open("r", encoding="utf-8-sig", errors="replace") as stream:
        for line in stream:
            stripped = line.strip()
            if not stripped:
                continue
            if stripped.startswith(("DRC_File:", "Channels_qnty:")):
                metadata.append(stripped)
                continue
            parts = stripped.split("\t")
            if len(parts) < 3:
                if "Index" not in stripped:
                    skipped += 1
                continue
            try:
                ch = int(parts[0].strip())
                index = int(parts[1].strip())
                value = float(parts[2].strip())
            except ValueError:
                # Header line "CH Index Value"
                if "Index" not in stripped:
                    skipped += 1
                continue
            if not math.isfinite(value):
                skipped += 1
                continue
            if first_index is None:
                first_index = index
            last_index = index
            channel_ids.add(ch)
            n += 1
            delta = value - mean
            mean += delta / n
            m2 += delta * (value - mean)
            min_value = min(min_value, value)
            max_value = max(max_value, value)

            # Count sign changes only; a 0 is not treated as a crossing.
            if previous is not None and previous * value < 0.0:
                crossing_count += 1
                if previous_crossing is not None:
                    half_period_gaps.append(index - previous_crossing)
                previous_crossing = index
            previous = value
            if limit is not None and n >= limit:
                break

    return {
        "file": str(path),
        "unit": "raw_export_value (not calibrated volts)",
        "metadata": metadata,
        "channels": sorted(channel_ids),
        "samples": n,
        "first_index": first_index,
        "last_index": last_index,
        "min": min_value if n else None,
        "max": max_value if n else None,
        "mean": mean if n else None,
        "std_population": math.sqrt(m2 / n) if n else None,
        "zero_crossings": crossing_count,
        "median_half_period_samples": (
            median(half_period_gaps) if half_period_gaps else None
        ),
        "skipped_rows": skipped,
        "note": "Separate exports do not establish cross-channel synchronization.",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", type=Path)
    parser.add_argument("--limit", type=int, default=None)
    args = parser.parse_args()
    if args.limit is not None and args.limit < 1:
        parser.error("--limit must be positive")
    print(json.dumps(inspect(args.csv, args.limit), indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
