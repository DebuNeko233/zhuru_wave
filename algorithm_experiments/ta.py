from typing import List, Tuple, Dict, Any

import matplotlib
import matplotlib.pyplot as plt
matplotlib.rcParams['font.family'] = ['Times New Roman', 'SimSun']

def is_triangle_wave_debug(
    y: List[float],
    *,
    slope_eps: float = 0.01,       # 斜率“近零”阈值（归一化后）
    peak_flat_tol: float = 0.05,   # 峰值相对幅度容差：离峰值小于该差值视为“近峰顶”
    peak_flat_min_pts: int = 3,    # 判“圆顶/平顶”的最少近峰顶点数
    majority: float = 0.6,         # 多数规则（>=60%的正半周期满足）
    min_seg_len: int = 4           # 半周期的最短长度（样本点数）
) -> Tuple[bool, Dict[str, Any]]:
    """
    Debug 版三角波判定：返回 (result, debug)
      - result: True 表示“不是圆顶的三角波”
      - debug : 所有中间过程与指标，便于调参
    """
    debug: Dict[str, Any] = {
        "params": {
            "slope_eps": slope_eps,
            "peak_flat_tol": peak_flat_tol,
            "peak_flat_min_pts": peak_flat_min_pts,
            "majority": majority,
            "min_seg_len": min_seg_len,
        },
        "normalized": [],
        "avg": None,
        "amp": None,
        "crossings": [],       # [{"i": int, "kind": "rise"/"fall"}]
        "segments": [],        # 每段的详细指标与数据
        "summary": {}
    }

    n = len(y)
    if n < 4:
        debug["summary"] = {"reason": "too_short", "n": n}
        return False, debug

    # 1) 归一化（均值为零，幅度缩放到 [-1,1]）
    avg = sum(y) / n
    yc = [v - avg for v in y]
    amp = max((abs(v) for v in yc), default=1.0) or 1.0
    yn = [v / amp for v in yc]

    debug["avg"] = avg
    debug["amp"] = amp
    debug["normalized"] = yn[:]

    # 2) 找“正半周期”（先上升过零再下降过零），不插值，极简做法
    crossings: List[Tuple[int, str]] = []
    for i in range(n - 1):
        a, b = yn[i], yn[i + 1]
        if a < 0 <= b:
            crossings.append((i, "rise"))
        elif a > 0 >= b:
            crossings.append((i, "fall"))

    debug["crossings"] = [{"i": i, "kind": k} for i, k in crossings]

    pos_segments: List[Tuple[int, int, List[float]]] = []
    for k in range(len(crossings) - 1):
        i1, k1 = crossings[k]
        i2, k2 = crossings[k + 1]
        if k1 == "rise" and k2 == "fall":
            seg = yn[i1:i2 + 2]  # 含两端
            if len(seg) >= min_seg_len:
                pos_segments.append((i1, i2 + 1, seg))

    if not pos_segments:
        debug["summary"] = {"reason": "no_positive_half_periods"}
        return False, debug

    # 3) 分析每个正半周期：斜率突变 & 圆顶判断
    def analyze_segment(seg: List[float]) -> Dict[str, Any]:
        # 步长为5
        step = 5
        # 求出斜率
        ds = [seg[i] - seg[i - 1] for i in range(1, len(seg))]
        # 斜率符号（忽略近零）
        signs = []
        for s in ds:
            if s > slope_eps: signs.append(1)
            elif s < -slope_eps: signs.append(-1)

        # 符号变化次数
        changes = 0
        for i in range(1, len(signs)):
            if signs[i] != signs[i - 1]:
                changes += 1



        # 是否三角特征：先正后负，且仅一次变化
        is_triangle_like = (len(signs) > 0 and signs[0] == 1 and signs[-1] == -1 and changes == 1)

        # 圆顶/平顶判定
        peak_idx = max(range(len(seg)), key=lambda i: seg[i]) if seg else 0
        peak_val = seg[peak_idx] if seg else 0.0

        near_peak_pts = sum(1 for v in seg if v >= peak_val - peak_flat_tol)

        # 顶点附近斜率近零统计（取峰附近的几段斜率索引）
        # 斜率索引与点索引的对应：ds[j] = seg[j+1]-seg[j]
        lo = max(0, peak_idx - 2)
        hi = min(len(ds) - 1, peak_idx)  # 包含 hi
        near_zero_slopes = sum(1 for j in range(lo, hi + 1) if abs(ds[j]) <= slope_eps)

        is_rounded = (near_peak_pts >= peak_flat_min_pts) or (near_zero_slopes >= 2)

        return {
            "len": len(seg),
            "seg": seg,
            "slopes": ds,
            "slope_signs": signs,
            "slope_changes": changes,
            "triangle_like": is_triangle_like,
            "peak_idx": peak_idx,
            "peak_val": peak_val,
            "near_peak_pts": near_peak_pts,
            "near_zero_slopes": near_zero_slopes,
            "rounded": is_rounded,
        }

    seg_reports: List[Dict[str, Any]] = []
    tri_like = 0
    rounded = 0

    for (s_idx, e_idx, seg) in pos_segments:
        rep = analyze_segment(seg)
        rep["start_idx"] = s_idx
        rep["end_idx"] = e_idx
        seg_reports.append(rep)
        if rep["triangle_like"]:
            tri_like += 1
        if rep["rounded"]:
            rounded += 1

    total = len(seg_reports)
    tri_like_ratio = tri_like / total
    non_rounded = total - rounded
    non_rounded_ratio = non_rounded / total

    # “不是圆顶的三角波”条件（你可以按需改这两条的逻辑）
    is_triangle = (tri_like_ratio >= majority) and (non_rounded_ratio >= majority)

    debug["segments"] = seg_reports
    debug["summary"] = {
        "total_pos_half_periods": total,
        "triangle_like_count": tri_like,
        "triangle_like_ratio": tri_like_ratio,
        "rounded_count": rounded,
        "non_rounded_ratio": non_rounded_ratio,
        "decision": is_triangle,
        "reason": "majority rule on triangle_like and non-rounded"
    }

    return is_triangle, debug


