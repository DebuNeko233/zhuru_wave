#include "pch.h"
#include "triangle.h"
#include <vector>
#include <cmath>
#include <algorithm>
#include <numeric>
#include <cstddef>
#include <iostream>


bool TriangleDetector::findOnePeriod() const {
    if (!ori_data || !one_period_data) return false;
    const auto& y = *ori_data;
    // y的长度
    const std::size_t N = y.size();
    if (N < 4) return false;

    // 以均值为“零”找过零点
    const double avg = std::accumulate(y.begin(), y.end(), 0.0) / static_cast<double>(N);

    // 收集所有“上升穿越”（负→正）的索引 i，使得 y[i]-avg < 0 且 y[i+1]-avg >= 0
    std::vector<std::size_t> rise_indices;
    rise_indices.reserve(4);

    auto yn = [&](std::size_t i) { return y[i] - avg; };

    for (std::size_t i = 0; i + 1 < N; ++i) {
        double a = yn(i);
        double b = yn(i + 1);

        // 跟 Python 一致，用“符号变化”为前提的判据：
        // 这里直接检测负→非负（允许恰好为 0 的样本）
        if (a < 0.0 && b >= 0.0) {
            rise_indices.push_back(i);
            if (rise_indices.size() >= 2) break;
        }

        // 若严格仿照 np.sign 的变化，也可用：
        // if (sgn(a) < 0 && sgn(b) > 0) ...
    }

    if (rise_indices.size() < 2) return false;

    const std::size_t i_start = rise_indices[0];
    const std::size_t i_end = rise_indices[1] + 1; // 包含下一个穿越点的后一个点（与 Python 对齐）
    if (i_end + 1 > N || i_end <= i_start) return false;

    one_period_data->assign(y.begin() + static_cast<std::ptrdiff_t>(i_start),
        y.begin() + static_cast<std::ptrdiff_t>(i_end + 1));
    return !one_period_data->empty();
}


bool TriangleDetector::findHalfPeriod() const {
    if (!ori_data || !half_period_data) return false;
    const auto& y = *ori_data;
    const std::size_t N = y.size();
    if (N < 4) return false;

    // 以均值为零线
    const double avg = std::accumulate(y.begin(), y.end(), 0.0) / static_cast<double>(N);
    auto yn = [&](std::size_t i) { return y[i] - avg; };

    // 先找“上升穿越”（负→非负）
    auto rise_idx = static_cast<std::size_t>(-1);
    for (std::size_t i = 0; i + 1 < N; ++i) {
        double a = yn(i), b = yn(i + 1);
        if (a < 0.0 && b >= 0.0) {
            // 上升穿越
            rise_idx = i;
            break;
        }
    }
    if (rise_idx == static_cast<std::size_t>(-1)) return false;

    // 再从 rise_idx 之后找“下降穿越”（正→非正）
    auto fall_idx = static_cast<std::size_t>(-1);
    for (std::size_t i = rise_idx + 1; i + 1 < N; ++i) {
        double a = yn(i), b = yn(i + 1);
        if (a > 0.0 && b <= 0.0) {
            // 下降穿越
            fall_idx = i;
            break;
        }
    }
    if (fall_idx == static_cast<std::size_t>(-1)) return false;

    const std::size_t i_start = rise_idx;
    const std::size_t i_end = fall_idx + 1; // 含后一个样本，和你原实现对齐
    if (i_end + 1 > N || i_end <= i_start) return false;

    half_period_data->assign(
        y.begin() + static_cast<std::ptrdiff_t>(i_start),
        y.begin() + static_cast<std::ptrdiff_t>(i_end + 1)
    );
    return !half_period_data->empty();
}


double TriangleDetector::variance(const std::vector<double>& data) {
    if (data.empty()) {
        return 0;
    }

    // 计算均值
    double mean = std::accumulate(data.begin(), data.end(), 0.0) / data.size();

    // 计算平方差和
    double sq_sum = 0.0;
    for (double v : data) {
        double diff = v - mean;
        sq_sum += diff * diff;
    }

    return sq_sum / data.size(); // 总体方差
}


std::vector<double> TriangleDetector::normalizeMinus1To1(const std::vector<double>& data) {
    if (data.empty()) {
        return {};
    }

    auto [minIt, maxIt] = std::minmax_element(data.begin(), data.end());
    double minVal = *minIt;
    double maxVal = *maxIt;
    double range = maxVal - minVal;

    std::vector<double> result;
    result.reserve(data.size());

    if (range == 0.0) {
        result.assign(data.size(), 0.0);
        return result;
    }

    for (double v : data) {
        result.push_back(2.0 * (v - minVal) / range - 1.0);
    }
    return result;
}


bool TriangleDetector::nearly_equal(double a, double b, double eps) {
    return std::fabs(a - b) <= eps * std::max(1.0, std::max(std::fabs(a), std::fabs(b)));
}


