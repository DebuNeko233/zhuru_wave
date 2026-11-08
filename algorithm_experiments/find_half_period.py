import matplotlib
import matplotlib.pyplot as plt
from pandas import DataFrame

from analyze.prepare import get_test_data

matplotlib.rcParams['font.family'] = ['Times New Roman', 'SimSun']

from typing import List, Tuple
import numpy as np


def find_triangle_one_period(x: List[float], y: List[float]) -> Tuple[List[float], List[float]]:
    """
    提取一个完整周期（上升穿越到下一次上升穿越之间）的波形段。
    输入为 Python list，输出也为 list。
    """
    x = np.asarray(x)
    y = np.asarray(y)

    avg = np.mean(y)
    y_centered = y - avg

    # 查找零交叉点
    crossings = np.where(np.diff(np.sign(y_centered)))[0]

    # 找两个连续的“上升穿越”点，作为一个周期
    rise_indices = []
    for i in range(len(crossings)):
        idx = crossings[i]
        if y_centered[idx] < 0 < y_centered[idx + 1]:
            rise_indices.append(idx)
        if len(rise_indices) >= 2:
            break

    if len(rise_indices) < 2:
        return [], []

    i_start = rise_indices[0]
    i_end = rise_indices[1] + 1  # 包括下一个穿越点的后一个点

    x_seg = x[i_start:i_end + 1].tolist()
    y_seg = y[i_start:i_end + 1].tolist()
    return x_seg, y_seg


def find_triangle_half_period_list(x: List[float], y: List[float]) -> Tuple[List[float], List[float]]:
    """
    输入为 Python list，输出也为 list。
    提取第一个 “上升再下降” 的零点对之间的一上一下波形段（正半周期）
    """
    x = np.asarray(x)
    y = np.asarray(y)

    avg = np.mean(y)
    y_centered = y - avg

    crossings = np.where(np.diff(np.sign(y_centered)))[0]

    for i in range(len(crossings) - 1):
        i1, i2 = crossings[i], crossings[i + 1]

        if y_centered[i1] < 0 < y_centered[i1 + 1]:  # 上升穿越
            if y_centered[i2] > 0 > y_centered[i2 + 1]:  # 下降穿越
                x_seg = x[i1:i2 + 2].tolist()
                y_seg = y[i1:i2 + 2].tolist()
                return x_seg, y_seg

    return [], []


def find_triangle_half_period(x: List[float], y: List[float]) -> Tuple[List[float], List[float]]:
    """
    提取第一个“上升再下降”的零点对之间的一上一下波形段（正半周期），适用于 list 输入。

    参数:
        x : 时间轴或样本索引轴
        y : 信号值

    返回:
        x_seg, y_seg : 提取的波形段，若未找到则为空列表
    """
    if len(x) != len(y) or len(x) < 4:
        return [], []

    avg = sum(y) / len(y)
    y_centered = [v - avg for v in y]

    crossings = []
    for i in range(len(y_centered) - 1):
        if y_centered[i] * y_centered[i + 1] < 0:
            crossings.append(i)

    for i in range(len(crossings) - 1):
        i1 = crossings[i]
        i2 = crossings[i + 1]

        # 判断上升穿越后再下降穿越
        if y_centered[i1] < 0 <= y_centered[i1 + 1]:
            if y_centered[i2] > 0 >= y_centered[i2 + 1]:
                x_seg = x[i1:i2 + 2]
                y_seg = y[i1:i2 + 2]
                return x_seg, y_seg

    return [], []


def plot_three_lists(x: list[float], y1: list[float], y2: list[float], y3: list[float],
                     labels: list[str] = ["y1", "y2", "y3"],
                     title: str = ""):
    """
    在一个图中绘制三组 y 数据，使用同一个 x 轴
    """
    if not (len(x) == len(y1) == len(y2) == len(y3)):
        raise ValueError("x, y1, y2, y3 必须长度一致")

    plt.figure(figsize=(10, 5))
    plt.plot(x, y1, '-o', label=labels[0], color='blue')
    plt.plot(x, y2, '-o', label=labels[1], color='green')
    plt.plot(x, y3, '-o', label=labels[2], color='red')
    # plt.ylim(-1.5, 1.5)
    plt.title(title)
    plt.xlabel("x")
    plt.ylabel("y")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    plt.show()


