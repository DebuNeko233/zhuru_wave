#!/usr/bin/env python3
"""Produce 7 replay files from unmodified field raw trace and synthetic defects.

Labels are never sent to the detector. No claim that unmodified field trace is
fully defect-free. The exported values are acquisition raw values, not volts.
"""
from __future__ import annotations
import argparse
import csv
import json
from pathlib import Path
import numpy as np

TEMPLATES = [
    ('spike', '毛刺三角波.csv', '01_毛刺异常.csv'),
    ('clipping', '削波三角波.csv', '02_削波异常.csv'),
    ('rounded_peak', '圆顶三角波.csv', '03_圆顶异常.csv'),
    ('peak_drop', '顶峰突降三角波.csv', '04_顶峰突降.csv'),
    ('zero_step', '零点台阶三角波.csv', '05_零点台阶.csv'),
]

def load_field(path: Path, count: int) -> np.ndarray:
    values=[]
    with path.open(encoding='utf-8-sig', errors='replace') as f:
        for line in f:
            fields=line.strip().split('\t')
            if len(fields)==3 and fields[0].strip().isdigit() and fields[1].strip().isdigit():
                try: values.append(float(fields[2]))
                except ValueError: pass
                if len(values) >= count: break
    if len(values) < count: raise ValueError('not enough field samples')
    return np.asarray(values)


def inject(output: np.ndarray, original: np.ndarray, crossings: np.ndarray,
           template: np.ndarray, target: int, *, cycles: int = 24) -> dict:
    mid = int(np.argmin(abs(crossings-target)))
    first = mid - cycles//2
    last = first + cycles
    if first < 0 or last >= len(crossings): raise ValueError('event too close to boundary')
    period = float(np.median(np.diff(crossings)))
    for k in range(first,last):
        start,end = int(crossings[k]), int(crossings[k+1])
        width = end-start
        local = original[max(0, start-int(2*period)): min(len(original),end+int(2*period))]
        baseline = float(np.median(local))
        amp = float((np.percentile(local,95)-np.percentile(local,5))/2)
        # Wrap the 100-point abnormal shape onto a complete real field period.
        phase = np.arange(width)/width
        tmpl = np.interp(phase, np.linspace(0,1,len(template)+1), np.r_[template,template[0]])
        synthetic = baseline+amp*tmpl
        blend = min(2,max(0,width//8))
        if blend:
            weight=np.ones(width)
            weight[:blend] = np.linspace(.35,.85,blend)
            weight[-blend:] = np.linspace(.85,.35,blend)
            synthetic = weight*synthetic+(1-weight)*original[start:end]
        output[start:end] = synthetic
    return {'start_index':int(crossings[first]),'end_index_exclusive':int(crossings[last]),
            'cycles':cycles, 'source':'synthetic_template'}


def save_csv(path: Path, samples: np.ndarray, *, scenario: str, source: str,
             sample_rate_hz: float | None = None):
    with path.open('w',newline='',encoding='utf-8') as f:
        w=csv.writer(f)
        w.writerow(['meta_key','meta_value','sample_index','X_raw'])
        meta = {'format':'zhuru-wave-v1','sample_rate_hz':sample_rate_hz or '',
                'channel_count':1,'channel_names':'X','amplitude_unit':'raw',
                'mode':'DEMO','scenario':scenario,'source':source}
        for key,val in meta.items():w.writerow([key,val,'',''])
        for i, v in enumerate(samples):w.writerow(['','',i,format(float(v),'.6f')])


def generate(source:Path,template_dir:Path,out:Path, *, sample_rate_hz:float|None=None,
             sample_count:int=60000) -> list[dict]:
    out.mkdir(parents=True,exist_ok=True)
    if sample_count < 20000:
        raise ValueError('sample_count must be >= 20000 for demonstration')
    original=load_field(source,sample_count)
    crosses=np.where((original[:-1]<=0)&(original[1:]>0))[0]+1
    if not 25 <= np.median(np.diff(crosses)) <= 120:
        raise ValueError('unexpected source periods')
    all_events=[]
    save_csv(out/'00_正常三角波.csv',original,scenario='field_baseline_unmodified',source=source.name,sample_rate_hz=sample_rate_hz)
    for typ,template_name,target_name in TEMPLATES:
        raw=original
        result=raw.copy()
        template=np.loadtxt(template_dir/template_name,delimiter=',')
        # Two separated fault episodes let the UI demonstrate detection, recovery,
        # and a second independent alarm without needing a new playback component.
        for target in (int(sample_count * .27), int(sample_count * .72)):
            ev=inject(result,raw,crosses,template,target)
            ev.update(type=typ,file=target_name)
            all_events.append(ev)
        save_csv(out/target_name,result,scenario=typ,source=source.name,sample_rate_hz=sample_rate_hz)
    mixed=original.copy()
    for j,(typ,template_name,_) in enumerate(TEMPLATES):
        template=np.loadtxt(template_dir/template_name,delimiter=',')
        ev=inject(mixed,original,crosses,template,int(np.linspace(sample_count*.16,sample_count*.85,5)[j]))
        ev.update(type=typ,file='06_混合异常.csv')
        all_events.append(ev)
    save_csv(out/'06_混合异常.csv',mixed,scenario='mixed',source=source.name,sample_rate_hz=sample_rate_hz)
    with (out/'labels.json').open('w',encoding='utf-8') as f:
        json.dump({'source':source.name,'baseline_certified_normal':False,
                   'labels_for_testing_only':True,'events':all_events},f,ensure_ascii=False,indent=2)
    return all_events

if __name__=='__main__':
    ap=argparse.ArgumentParser()
    ap.add_argument('--source',required=True,type=Path)
    ap.add_argument('--templates',required=True,type=Path)
    ap.add_argument('--output',required=True,type=Path)
    ap.add_argument('--sample-rate-hz',type=float)
    ap.add_argument('--sample-count',type=int,default=60000,help='samples per file, minimum 20000')
    a=ap.parse_args()
    events=generate(a.source,a.templates,a.output,sample_rate_hz=a.sample_rate_hz,
                    sample_count=a.sample_count)
    print(f'Generated 7 CSV files and {len(events)} annotated defect segments')
