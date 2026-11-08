from analyze.prepare import get_data, get_test_data
from typing import List, Tuple, Dict
import math

def find_peaks_lastpoint_basic(y: List[float]) -> List[int]:
    """
    简版平顶峰检测：返回每个峰“平顶的最后一个点”索引。
    规则：上升(>=)→平顶(==max plateau)→下降(>)，平顶末尾记为峰位置。
    """
    n = len(y)
    if n < 3:
        return []
    peaks = []
    i = 1
    while i < n - 1:
        # 上升沿
        if y[i] >= y[i - 1] and y[i] >= y[i + 1]:
            # 可能是尖峰或平顶
            if y[i] > y[i - 1] and y[i] > y[i + 1]:
                peaks.append(i)
                i += 1
                continue
            # 平顶：向右走到平顶末尾
            if y[i] >= y[i - 1] and y[i] == y[i + 1]:
                j = i + 1
                while j + 1 < n and y[j] == y[j + 1]:
                    j += 1
                # 平顶右侧必须下降才算峰
                if j + 1 < n and y[j] > y[j + 1]:
                    peaks.append(j)  # 平顶最后一个点
                i = j + 1
                continue
        i += 1
    return peaks

def linear_fit_ab(x: List[float], y: List[float]) -> Tuple[bool, float, float]:
    """最小二乘拟合 y = a*x + b，返回 (ok, a, b)。"""
    n = len(x)
    if n < 2:
        return False, 0.0, 0.0
    sx = sum(x); sy = sum(y)
    sxx = sum(xi*xi for xi in x)
    sxy = sum(xi*yi for xi, yi in zip(x, y))
    denom = n * sxx - sx * sx
    if abs(denom) < 1e-18:
        # x 退化
        return False, 0.0, 0.0
    a = (n * sxy - sx * sy) / denom
    b = (sy - a * sx) / n
    return True, a, b

def normalized_rmse(x: List[float], y: List[float], a: float, b: float) -> float:
    """与 C++ 吻合的归一化 RMSE：RMSE / (max(y)-min(y)+EPS)。"""
    n = len(x)
    if n == 0:
        return float('nan')
    rss = 0.0
    for xi, yi in zip(x, y):
        yhat = a * xi + b
        rss += (yi - yhat) ** 2
    rmse = math.sqrt(rss / n)
    amp = max(y) - min(y)
    return rmse / (amp + 1e-12)

def metrics_cpp_style_for_half(x_seg: List[float], y_seg: List[float]) -> Dict[str, float]:
    """
    按你的 C++ isTriangle 的口径，给单个“上升→峰→下降”的半周期计算：
      rmse_up, rmse_down, slope_sym_err, sign_ok(1/0)
    """
    m = len(y_seg)
    if m < 5:
        return {}

    # 找峰：用平顶最后一点。若 find_peaks 为空，就退化为 max 值最后出现的位置。
    peaks = find_peaks_lastpoint_basic(y_seg)
    if not peaks:
        ymax = max(y_seg)
        peak = max(i for i, v in enumerate(y_seg) if v == ymax)
    else:
        # C++ 里：从 peaks 中选 y 值最高的那个；若并列，高度相等时我们的 peaks 已是“各自平顶尾点”
        peak = max(peaks, key=lambda idx: y_seg[idx])

    if peak == 0 or peak >= m - 1:
        return {}

    # 构造上升段与下降段的 x（用索引、与 C++ 一致）
    x_up   = [float(i) for i in range(0, peak + 1)]
    y_up   = y_seg[0:peak + 1]
    x_down = [float(i) for i in range(peak, m)]
    y_down = y_seg[peak:m]

    if len(x_up) < 4 or len(x_down) < 4:
        return {}

    ok1, a_up,   b_up   = linear_fit_ab(x_up,   y_up)
    ok2, a_down, b_down = linear_fit_ab(x_down, y_down)
    if not (ok1 and ok2):
        return {}

    rmse_up   = normalized_rmse(x_up,   y_up,   a_up,   b_up)
    rmse_down = normalized_rmse(x_down, y_down, a_down, b_down)

    EPS = 1e-12
    if abs(a_up) < EPS or abs(a_down) < EPS:
        return {}

    slope_sym_err = abs(1.0 - abs(a_up / a_down))
    sign_ok = 1.0 if ((a_up > 0.0) != (a_down > 0.0)) else 0.0

    return {
        "rmse_up": rmse_up,
        "rmse_down": rmse_down,
        "slope_sym_err": slope_sym_err,
        "sign_ok": sign_ok,
    }

