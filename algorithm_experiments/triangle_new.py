import numpy as np
from scipy import optimize, signal
import matplotlib.pyplot as plt
import pickle


def find_peaks_lastpoint(y, height=None, threshold=None, distance=None):
    """
    查找峰值（包括平顶峰），返回峰区域的最后一个点位置。

    参数：
        y         : 输入数据（1D array）
        height    : 最小峰值高度
        threshold : 相邻点差异阈值（用于消除假峰）
        distance  : 两个峰最小间距

    返回：
        peaks_last : list[int]，每个峰的最后一个点索引
    """
    # 启用 plateau_size 识别平顶峰
    peaks, props = signal.find_peaks(
        y,
        height=height,
        threshold=threshold,
        distance=distance,
        plateau_size=True
    )

    # left_edges + plateau_sizes ⇒ 平顶最后一个点索引
    lefts = props.get('left_edges', peaks)  # fallback for非平顶
    widths = props.get('plateau_sizes', [1] * len(peaks))

    peaks_last = [left + width - 1 for left, width in zip(lefts, widths)]
    return peaks_last


def is_triangle_half_period(x: np.ndarray, y: np.ndarray,
                            rmse_thresh=0.03, slope_sym_thresh=0.05,
                            plot=True) -> bool:
    # --- 找峰（半周期中点）---
    peaks = find_peaks_lastpoint(y)
    if len(peaks) == 0:
        print("⚠️ 未找到峰值")
        return False
    peak = peaks[np.argmax(y[peaks])]
    # print(peak,peaks, x[peak])

    # --- 分段（上升段 + 下降段）---
    x_up, y_up = x[:peak + 1], y[:peak + 1]
    x_down, y_down = x[peak:], y[peak:]

    def linear(x, a, b):
        return a * x + b

    try:
        p_up, _ = optimize.curve_fit(linear, x_up, y_up)
        p_down, _ = optimize.curve_fit(linear, x_down, y_down)
    except:
        print("⚠️ 拟合失败")
        return False

    a_up, b_up = p_up
    a_down, b_down = p_down

    # --- RMSE ---
    rmse_up = np.sqrt(np.mean((y_up - linear(x_up, a_up, b_up)) ** 2)) / (np.max(y_up) - np.min(y_up))
    rmse_down = np.sqrt(np.mean((y_down - linear(x_down, a_down, b_down)) ** 2)) / (np.max(y_down) - np.min(y_down))

    # --- 斜率对称性 ---
    slope_sym_err = abs(1 - abs(a_up / a_down)) if a_down != 0 else np.inf
    sign_ok = np.sign(a_up) != np.sign(a_down)

    is_triangle_like = (
            rmse_up < rmse_thresh and
            rmse_down < rmse_thresh and
            slope_sym_err < slope_sym_thresh and
            sign_ok
    )

    print(f"上升斜率={a_up:.3f}, 下降斜率={a_down:.3f}")
    print(f"RMSE_up={rmse_up:.4f}, RMSE_down={rmse_down:.4f}")
    print(f"斜率对称误差={slope_sym_err:.3f}, 符号相反? {sign_ok}")
    print(f"判定：{'三角波' if is_triangle_like else '不是三角波'}")



    return is_triangle_like


def find_triangle_half_period(x: np.ndarray, y: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    提取第一个 “上升再下降” 的零点对之间的一上一下波形段（正半周期）
    """
    avg = np.mean(y)
    y_centered = y - avg

    crossings = np.where(np.diff(np.sign(y_centered)))[0]

    for i in range(len(crossings) - 1):
        i1, i2 = crossings[i], crossings[i + 1]

        # 判断是上升交叉 → 下降交叉
        if y_centered[i1] < 0 < y_centered[i1 + 1]:  # 上升穿越
            if y_centered[i2] > 0 > y_centered[i2 + 1]:  # 下降穿越
                # 提取这段
                x_seg = x[i1:i2 + 2]
                y_seg = y[i1:i2 + 2]
                return x_seg, y_seg

    return np.asarray([]), np.asarray([])

def is_triangle(x: np.ndarray, y: np.ndarray, noise: bool=False) -> bool:
    if noise:
        noise_amplitude = 0.02  # 可调节
        y = y + noise_amplitude * np.random.randn(len(y))
    x_half, y_half = find_triangle_half_period(x, y)
    if x_half.size < 1 or y_half.size < 1:
        return False
    return is_triangle_half_period(x_half, y_half, plot=False)


from analyze.prepare import  get_test_data
from analyze.prepare import get_data

if __name__ == '__main__':
    data = get_data('60x1')
    #data = get_test_data('圆顶三角波.csv')
    x = np.linspace(0, len(data),len(data), endpoint=False)
    y = np.array(data)

    # 添加轻微高斯白噪声
    # noise_amplitude = 0.02  # 可调节
    # y = y + noise_amplitude * np.random.randn(len(y))

    # 提取一个“上升+下降”半周期段
    x_half, y_half = find_triangle_half_period(x, y)
    if x_half.size < 1 or y_half.size < 1:
        print("无法找到先上升在下降段")
        exit()
    # 可视化完整波形 + 提取段
    plt.figure(figsize=(10, 4))
    plt.plot(x, y, label='Full Signal', alpha=0.3)
    plt.plot(x_half, y_half, color='red', label='Extracted Half Period', linewidth=2)
    plt.xlabel("Time (s)")
    plt.ylabel("Amplitude")
    plt.title("Extracted Triangle Half Period from Modulated Signal")
    plt.grid(True)
    plt.legend()
    plt.tight_layout()
    plt.show()

    # 判断是否为三角波
    is_triangle_half_period(x_half, y_half)
