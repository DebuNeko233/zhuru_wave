from math import log
import os.path
from time import localtime, strftime

# import cv2
import numpy as np
from dotenv import load_dotenv
from flask import Flask, request, jsonify
# from matplotlib.backends.backend_agg import FigureCanvasAgg
from waitress import serve
from matplotlib.figure import Figure
from matplotlib import rcParams, use
# 顶部：全局进程池（结合你的机器核心数调优）
from concurrent.futures import ProcessPoolExecutor, as_completed
import os
# import pickle
# from tempfile import gettempdir
from multiprocessing import freeze_support

use("Agg")
rcParams["font.family"] = ["Times New Roman", "SimSun"]
rcParams['path.simplify'] = True
rcParams['path.simplify_threshold'] = 1.0
# Agg 在超长路径上启用分块，可减少单次绘制的开销：
rcParams['agg.path.chunksize'] = 10000
EXECUTOR = ProcessPoolExecutor(max_workers=os.cpu_count())

app = Flask(__name__)


# step = 2 # 相邻几个点求斜率
# step2 = 2 # 相邻几个点求斜率差
# step3 = 2  # 区间的跨度
# t_step = 2  # 周期的step

def _noop(x):  # 简单任务
    return x


# 预热进程池，避免首次任务提交延迟
def _executor_warmup():
    futures = [EXECUTOR.submit(_noop, i) for i in range(os.cpu_count())]
    for f in futures:
        f.result()


# 归一化至[-1, 1]
def normalize(_data: list[float]) -> list[float]:
    min_val = min(_data)
    max_val = max(_data)
    if max_val == min_val:
        # 全部数据相等 ⇒ 映射为 0
        return [0.0] * len(_data)

    return [2 * (v - min_val) / (max_val - min_val) - 1 for v in _data]


# 归一化至[0, 1]
def normalize01(_data: list[float]) -> list[float]:
    min_val = min(_data)
    max_val = max(_data)
    if max_val == min_val:
        # 全部数据相等 ⇒ 映射为 0
        return [0.0] * len(_data)

    return [(v - min_val) / (max_val - min_val) for v in _data]


def moving_average(_data: list[float], window: int) -> list[float]:
    if window <= 1 or len(_data) <= 2:
        return [float(v) for v in _data]
    if window % 2 == 0:
        window += 1
    if len(_data) < window:
        return [float(v) for v in _data]

    arr = np.asarray(_data, dtype=float)
    pad = window // 2
    padded = np.pad(arr, (pad, pad), mode="edge")
    kernel = np.ones(window, dtype=float) / float(window)
    return np.convolve(padded, kernel, mode="valid").tolist()


def robust_threshold(_arr: np.ndarray, base_epsilon: float, adaptive_k: float) -> float:
    abs_arr = np.abs(_arr)
    median_val = float(np.median(abs_arr))
    mad_val = float(np.median(np.abs(abs_arr - median_val)))
    sigma = 1.4826 * mad_val
    adaptive_eps = adaptive_k * sigma
    return max(float(base_epsilon), adaptive_eps)


def merge_peak_points(_arr: np.ndarray, candidates: list[int], min_gap: int) -> list[int]:
    if not candidates:
        return []
    min_gap = max(1, int(min_gap))
    merged: list[int] = []
    cluster: list[int] = [candidates[0]]

    for idx in candidates[1:]:
        if idx - cluster[-1] <= min_gap:
            cluster.append(idx)
            continue
        peak_idx = max(cluster, key=lambda i: abs(_arr[i]))
        merged.append(int(peak_idx))
        cluster = [idx]

    peak_idx = max(cluster, key=lambda i: abs(_arr[i]))
    merged.append(int(peak_idx))
    return merged