def normalize(data):
    min_val = min(data)
    max_val = max(data)
    if max_val == min_val:
        # 全部数据相等 ⇒ 映射为 0
        return [0.0] * len(data)

    return [2 * (v - min_val) / (max_val - min_val) - 1 for v in data]


def calculate(y: list):
    x = list(range(0, len(y)))
    y = normalize(y)
    slopes = []
    for i in range(len(x) - 1):
        dx = x[i + 1] - x[i]
        dy = y[i + 1] - y[i]
        if dx == 0:
            slopes.append(float('inf'))  # 避免除以零
        else:
            slopes.append(dy / dx)
    slopes_divide = []
    for i in range(1, len(slopes)):
        if slopes[i - 1] == 0:
            slopes_divide.append(1)
        else:
            slopes_divide.append((slopes[i] / slopes[i - 1]) - 1)
    return slopes, slopes_divide


def detect_jump_valleys(y: List[float], threshold: float = 0.9, window: int = 3) -> List[int]:
    """
    检测波形中的突变位置，并返回每个突变段中的最低点索引。

    :param y: 输入信号
    :param threshold: 二阶差分突变阈值（越大越严格）
    :param window: 每次突变向前后扩展多少个点进行最小值搜索
    :return: 每个突变段中最小值的索引列表
    """
    y = np.asarray(y)
    ddy = np.abs(np.diff(y, n=2))
    jump_indices = np.where(ddy > threshold)[0] + 1  # +1 修正索引偏移

    valleys = []
    for idx in jump_indices:
        start = max(0, idx - window)
        end = min(len(y), idx + window + 1)
        local_min_idx = start + np.argmin(y[start:end])
        valleys.append(local_min_idx)
    return sorted(set(valleys))  # 去重 + 排序（防止重叠突变重复）



if __name__ == '__main__':
    from triangle_new import is_triangle
    from analyze.prepare import get_data

    # data = get_test_data('标准三角波.csv')
    # data = get_test_data('削波三角波.csv')
    # data = get_test_data('圆顶三角波.csv')
    # data = get_test_data('毛刺三角波.csv')
    # data = get_test_data('顶峰突降三角波.csv')
    # data = get_test_data('零点台阶三角波.csv')
    data = get_data('80x1')[100:500]
    data = normalize(data)
    y = data
    x = list(range(0, len(y)))
    print(y)
    x_half, y_half = find_triangle_half_period(x, y)
    if not x_half:
        print("❌ 无法提取半周期")
        exit()

    # 可视化半周期波形
    plt.figure(figsize=(10, 3))
    plt.plot(x, y, alpha=0.3, label='原始波形')
    plt.plot(x_half, y_half, color='red', label='半周期段')
    plt.title("提取的上升再下降半周期段")
    plt.legend()
    plt.grid(True)
    plt.tight_layout()
    # plt.show()

    s1, s2 = calculate(y_half)
    print(s1, s2, sep='\n')

    max_len = max([len(y_half), len(s1), len(s2)])

    y_half = [0] * (max_len - len(y_half)) + y_half
    s1 = [s1[0]] * (max_len - len(s1)) + s1
    s2 = [s2[0]] * (max_len - len(s2)) + s2

    # DataFrame({'original': y_half, 'slope': s1, 'slope_divided': s2}).to_csv('1.csv', index=False)
    plot_three_lists(x_half, y_half, s1, s2, ['原始数据', '斜率', '斜率之比'])

    # 提取两段平均斜率
    up_index = 0
    for i in range(0, len(s1)):
        if s1[i] <= 0:
            up_index = i
            break
    up_mean = sum(s1[:up_index]) / len(s1[:up_index])
    down_mean = sum(s1[up_index:]) / len(s1[up_index:])
    print(f"上升段平均斜率:{up_mean}, 下降段平均斜率:{down_mean}, 斜率对称性:{abs(abs(up_mean) / abs(down_mean)-1)}")
    print(f"方差:{np.var(s1[:up_index])}, {np.var(s1[up_index:])}")

    if is_triangle(np.asarray(x), np.asarray(y), noise=True):
        print('true')
    else:
        print('false')

    result = detect_jump_valleys(s2, threshold=1)
    result = [int(i) for i in result]
    print(f'突变点有{len(result)}个', result)