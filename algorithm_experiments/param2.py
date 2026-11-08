import numpy as np
import math

def linear_fit_ab(x, y):
    n = len(x)
    if n < 2 or n != len(y):
        return False, 0.0, 0.0
    sx = sum(x); sy = sum(y)
    sxx = sum(xi*xi for xi in x)
    sxy = sum(xi*yi for xi, yi in zip(x, y))
    denom = n * sxx - sx * sx
    if abs(denom) < 1e-18:
        return False, 0.0, 0.0
    a = (n * sxy - sx * sy) / denom
    b = (sy - a * sx) / n
    return True, a, b

def normalized_rmse(x, y, a, b):
    rng = max(y) - min(y)
    if rng <= 0:
        return float("inf")
    rss = sum((yi - (a*xi+b))**2 for xi, yi in zip(x, y))
    rmse = math.sqrt(rss / len(y))
    return rmse / rng

def metrics_for_half(y_seg):
    """仿照 C++：用索引作 x，分成上升段/下降段拟合"""
    m = len(y_seg)
    if m < 5:
        return {}
    peak = int(np.argmax(y_seg))  # 用最高点作为峰
    if peak == 0 or peak >= m-1:
        return {}
    x_up = list(range(0, peak+1))
    y_up = y_seg[:peak+1]
    x_dn = list(range(peak, m))
    y_dn = y_seg[peak:]
    if len(x_up) < 4 or len(x_dn) < 4:
        return {}
    ok1, a_up, b_up = linear_fit_ab(x_up, y_up)
    ok2, a_dn, b_dn = linear_fit_ab(x_dn, y_dn)
    if not (ok1 and ok2):
        return {}
    rmse_up = normalized_rmse(x_up, y_up, a_up, b_up)
    rmse_dn = normalized_rmse(x_dn, y_dn, a_dn, b_dn)
    slope_sym_err = abs(1 - abs(a_up / a_dn))
    sign_ok = (a_up > 0) != (a_dn > 0)
    return {
        "rmse_max": max(rmse_up, rmse_dn),
        "slope_sym_err": slope_sym_err,
        "sign_ok": sign_ok
    }

def auto_threshold(y, quantile=0.85,
                   rmse_clip=(0.01,0.15),
                   slope_clip=(0.03,0.20)):
    """
    输入原始波形 y（list/ndarray），输出推荐阈值
    """
    # 这里假设 y 已经是一个半周期（比如你用 findHalfPeriod 切好的数据）
    m = metrics_for_half(list(map(float,y)))
    if not m:
        return {"rmse_thresh":0.06, "slope_sym_thresh":0.08}
    rmse_thresh = float(np.clip(m["rmse_max"], *rmse_clip))
    slope_sym_thresh = float(np.clip(m["slope_sym_err"], *slope_clip))
    return {"rmse_thresh": rmse_thresh,
            "slope_sym_thresh": slope_sym_thresh}


# ---------------- 示例 ----------------
if __name__ == "__main__":
    from analyze.prepare import get_data
    y = get_data('60x1')
    cfg = auto_threshold(y)
    print(cfg)
