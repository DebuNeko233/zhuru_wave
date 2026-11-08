#include "TriangleDetector.h"
#include <cmath>
#include <cfloat>
#include <cstdlib>

// 最简单版：找最大值索引（等价于 find_peaks_lastpoint 中最后一个峰）
static int find_peak_index(const double* y, int len) {
    int idx = 0;
    double max_val = -DBL_MAX;
    for (int i = 0; i < len; ++i) {
        if (y[i] > max_val) {
            max_val = y[i];
            idx = i;
        }
    }
    return idx;
}

// 线性拟合 y = a * x + b，返回 a 和 b
static void linear_fit(const double* x, const double* y, int len, double* a, double* b) {
    double sum_x = 0, sum_y = 0, sum_xx = 0, sum_xy = 0;
    for (int i = 0; i < len; ++i) {
        sum_x += x[i];
        sum_y += y[i];
        sum_xx += x[i] * x[i];
        sum_xy += x[i] * y[i];
    }
    double denom = len * sum_xx - sum_x * sum_x;
    if (denom == 0) {
        *a = 0;
        *b = 0;
        return;
    }
    *a = (len * sum_xy - sum_x * sum_y) / denom;
    *b = (sum_y * sum_xx - sum_x * sum_xy) / denom;
}

// 标准化 RMSE（除以范围）
static double calc_rmse(const double* x, const double* y, int len, double a, double b) {
    double sum_sq = 0, ymin = DBL_MAX, ymax = -DBL_MAX;
    for (int i = 0; i < len; ++i) {
        double yfit = a * x[i] + b;
        double err = y[i] - yfit;
        sum_sq += err * err;
        if (y[i] < ymin) ymin = y[i];
        if (y[i] > ymax) ymax = y[i];
    }
    double range = ymax - ymin;
    if (range == 0) return 1e9;
    return sqrt(sum_sq / len) / range;
}

// 判断是否为三角波半周期段
bool is_triangle_half_period(const double* x, const double* y, int start, int end,
    double rmse_thresh, double slope_sym_thresh) {
    int len = end - start + 1;
    if (len < 4) return false;

    int peak_idx = find_peak_index(y + start, len) + start;

    // 拟合上升段
    double a1, b1;
    linear_fit(x + start, y + start, peak_idx - start + 1, &a1, &b1);
    double rmse1 = calc_rmse(x + start, y + start, peak_idx - start + 1, a1, b1);

    // 拟合下降段
    double a2, b2;
    linear_fit(x + peak_idx, y + peak_idx, end - peak_idx + 1, &a2, &b2);
    double rmse2 = calc_rmse(x + peak_idx, y + peak_idx, end - peak_idx + 1, a2, b2);

    // 对称性
    double slope_ratio = (a2 == 0) ? 1e9 : fabs(1 - fabs(a1 / a2));
    bool opposite_sign = (a1 * a2 < 0);

    return (rmse1 < rmse_thresh &&
        rmse2 < rmse_thresh &&
        slope_ratio < slope_sym_thresh &&
        opposite_sign);
}

// 提取“上升+下降”段
bool find_triangle_half_period(const double* x, const double* y, int len, int* out_start, int* out_end) {
    double mean = 0;
    for (int i = 0; i < len; ++i) mean += y[i];
    mean /= len;

    int prev_sign = (y[0] - mean) >= 0 ? 1 : -1;
    int crossings[2] = { -1, -1 };
    int found = 0;

    for (int i = 1; i < len - 1; ++i) {
        int curr_sign = (y[i] - mean) >= 0 ? 1 : -1;
        if (curr_sign != prev_sign) {
            if (found < 2) crossings[found++] = i - 1;
            if (found == 2) break;
        }
        prev_sign = curr_sign;
    }

    if (found == 2) {
        *out_start = crossings[0];
        *out_end = crossings[1] + 1;
        return true;
    }
    return false;
}