def is_square_like(_period_data: list[float]) -> bool:
    if len(_period_data) < 12:
        return False
    arr = np.asarray(_period_data, dtype=float)
    diff = np.diff(arr)
    if len(diff) < 4:
        return False
    abs_diff = np.abs(diff)
    p50 = float(np.percentile(abs_diff, 50)) + 1e-9
    p90 = float(np.percentile(abs_diff, 90))
    p95 = float(np.percentile(abs_diff, 95))
    flat_threshold = 0.2 * p90
    flat_ratio = float(np.mean(abs_diff <= flat_threshold))
    sharp_ratio = float(np.mean(abs_diff >= 0.8 * p95))
    # 方波特征：绝大多数点平坦，且少量点变化很陡。
    return (p95 / p50 >= 6.0) and (flat_ratio >= 0.55) and (sharp_ratio <= 0.25)


def is_triangle_like(_period_data: list[float]) -> bool:
    if len(_period_data) < 12:
        return False
    arr = np.asarray(_period_data, dtype=float)
    diff = np.diff(arr)
    if len(diff) < 4:
        return False

    abs_diff = np.abs(diff)
    p50 = float(np.percentile(abs_diff, 50)) + 1e-9
    p90 = float(np.percentile(abs_diff, 90))
    flat_ratio = float(np.mean(abs_diff <= 0.2 * p90))

    # 三角波要求“多数点有稳定斜率”，而不是像方波那样大段平坦。
    if flat_ratio > 0.45:
        return False

    # 忽略小斜率抖动后统计斜率符号变化次数。
    slope_thr = max(p50 * 0.6, 1e-9)
    signs = np.sign(diff)
    signs[abs_diff <= slope_thr] = 0
    nz_signs = signs[signs != 0]
    if len(nz_signs) < 4:
        return False
    sign_changes = int(np.sum(nz_signs[1:] * nz_signs[:-1] < 0))

    return 1 <= sign_changes <= 4