def print_debug_report(debug: Dict[str, Any], max_segments: int = 5) -> None:
    """
    友好打印 debug 信息（截断展示若干段）。
    """
    p = debug.get("params", {})
    print("=== Params ===")
    for k, v in p.items():
        print(f"{k}: {v}")

    print("\n=== Normalize ===")
    print(f"avg: {debug.get('avg')}, amp: {debug.get('amp')}")
    yn = debug.get("normalized", [])
    print(f"normalized length: {len(yn)}")

    print("\n=== Crossings ===")
    for c in debug.get("crossings", []):
        print(f"  i={c['i']}, kind={c['kind']}")

    print("\n=== Segments (show up to", max_segments, ") ===")
    segs = debug.get("segments", [])
    for idx, seg in enumerate(segs[:max_segments]):
        print(f"--- Segment #{idx}  [{seg['start_idx']}..{seg['end_idx']}] ---")
        print(f"len={seg['len']}, slope_changes={seg['slope_changes']}, "
              f"triangle_like={seg['triangle_like']}, rounded={seg['rounded']}")
        print(f"peak_idx={seg['peak_idx']}, peak_val={seg['peak_val']:.6f}, "
              f"near_peak_pts={seg['near_peak_pts']}, near_zero_slopes={seg['near_zero_slopes']}")
        # 如需更详细输出，可解注下面两行
        # print("seg:", seg['seg'])
        # print("slopes:", seg['slopes'])

    print("\n=== Summary ===")
    print(debug.get("summary", {}))

if __name__ == "__main__":
    from analyze.prepare import get_test_data, get_data
    # data = get_test_data("顶峰突降三角波")
    data = get_data("120y2")[1:1000]
    plt.show()
    ok, dbg = is_triangle_wave_debug(data, slope_eps=0.02,
    peak_flat_tol=0.03,
    peak_flat_min_pts=3,
    majority=0.6,
    min_seg_len=4)

    print_debug_report(dbg, max_segments=3)
    plt.plot(data[1:500])
    if ok:
        plt.title(f'是三角波')
    else:
        plt.title(f'不是三角波')
    plt.show()