def summarize_metrics(items: List[Dict[str, float]]) -> Dict[str, Dict[str, float]]:
    """对 rmse_up / rmse_down / slope_sym_err 计算 min/max/mean，同时给出 sign_ok 的通过率。"""
    def stats(key: str):
        vals = [d[key] for d in items if key in d and not math.isnan(d[key])]
        if not vals:
            return {"min": float('nan'), "max": float('nan'), "mean": float('nan')}
        return {"min": min(vals), "max": max(vals), "mean": sum(vals)/len(vals)}

    out = {
        "rmse_up": stats("rmse_up"),
        "rmse_down": stats("rmse_down"),
        "slope_sym_err": stats("slope_sym_err"),
    }
    if items:
        ok = sum(d.get("sign_ok", 0.0) for d in items)
        out["sign_ok_rate"] = {"min": 0.0, "max": 1.0, "mean": ok / len(items)}
    else:
        out["sign_ok_rate"] = {"min": float('nan'), "max": float('nan'), "mean": float('nan')}
    return out



def find_triangle_half_periods(x: List[float], y: List[float]) -> List[Tuple[List[float], List[float]]]:
    """
    提取所有“上升再下降”的零点对之间的正半周期波形段。

    参数:
        x : 时间轴或样本索引轴
        y : 信号值

    返回:
        segments : [(x_seg, y_seg), ...]，每个元素是一段波形，若未找到则为空列表
    """
    if len(x) != len(y) or len(x) < 4:
        return []

    avg = sum(y) / len(y)
    y_centered = [v - avg for v in y]

    # 找所有过零点
    crossings = []
    for i in range(len(y_centered) - 1):
        if y_centered[i] * y_centered[i + 1] < 0:
            crossings.append(i)

    segments: List[Tuple[List[float], List[float]]] = []

    # 遍历相邻过零点
    for i in range(len(crossings) - 1):
        i1 = crossings[i]
        i2 = crossings[i + 1]

        # 判断模式：上升穿越后，再下降穿越
        if y_centered[i1] < 0 <= y_centered[i1 + 1]:
            if y_centered[i2] > 0 >= y_centered[i2 + 1]:
                x_seg = x[i1:i2 + 2]
                y_seg = y[i1:i2 + 2]
                segments.append((x_seg, y_seg))

    return segments




if __name__ == "__main__":
    dataset_len = '60'
    data_series = ['x1', 'x2', 'y1', 'y2']

    for name in data_series:
        data = get_data(dataset_len + name)[1:1000]
        from matplotlib import pyplot as plt
        plt.plot(data)
        plt.show()
        # data = get_test_data('圆顶三角波')
        x = list(range(len(data)))
        halfs: List[Tuple[List[float], List[float]]] = find_triangle_half_periods(x, data)

        per_half = []
        for _x, y_seg in halfs:
            # 与 C++ 一致：拟合时 x 用索引，不用真实时间轴
            m = metrics_cpp_style_for_half(list(range(len(y_seg))), y_seg)
            if m:
                per_half.append(m)

        summary = summarize_metrics(per_half)
        from matplotlib import pyplot as plt
        print(f"=== {name} ===")
        print("count:", len(per_half))
        print("rmse_up      :", summary["rmse_up"])
        print("rmse_down    :", summary["rmse_down"])
        print("slope_sym_err:", summary["slope_sym_err"])
        print("sign_ok_rate :", summary["sign_ok_rate"]["mean"])
        if per_half:
            idxs = list(range(len(per_half)))
            rmse_up_vals = [d["rmse_up"] for d in per_half]
            rmse_down_vals = [d["rmse_down"] for d in per_half]
            slope_err_vals = [d["slope_sym_err"] for d in per_half]

            plt.figure(figsize=(10, 5))
            plt.plot(idxs, rmse_up_vals, label="rmse_up", marker="o")
            plt.plot(idxs, rmse_down_vals, label="rmse_down", marker="s")
            # plt.plot(idxs, slope_err_vals, label="slope_sym_err", marker="^")

            plt.title(f"Metrics for {name}")
            plt.xlabel("Half-period index")
            plt.ylabel("Value")
            # plt.ylim(0,1)
            plt.legend()
            plt.grid(True)
            plt.tight_layout()
            plt.show()
