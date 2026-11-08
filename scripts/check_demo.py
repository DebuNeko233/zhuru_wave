#!/usr/bin/env python3
"""Evaluate 2000-sample detection windows against labels.json, never used at inference."""
from __future__ import annotations
import argparse
import csv
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'backend'))
from detector import analyze_wave


def check(folder: Path) -> dict:
    labels=json.loads((folder/'labels.json').read_text(encoding='utf-8'))
    results=[]
    for path in sorted(folder.glob('*.csv')):
        with path.open(encoding='utf-8') as f:
            samples=[float(r[3]) for r in csv.reader(f)
                     if len(r) >= 4 and r[2].isdigit()]
        annotated=[e for e in labels['events'] if e['file']==path.name]
        detected=[]
        for start in range(0,len(samples),2000):
            block=samples[start:start+2000]
            if len(block)<256:continue
            result=analyze_wave(block)
            detected.extend([{**ev,'start_index':start+ev['start_index'],
                              'end_index_exclusive':start+ev['end_index_exclusive']}
                             for ev in result['defects']])
        hit=[any(d['start_index']<ev['end_index_exclusive'] and
                 d['end_index_exclusive']>ev['start_index'] for d in detected)
             for ev in annotated]
        extras=sum(not any(d['start_index']<ev['end_index_exclusive'] and
                           d['end_index_exclusive']>ev['start_index'] for ev in annotated)
                   for d in detected)
        results.append({'file':path.name,'injected':len(annotated),
                        'detected_injected':sum(hit),'unmatched_detected_events':extras,
                        'detected_events':len(detected)})
    return {'disclaimer':'Synthetic annotation test, not onsite accuracy', 'files':results}

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('directory',type=Path)
    a=parser.parse_args()
    print(json.dumps(check(a.directory),ensure_ascii=False,indent=2))