// 在线性最小二乘：拟合 y ≈ a*x + b
bool TriangleDetector::linear_fit_ab(const std::vector<double>& x,
    const std::vector<double>& y,
    double& a, double& b) {
    const size_t n = x.size();
    if (n != y.size() || n < 2) return false;

    double sx = 0.0, sy = 0.0, sxx = 0.0, sxy = 0.0;
    for (size_t i = 0; i < n; ++i) {
        sx += x[i];
        sy += y[i];
        sxx += x[i] * x[i];
        sxy += x[i] * y[i];
    }
    const double denom = n * sxx - sx * sx;
    if (TriangleDetector::nearly_equal(denom, 0.0)) return false;

    a = (n * sxy - sx * sy) / denom;
    b = (sy - a * sx) / static_cast<double>(n);
    return true;
}


// 归一化 RMSE：用该段的幅度范围 (max - min) 归一化
double TriangleDetector::normalized_rmse(const std::vector<double>& x,
    const std::vector<double>& y,
    double a, double b) {
    const size_t n = y.size();
    if (n == 0) return INFINITY;

    auto [minIt, maxIt] = std::minmax_element(y.begin(), y.end());
    const double range = *maxIt - *minIt;
    if (range <= 0.0) return INFINITY;

    double se = 0.0;
    for (size_t i = 0; i < n; ++i) {
        const double yhat = a * x[i] + b;
        const double d = y[i] - yhat;
        se += d * d;
    }
    const double rmse = std::sqrt(se / static_cast<double>(n));
    return rmse / range;
}


// 找所有峰（含平顶峰，返回平顶**最后一个索引**）
std::vector<size_t> TriangleDetector::find_peaks_lastpoint(const std::vector<double>& y) {
    std::vector<size_t> peaks;
    const size_t n = y.size();
    if (n < 3) return peaks;

    for (size_t i = 1; i + 1 < n; ++i) {
        // 普通尖峰：y[i-1] < y[i] > y[i+1]
        if (y[i] > y[i - 1] && y[i] > y[i + 1]) {
            peaks.push_back(i);
            continue;
        }
        // 平顶峰：左侧上升，出现一段 y 相等，右侧下降。取平顶的最后一个点
        if (y[i] > y[i - 1] && TriangleDetector::nearly_equal(y[i], y[i + 1])) {
            size_t l = i, r = i + 1;
            // 向右扩展平顶
            while (r + 1 < n && TriangleDetector::nearly_equal(y[r], y[r + 1])) ++r;
            // 右侧应下降才是峰
            if (r + 1 < n && y[r] > y[r + 1]) {
                peaks.push_back(r); // 取平顶最后一个点
            }
            // 跳到 r 继续
            i = r;
        }
    }
    return peaks;
}

// 检测波形中的突变位置，并返回每个突变段中最低点的索引（去重+排序）
std::vector<int> TriangleDetector::detect_jump_valleys(const std::vector<double>& y,
    double threshold = 0.9,  // 越大越严格
    int window = 3)          // 窗口半宽
{
    std::vector<int> valleys;
    const std::size_t n = y.size();
    if (n < 3) return valleys;

    // 二阶差分的绝对值 |y[i+2] - 2*y[i+1] + y[i]|
    for (std::size_t i = 0; i + 2 < n; ++i) {
        const double ddy = std::abs(y[i + 2] - 2.0 * y[i + 1] + y[i]);
        if (ddy > threshold) {
            const std::size_t idx = i + 1; // 对齐 Python 的 "+1 修正"
            const int start = std::max<int>(0, static_cast<int>(idx) - window);
            const int end = std::min<int>(static_cast<int>(n),
                static_cast<int>(idx) + window + 1);

            // 在 [start, end) 内找最小值位置
            auto it = std::min_element(y.begin() + start, y.begin() + end);
            const int local_min_idx = start + static_cast<int>(std::distance(y.begin() + start, it));
            valleys.push_back(local_min_idx);
        }
    }

    // 去重 + 排序（防止窗口重叠导致重复）
    std::sort(valleys.begin(), valleys.end());
    valleys.erase(std::unique(valleys.begin(), valleys.end()), valleys.end());
    return valleys;
}


