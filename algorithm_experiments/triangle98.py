from typing import List, Tuple
import matplotlib
from matplotlib import pyplot as plt
from analyze.prepare import get_test_data, get_data
import numpy as np

matplotlib.rcParams['font.family'] = ['Times New Roman', 'SimSun']


def find_zeros(y: List[float]) -> List[int]:
    """
    寻找零点，适用于 list 输入。
    详细方法：先求平均值作为零基线，再在相邻点之间检测近似过零。

    返回：
        List[int] —— 近似零点所在的离散索引（四舍五入到最近样本）。
        规则：
          - 以 avg = mean(y) 为“零”；
          - 相邻样本 (i, i+1) 在 y-avg 上异号 => 线性插值估计过零位置并取最近索引；
          - 若出现一段连续样本接近 avg（零平台），只记该平台的最后一个索引。
    """
    n = len(y)
    if n == 0:
        return []

    avg = sum(y) / n
    EPS = 1e-12  # 近似“等于零”的阈值
    zeros: List[int] = []

    i = 0
    while i < n - 1:
        a = y[i] - avg
        b = y[i + 1] - avg

        # 处理“零平台”：y[i]≈avg 且连续若干点≈avg，则只记录平台末尾
        if abs(a) <= EPS:
            j = i
            while j + 1 < n and abs(y[j + 1] - avg) <= EPS:
                j += 1
            if not zeros or zeros[-1] != j:
                zeros.append(j)
            i = j + 1
            continue

        # 处理相邻异号：线性插值得到连续过零位置 pos = i + t
        # a + t*(b - a) = 0  =>  t = -a / (b - a)
        if a * b < 0:
            denom = (b - a)
            t = -a / denom if abs(denom) > EPS else 0.0
            pos = i + t
            idx = int(round(pos))
            # 去重（避免与随后平台或边界重复）
            if idx < 0:
                idx = 0
            elif idx > n - 1:
                idx = n - 1
            if not zeros or zeros[-1] != idx:
                zeros.append(idx)

        i += 1

    # 尾点单独等于均值但未被捕获（如最后一个点恰为零）
    if n >= 1 and abs(y[-1] - avg) <= EPS:
        if not zeros or zeros[-1] != n - 1:
            zeros.append(n - 1)

    return zeros


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


def get_slopes(y: list):
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
    slopes_ratio = []
    for i in range(1, len(slopes)):
        if slopes[i - 1] == 0:
            slopes_ratio.append(1)
        else:
            slopes_ratio.append((slopes[i] / slopes[i - 1]) - 1)
    return slopes, slopes_ratio


def find_peek(slopes: list[float]) -> int:
    peek_index = 0
    step = 0
    for i in range(1, len(slopes)):
        match step:
            case 0:
                if slopes[i] >= 0:
                    step = 1
                    up = 1
            case 1:
                if slopes[i] < 0:
                    return i - 1
    return 0


def normalize(data):
    """
    将输入数据线性映射到 [-1, 1] 区间
    参数:
        data: list 或 numpy 数组
    返回:
        list，归一化后的数据
    """
    if not data:
        return []

    min_val = min(data)
    max_val = max(data)
    if max_val == min_val:
        # 全部数据相等 ⇒ 映射为 0
        return [0.0] * len(data)

    return [2 * (v - min_val) / (max_val - min_val) - 1 for v in data]


def is_round_triangle(y: list[float]) -> bool:
    pass

def find_triangle_half_periods():
    pass


def plot():
    pass


if __name__ == '__main__':
    data = get_data('60x1')[1:100]
    data = normalize(data)
    zeros = find_zeros(data)