def detect_square_edges(
        _period_data: list[float],
        _x: list[float],
        base_epsilon: float,
        edge_min_gap: int,
        adaptive_k: float,
) -> tuple[list[float], dict[int, float]]:
    arr = np.asarray(_period_data, dtype=float)
    diff = np.diff(arr) if len(arr) >= 2 else np.asarray([], dtype=float)
    if len(diff) == 0:
        return [0.0] * len(_period_data), {}

    # 方波看一阶差分，边沿幅度大；阈值使用基础阈值和鲁棒阈值的较大值。
    robust_eps = robust_threshold(diff, base_epsilon * 0.1, max(0.3, adaptive_k * 0.6))
    epsilon = max(base_epsilon * 0.2, robust_eps)
    candidates = np.where(np.abs(diff) > epsilon)[0].tolist()
    merged = merge_peak_points(diff, candidates, max(1, edge_min_gap // 2))

    # 差分点是 (i, i+1) 的边沿，映射到 i+1 侧更接近突变后的平台。
    total_result: dict[int, float] = {}
    for i in merged:
        idx = min(i + 1, len(_x) - 1)
        total_result[_x[idx]] = float(diff[i])

    # 对齐长度用于画图
    diff_profile = diff.tolist() + [0.0]
    return diff_profile, total_result


# 计算斜率、斜率差
def calculate(_y: list, _step1: int, _step2: int) -> tuple[list[float], list[float]]:
    n = len(_y)
    if n < _step1 + 1:
        return [], []

    slopes = []
    # 计算斜率
    for _i in range(0, n - _step1, 1):
        dx = _step1
        dy = _y[_i + _step1] - _y[_i]
        tmp = dy / dx if dx != 0 else float("inf")
        # if abs(tmp) < 0.001:
        #     tmp = 0
        # 每个 step 区间内都填充相同的斜率
        slopes.append(tmp)

    slopes_minus = []
    # 计算相邻斜率差
    for _i in range(0, len(slopes) - _step2):
        diff = slopes[_i + _step2] - slopes[_i]
        if abs(diff) <= 0.001:
            diff = 0
        slopes_minus.append(diff)

    return slopes, slopes_minus


# log方案
def func_log(_s2: list[float], _epsilon: float) -> tuple[dict[int, float], list[float]]:
    s2_h = []
    _s2 = [abs(i) for i in _s2]

    for i in normalize01(_s2):
        if i == 0:
            i = 0.000001
        elif i == 1:
            i = 0.999999
        tmp = 1.0 / log(i) * 2000
        if abs(tmp) > 20000:
            tmp = abs(tmp) / tmp * 20000
        s2_h.append(tmp)

    _result = {}
    last_key = None

    for i, v in enumerate(s2_h):
        if abs(v) > _epsilon:
            if last_key is None or i - last_key >= 2:
                _result[i] = v
                last_key = i
    return _result, s2_h


def func_robust(
        _s2: list[float],
        _epsilon: float,
        min_gap: int,
        adaptive_k: float,
) -> tuple[dict[int, float], list[float]]:
    if not _s2:
        return {}, []
    s2_arr = np.asarray(_s2, dtype=float)
    epsilon = robust_threshold(s2_arr, _epsilon, adaptive_k)
    candidates = np.where(np.abs(s2_arr) > epsilon)[0].tolist()
    merged_points = merge_peak_points(s2_arr, candidates, min_gap)
    result = {idx: float(s2_arr[idx]) for idx in merged_points}
    return result, s2_arr.tolist()


#
def panjue(
        _x: list[float],
        period_data: list[float],
        epsilon3: float,
        _step1: int,
        _step2: int,
        smooth_window: int,
        edge_min_gap: int,
        adaptive_k: float,
) -> tuple[list[float], dict[int, float]]:
    period_data_smoothed = moving_average(period_data, smooth_window)
    if is_square_like(period_data_smoothed):
        return detect_square_edges(period_data_smoothed, _x, epsilon3, edge_min_gap, adaptive_k)

    s1, s2 = calculate(period_data_smoothed, _step1, _step2)

    max_len = max([len(period_data), len(s1), len(s2)])

    # period_data = [0.0] * (max_len - len(period_data)) + period_data
    # s1 = s1 + [0.0] * (max_len - len(s1))
    s2 = [0.0] * _step2 + s2 + [0.0] * (max_len - len(s2) - _step2)

    # 突变判断
    _result, s2_new = func_robust(s2, epsilon3, edge_min_gap, adaptive_k)

    # 纠正突变点的x坐标
    total_result = {}
    delay = (_step1 + _step2) // 2
    for _i in _result.keys():
        idx = min(max(0, _i - delay), len(_x) - 1)
        total_result[_x[idx]] = _result[_i]

    return s2_new, total_result


def evaluate_param_quality(
        _y: list[float],
        _period_step: int,
        _step1: int,
        _step2: int,
        smooth_window: int,
        edge_min_gap: int,
        adaptive_k: float,
        epsilon3: float,
) -> tuple[float, float, int]:
    period_y_lst, zero_x_lst = split_single_period(_y, _period_step)
    if not period_y_lst:
        return 0.0, 999.0, 0

    points_per_period: list[int] = []
    for i, period_data in enumerate(period_y_lst):
        period_x = list(range(zero_x_lst[i], zero_x_lst[i] + len(period_data)))
        _, tubiandian = panjue(
            period_x,
            period_data,
            epsilon3,
            _step1,
            _step2,
            smooth_window,
            edge_min_gap,
            adaptive_k
        )
        points_per_period.append(len(tubiandian))

    good = sum(1 for n in points_per_period if 1 <= n <= 2)
    good_ratio = good / len(points_per_period)
    avg_points = float(np.mean(points_per_period))
    return good_ratio, avg_points, len(points_per_period)


def auto_generate_params(
        _data: list[float],
        _period_step: int,
        _step1: int,
        _step2: int,
        sample_size: int,
) -> tuple[float, int, int, float]:
    y = _data[:sample_size]
    if len(y) < 1000:
        return 0.2, 9, 32, 1.0

    period_y_lst, _ = split_single_period(y, _period_step)
    if period_y_lst:
        period_lengths = [len(i) for i in period_y_lst]
        period_len_median = int(np.median(period_lengths))
    else:
        period_len_median = 80

    # 窗口/间隔根据周期长度约束，避免跨越过多边沿。
    base_smooth = max(5, min(15, period_len_median // 8))
    if base_smooth % 2 == 0:
        base_smooth += 1
    smooth_candidates = sorted({5, 7, 9, 11, base_smooth})

    base_gap = max(8, min(48, period_len_median // 3))
    gap_candidates = sorted({
        max(4, base_gap - 8),
        base_gap,
        min(64, base_gap + 8),
    })
    k_candidates = [0.5, 0.8, 1.0, 1.5, 2.0, 4.0]
    epsilon_candidates = [0.1, 0.2, 0.5]

    best_score = -1e9
    best_params = (0.2, 9, 32, 1.0)

    for epsilon in epsilon_candidates:
        for smooth_window in smooth_candidates:
            for edge_min_gap in gap_candidates:
                for adaptive_k in k_candidates:
                    good_ratio, avg_points, period_num = evaluate_param_quality(
                        y,
                        _period_step,
                        _step1,
                        _step2,
                        smooth_window,
                        edge_min_gap,
                        adaptive_k,
                        epsilon
                    )
                    if period_num == 0:
                        continue
                    # 主目标: 周期内突变点数量落在 1~2；次目标: 均值靠近 1.2。
                    score = good_ratio - 0.08 * abs(avg_points - 1.2)
                    if score > best_score:
                        best_score = score
                        best_params = (epsilon, smooth_window, edge_min_gap, adaptive_k)

    return best_params


# 分离出单个周期的数据，并保存在一个列表中
# 参数:
# _y      波形数据
# _t_step 每隔_t_step个周期取一个周期的数据
# 返回:
# _period_lst 保存周期数据的列表，其中每个元素都是一个周期
# _zero_lst   保存所有零点的列表
def split_single_period(
        _y: list[float], _t_step: int
) -> tuple[list[list[float]], list[int]]:
    _period_y_lst = []
    _zero_lst = []
    _y = np.asarray(_y, dtype=float)

    # 把恰好等于 0 的点当作正号，避免 sign 跳来跳去
    s = np.sign(_y)
    s[s == 0] = 1

    # 找到符号变化发生在 (i, i+1) 之间的左索引 i
    left = np.where(s[:-1] * s[1:] < 0)[0]

    # 在 i 和 i+1 之间，选 |y| 更小的点作为“最近的零点索引”
    choose_right = np.abs(_y[left + 1]) < np.abs(_y[left])
    nearest_idx = left + choose_right.astype(int)
    # 所有零点的索引
    _crossings: list[float] = nearest_idx.tolist()

    for i in range(0, len(_crossings) - (_t_step + 1), (_t_step + 1) * 2):
        # 第一个零点到第三个零点之间的数据存为一个周期
        single_period = list(_y[_crossings[i]: _crossings[i + 2]])
        # 保证单周期点数为偶数
        if len(single_period) % 2 != 0:
            single_period.append(_y[_crossings[i + 2] + 1])
        _period_y_lst.append(single_period)
        _zero_lst.append(_crossings[i])

    return _period_y_lst, _zero_lst


# 获取保存路径
def get_dir_path(cwd: str = ""):
    t = localtime()
    p = os.path.join(cwd) if cwd else os.path.join("C:/picture")
    p = os.path.join(p, f"{t[0]}-{t[1]}-{t[2]}")  # 年月日
    p = os.path.join(p, f"{t[3]}_{t[4]}_{t[5]}")  # 时分秒
    if not os.path.exists(p):
        os.makedirs(p, exist_ok=True)
    return p


# 保存文档
def save_document(cwd: str, point_dict: list[dict[int, float]], rate: float):
    p = os.path.join(cwd, "document.txt")
    s: list[str] = [f"一共有{len(point_dict)}张图片\n", f"通过率: {rate:.3f}\n\n"]

    for _i, pt in enumerate(point_dict):
        s.append(f"图{_i + 1} 有 {len(pt)}个突变点\t")
        for _j in pt.keys():
            s.append(f"({_j},{pt[_j] : .4f}) ")
        s.append("\n")

    ws = "".join(s)

    with open(p, "w", encoding="utf-8") as f:
        f.write(ws)
    return


# epsilon60 = 6000
# epsilon80 = 6000
# epsilon120 = 6000
# epsilon150 = 10000

# 单个图片保存
def save_single_worker(_i: int, _zero_x, _period_x, _period_y, _period_s2, _tubiandian_len: int, _file_path, _epsilon3,
                       _debug_single):
    single_fig = Figure(dpi=100)
    single_ax = single_fig.subplots()
    # 画原始波形
    single_ax.plot(_period_x, _period_y, "-", color="blue", linewidth=1.0)
    # 画处理后的斜率差
    single_ax.plot(_period_x, _period_s2, "-", color="black", linewidth=1.0)
    # 画epsilon线
    single_ax.plot(_period_x, [_epsilon3] * len(_period_x), "-", color="red", linewidth=0.8)
    single_ax.plot(_period_x, [-_epsilon3] * len(_period_x), "-", color="red", linewidth=0.8)
    single_ax.grid(True, linewidth=0.5)
    single_ax.set_title(f"{_i + 1}")
    save_path = os.path.join(_file_path, f"{_i + 1}.png")
    single_fig.canvas.draw()
    from time import time
    start = time()
    single_fig.canvas.print_figure(save_path)
    print(f'{time() - start}s')
    if not (1 <= _tubiandian_len <= 2):
        return [[save_path], [[_period_x[_j], period_s2] for _j, period_s2 in enumerate(_period_y)]]
    return []


# 多进程保存图片
def save_single_pic_mp(
        _zero_x_lst, _period_x_lst, _period_y_lst, _period_s2_lst,
        _tubiandian_lst, _file_path, _epsilon3, _debug_single, max_pic_num: int
):
    i = 0
    futures = []
    for _i, _zero_x in enumerate(_zero_x_lst):
        if i >= max_pic_num:
            break
        _tubiandian_len = len(_tubiandian_lst[_i])
        if (not (1 <= _tubiandian_len <= 2)) or _debug_single:
            futures.append(
                EXECUTOR.submit(
                    save_single_worker,
                    _i,
                    _zero_x,
                    _period_x_lst[_i],
                    _period_y_lst[_i],
                    _period_s2_lst[_i],
                    _tubiandian_len,
                    _file_path,
                    _epsilon3,
                    _debug_single
                )
            )
        i += 1

    err_data_lst, save_path_lst = [], []
    for fut in as_completed(futures):
        rar = fut.result()
        if rar:
            save_path_lst.append(rar[0][0])
            err_data_lst.append(rar[1])
    return save_path_lst, err_data_lst


# 保存数据到文件
# def dump_data(draw_id: str, _zero_x_lst, _period_x_lst, _period_y_lst, _period_s2_lst,
#               _tubiandian_lst, _file_path, _epsilon3, _debug_single, max_pic_num: int):
#     tmp_data: dict = {
#         "zero_x_lst": _zero_x_lst,
#         "period_x_lst": _period_x_lst,
#         "period_y_lst": _period_y_lst,
#         "period_s2_lst": _period_s2_lst,
#         "tubiandian_lst": _tubiandian_lst,
#         "file_path": _file_path,
#         "epsilon3": _epsilon3,
#         "debug_single": _debug_single,
#         "max_pic_num": max_pic_num
#     }
#     with open(os.path.join(gettempdir(), f"{draw_id}.pkl"), "wb") as f:
#         pickle.dump(tmp_data, f)  # type: ignore
#     err_data_lst = []
#     for _i, _zero_x in enumerate(_zero_x_lst):
#         _tubiandian_len = len(_tubiandian_lst[_i])
#         if (not (1 <= _tubiandian_len <= 2)) or _debug_single:
#             _period_x = _period_x_lst[_i]
#             _period_y = _period_y_lst[_i]
#             err_data_lst.append([[_period_x[_j], period_s2] for _j, period_s2 in enumerate(_period_y)])
#     return err_data_lst


def wave_check_real(
        data: list[float],
        epsilon3: float,
        debug_total: bool,
        debug_single: bool,
        period_step: int,
        save_path: str,
        _step1: int,
        _step2: int,
        max_pic_num: int,
        rate: float,
        smooth_window: int,
        edge_min_gap: int,
        adaptive_k: float,
):
    # draw_id = str(time())
    current_time = strftime("%Y-%m-%d %H:%M:%S", localtime())
    print(f"{current_time} Request.")
    # y轴原始数据
    y = data[0:10000]
    # x轴原始数据
    x = list(range(0, len(y)))

    # 图片保存路径
    file_path = get_dir_path(save_path)
    # 记录每个周期的突变点,数组中的每个元素为每个周期的突变点,每个突变点用横坐标和纵坐标记录
    tubiandian_lst: list[dict[int, float]] = []
    # 包含每个周期的x坐标数据
    period_x_lst: list[list[int]] = []
    # 包含每个周期的斜率差数据
    period_s2_lst = []
    # 分离每个周期
    # period_y_lst 列表包含每个周期的数据
    # zero_x_lst 列表包含每个周期的起始x坐标
    period_y_lst, zero_x_lst = split_single_period(y, period_step)
    # 一共多少周期
    period_len = len(period_y_lst)

    # 数据准备
    square_like_num = 0
    triangle_like_num = 0
    for i in range(0, period_len):
        period_data_smoothed = moving_average(period_y_lst[i], smooth_window)
        if is_square_like(period_data_smoothed):
            square_like_num += 1
        elif is_triangle_like(period_data_smoothed):
            triangle_like_num += 1

        period_x = list(range(zero_x_lst[i], zero_x_lst[i] + len(period_y_lst[i])))
        period_s2, tubiandian = panjue(
            period_x,
            period_y_lst[i],
            epsilon3,
            _step1,
            _step2,
            smooth_window,
            edge_min_gap,
            adaptive_k
        )

        period_x_lst.append(period_x)
        period_s2_lst.append(period_s2)
        tubiandian_lst.append(tubiandian)

    # 画图准备
    if debug_total:
        # 画图预备
        total_fig = Figure(figsize=(6, 4), dpi=100)
        total_ax = total_fig.subplots()
        # 画原始波形
        total_ax.plot(x, y, "-o", color="blue")
        for i in range(0, period_len):
            total_ax.plot(period_x_lst[i], period_y_lst[i], "*", color="red")
            total_ax.plot(period_x_lst[i], period_s2_lst[i], "-o", color="black")
            total_ax.set_xlabel("x")
            total_ax.set_ylabel("y")
            total_ax.grid(True)
            total_fig.tight_layout()
            total_fig.savefig(os.path.join(file_path, "total.png"))

    good_period_num = 0
    for i in tubiandian_lst:
        if 1 <= len(i) <= 2:
            good_period_num += 1
    good_period_rate = good_period_num / max(1, len(tubiandian_lst))

    period_total = max(1, period_len)
    triangle_ratio = triangle_like_num / period_total
    square_ratio = square_like_num / period_total
    triangle_detected = (triangle_ratio >= 0.55) and (triangle_ratio >= square_ratio)
    pass_flag = (good_period_rate >= rate) and triangle_detected

    ret_err_datas, err_pic_paths = [], []
    if not pass_flag or debug_single:
        # 有缺陷的图片的路径
        # 有缺陷的波形数据
        # 把数据保存到文件
        err_pic_paths, ret_err_datas = save_single_pic_mp(
            zero_x_lst,
            period_x_lst,
            period_y_lst,
            period_s2_lst,
            tubiandian_lst,
            file_path,
            epsilon3,
            debug_single,
            max_pic_num
        )

    save_document(file_path, tubiandian_lst, good_period_rate)
    current_time = strftime("%Y-%m-%d %H:%M:%S", localtime())
    print(f"{current_time} Response.")
    # print(f"{current_time} 通过率 {good_period_rate * 100: .3f}%")
    return pass_flag, tubiandian_lst, ret_err_datas, err_pic_paths


@app.route("/wave_check", methods=["POST"])
def wave_check():
    # 获取参数
    req: dict = request.get_json()
    req_data = req["data"]
    data: list[float] = req_data.get("wave", [])  # 波形数据
    if len(data) < 1000:
        return jsonify({"code": 400, "msg": "参数错误, 波形数据太少"})
    epsilon3: float = req_data.get("epsilon", 0.2)  # epsilon,判决用
    step2: int = req_data.get("step2", 2)  # 斜率差的步长
    step1: int = req_data.get("step1", 2)  # 斜率的步长
    debug_total: bool = req_data.get("debug_total", False)  # 是否保存总图
    debug_single: bool = req_data.get("debug_single", False)  # 是否保存单周期图
    period_step: int = req_data.get("period_step", 2)  # 周期步长
    save_path: str = req_data.get("save_path", "C:/picture")  # 图像保存路径
    max_pic_num: int = req_data.get("max_pic_num", 6)  # 生成错误图片最大数量
    rate: float = req_data.get("rate", 0.8)
    smooth_window: int = max(1, int(req_data.get("smooth_window", 9)))
    edge_min_gap: int = max(1, int(req_data.get("edge_min_gap", 32)))
    adaptive_k: float = max(0.1, float(req_data.get("adaptive_k", 1.0)))
    auto_params: bool = bool(req_data.get("auto_params", False))
    auto_sample_size: int = max(1000, int(req_data.get("auto_sample_size", 10000)))

    if auto_params:
        epsilon3, smooth_window, edge_min_gap, adaptive_k = auto_generate_params(
            data,
            period_step,
            step1,
            step2,
            auto_sample_size,
        )

    # 执行检测
    pass_flag, tbd, err_datas, err_pic_paths = wave_check_real(
        data,
        epsilon3,
        debug_total,
        debug_single,
        period_step,
        save_path,
        step1,
        step2,
        max_pic_num,
        rate,
        smooth_window,
        edge_min_gap,
        adaptive_k,
    )

    # 返回结果
    resp = {
        "code": 200,
        "msg": "success",
        "data": {
            # 检测结果
            "pass_flag": pass_flag,
            # 错误数据
            "err_data_list": err_datas,
            # 错误图片路径
            "err_pic_path_list": err_pic_paths,
            # 突变点
            "tubiandian_list": tbd,
        },
    }
    return jsonify(resp)


@app.route("/test", methods=["POST"])
def test():
    data: dict = request.get_json()
    data["str"] = "hello world"
    data["int"] = 123
    data["float"] = 12.3
    data["bool"] = True
    data["list"] = [1, 2, 3, 4, 5]
    data["dict"] = {"a": 1, "b": 2, "c": 3}
    print(data)
    return jsonify(data)


# def delete_tmp_pkl():
#     for i in os.listdir(gettempdir()):
#         if i.endswith(".pkl"):
#             os.remove(os.path.join(gettempdir(), i))


if __name__ == "__main__":
    # 删除上次运行的临时pkl文件
    # delete_tmp_pkl()
    # 画图多进程支持
    freeze_support()
    _executor_warmup()
    # 加载配置文件
    load_dotenv()
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5001"))
    threads = int(os.getenv("THREADS", "32"))  # 可按需调整
    backlog = int(os.getenv("BACKLOG", "128"))  # 等待队列
    debug_server = os.getenv("DEBUG_SERVER", "False") in ["true", "True"]
    if debug_server:
        app.run(host=host, port=port, debug=True)
    else:
        print("server listen:", [host, port])
        print("server running...")
        print("press ctrl + c to exit.")
        serve(app, host=host, port=port, threads=threads, backlog=backlog)