bool TriangleDetector::isTriangle(double slope_sym_thresh /*=0.05*/, double rmse_thresh /*=0.03*/, bool debug) const {
    auto half_period_result = findHalfPeriod();
    if (!half_period_result) return false;
    if (!half_period_data || half_period_data->size() < 5) return false;

    const auto& y = *half_period_data;
    const std::size_t M = y.size();

    std::vector<std::size_t> peaks = find_peaks_lastpoint(y);
    if (peaks.empty()) return false;

    std::size_t peak = *std::max_element(peaks.begin(), peaks.end(),
        [&](std::size_t a, std::size_t b) { return y[a] < y[b]; });
    if (peak == 0 || peak >= M - 1) return false;

    std::vector<double> x_up(peak + 1), y_up(peak + 1);
    std::vector<double> x_down(M - peak), y_down(M - peak);
    for (std::size_t i = 0; i <= peak; ++i) { x_up[i] = static_cast<double>(i); y_up[i] = y[i]; }
    for (std::size_t i = peak; i < M; ++i) { x_down[i - peak] = static_cast<double>(i); y_down[i - peak] = y[i]; }

    if (x_up.size() < 4 || x_down.size() < 4) return false;

    double a_up = 0, b_up = 0, a_down = 0, b_down = 0;
    if (!linear_fit_ab(x_up, y_up, a_up, b_up))   return false;
    if (!linear_fit_ab(x_down, y_down, a_down, b_down)) return false;

    const double rmse_up = normalized_rmse(x_up, y_up, a_up, b_up);
    const double rmse_down = normalized_rmse(x_down, y_down, a_down, b_down);
    if (!(rmse_up < rmse_thresh && rmse_down < rmse_thresh)) return false;

    constexpr double EPS = 1e-12;
    if (std::abs(a_up) < EPS || std::abs(a_down) < EPS) return false;

    const double slope_sym_err = std::abs(1.0 - std::abs(a_up / a_down));
    const bool   sign_ok = (a_up > 0.0) != (a_down > 0.0);
    if (!(slope_sym_err < slope_sym_thresh && sign_ok)) return false;

    // 可选调试输出
    if (debug) {
        std::cout << "上升斜率=" << a_up << ", 下降斜率=" << a_down << "\n"
            << "RMSE_up=" << rmse_up << ", RMSE_down=" << rmse_down << "\n"
            << "斜率对称误差=" << slope_sym_err << ", 符号相反? " << (sign_ok ? "true" : "false") << "\n";
    }

    return true;
}

// 注释理由: 不稳定
// bool TriangleDetector::isTriangle(double slope_sym_thresh = 0.05, double rmse_thresh = 0.03, bool debug = false) const {
//     // 寻找半个周期并提取数据存到half_period_data中
//     auto half_period_result = findHalfPeriod();
//     if (!half_period_result) return false;
//     if (!half_period_data || half_period_data->size() < 5) return false;
//
//     const std::vector<double> &y = *half_period_data;
//     const size_t M = y.size();
//
//     // 1) 找峰（半周期中点）
//     std::vector<size_t> peaks = find_peaks_lastpoint(y);
//     if (peaks.empty()) {
//         // std::cout << "?? 未找到峰值\n";
//         return false;
//     }
//     // 选 y[peak] 最大的那个
//     size_t peak = peaks[0];
//     double peak_val = y[peak];
//     for (size_t idx: peaks) {
//         if (y[idx] > peak_val) {
//             peak = idx;
//             peak_val = y[idx];
//         }
//     }
//     if (peak == 0 || peak >= M - 1) return false;
//
//     // 2) 构造上下段 (含峰)
//     std::vector<double> x_up(peak + 1), y_up(peak + 1);
//     std::vector<double> x_dn(M - peak), y_dn(M - peak);
//     for (size_t i = 0; i <= peak; ++i) {
//         x_up[i] = static_cast<double>(i);
//         y_up[i] = y[i];
//     }
//     for (size_t i = peak; i < M; ++i) {
//         x_dn[i - peak] = static_cast<double>(i);
//         y_dn[i - peak] = y[i];
//     }
//
//     // 3) 两段线性拟合
//     double a_up = 0.0, b_up = 0.0, a_dn = 0.0, b_dn = 0.0;
//     if (!linear_fit_ab(x_up, y_up, a_up, b_up)) return false;
//     if (!linear_fit_ab(x_dn, y_dn, a_dn, b_dn)) return false;
//
//     // 4) 两段 RMSE（归一化到该段幅度范围）
//     constexpr double RMSE_THRESH = 0.03; // 对应 Python 默认
//     const double rmse_up = normalized_rmse(x_up, y_up, a_up, b_up);
//     const double rmse_dn = normalized_rmse(x_dn, y_dn, a_dn, b_dn);
//     if (!(rmse_up < RMSE_THRESH && rmse_dn < RMSE_THRESH)) {
//         if (debug)
//             std::cout << "RMSE_up=" << rmse_up << ", RMSE_down=" << rmse_dn << std::endl;
//         return false;
//     }
//
//     // 5) 斜率对称性与符号
//     if (nearly_equal(a_dn, 0.0)) return false;
//     const double slope_sym_err = std::fabs(1.0 - std::fabs(a_up / a_dn)); // 越小越好
//     const bool sign_ok = (a_up > 0.0) != (a_dn > 0.0); // 符号相反
//     if (!(slope_sym_err < slope_sym_thresh && sign_ok)) {
//         if (debug)
//             std::cout << "slope_sym_err=" << slope_sym_err << ", sign_ok=" << sign_ok << "\n";
//         return false;
//     }
//
//     // 可选：调试输出（与 Python 一致）
//     if (debug) {
//         std::cout << "上升斜率=" << a_up << ", 下降斜率=" << a_dn << "\n";
//         std::cout << "RMSE_up=" << rmse_up << ", RMSE_down=" << rmse_dn << "\n";
//         std::cout << "斜率对称误差=" << slope_sym_err << ", 符号相反? " << (sign_ok ? "true" : "false") << "\n";
//     }
//
//
//
//     return true;
// }
