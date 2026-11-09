"""Wave detection HTTP server, compatible with the existing Electron API.

Legacy tuning arguments are accepted but are no longer used as voltage-based
thresholds; features are evaluated in dimensionless per-cycle ratios.
"""
from __future__ import annotations
import os
from flask import Flask, jsonify, request
from waitress import serve
from dotenv import load_dotenv
from detector import analyze_wave
from lissajous import analyze_lissajous

app = Flask(__name__)


@app.post('/wave_check')
def wave_check():
    try:
        payload = request.get_json(silent=True) or {}
        opts = payload.get('data', {})
        if not isinstance(opts, dict):
            raise ValueError('data must be an object')
        result = analyze_wave(opts.get('wave', []),
                              sample_rate_hz=opts.get('sample_rate_hz'),
                              sensitivity=float(opts.get('sensitivity', 1.0)))
        # Keep old front-end data names. Only true abnormal locations are returned.
        # One visible point per confirmed abnormal cycle (not one per grouped event).
        points = [{str(c['peak_index']): c['score']} for c in result['defect_cycles']]
        return jsonify({'code': 200, 'msg': 'success', 'data': {
            **result, 'tubiandian_list': points,
            'err_data_list': [], 'err_pic_path_list': []}})
    except (ValueError, TypeError, OverflowError) as exc:
        return jsonify({'code': 400, 'msg': str(exc)}), 400


@app.post('/wave_check_pair')
def wave_check_pair():
    try:
        opts = (request.get_json(silent=True) or {}).get('data', {})
        result = analyze_lissajous(opts.get('wave_x', []), opts.get('wave_y', []),
                                   synchronized=opts.get('synchronized', False),
                                   thresholds=opts.get('thresholds'))
        return jsonify({'code': 200, 'msg': 'success', 'data': result})
    except (ValueError, TypeError, OverflowError) as exc:
        return jsonify({'code': 400, 'msg': str(exc)}), 400


@app.get('/health')
def health():
    return jsonify({'status': 'ok', 'service': 'zhuru-wave-detector'})


if __name__ == '__main__':
    load_dotenv()
    serve(app, host=os.getenv('HOST', '127.0.0.1'),
          port=int(os.getenv('PORT', '5001')),
          threads=int(os.getenv('THREADS', '4')),
          backlog=int(os.getenv('BACKLOG', '128')))
