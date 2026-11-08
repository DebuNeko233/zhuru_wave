#pragma once
#include "pch.h"
#include <vector>
#include <numeric>
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <string>

struct Crossing {
    std::size_t i;      // 过零发生在 (i, i+1) 之间
    enum Kind { Rise, Fall } kind;
};

struct SegmentReport {
    std::size_t start_idx = 0;
    std::size_t end_idx = 0;
    int len = 0;
    std::vector<double> seg;
    std::vector<double> slopes;
    std::vector<int>    slope_signs;
    int  slope_changes = 0;
    bool triangle_like = false;
    std::size_t peak_idx = 0;
    double peak_val = 0.0;
    int near_peak_pts = 0;
    int near_zero_slopes = 0;
    bool rounded = false;
};

struct DebugInfo {
    double avg = 0.0;
    double amp = 1.0;
    std::vector<double> normalized;
    std::vector<Crossing> crossings;
    std::vector<SegmentReport> segments;
    struct Summary {
        int total_pos_half_periods = 0;
        int triangle_like_count = 0;
        double triangle_like_ratio = 0;
        int rounded_count = 0;
        double non_rounded_ratio = 0;
        bool decision = false;
        std::string reason;
    } summary;
};

struct DetectorParams {
    double slope_eps = 0.02;
    double peak_flat_tol = 0.03;
    int    peak_flat_min_pts = 4;
    double majority = 0.7;
    int    min_seg_len = 6;
};

inline
std::pair<bool, DebugInfo>
isTriangleWaveDebug(const std::vector<double>& y, const DetectorParams& P = {})
{
    DebugInfo dbg;
    const std::size_t n = y.size();

    if (n < 4) {
        dbg.summary.reason = "too_short";
        return { false, dbg };
    }

    // 1) 归一化
    const double avg = std::accumulate(y.begin(), y.end(), 0.0) / static_cast<double>(n);
    dbg.avg = avg;

    std::vector<double> yn;
    yn.reserve(n);
    double amp = 0.0;
    for (double v : y) {
        double c = v - avg;
        amp = std::max(amp, std::abs(c));
        yn.push_back(c);
    }
    if (amp <= 0.0) amp = 1.0;
    for (double& v : yn) v /= amp;

    dbg.amp = amp;
    dbg.normalized = yn;

    // 2) 找过零
    std::vector<Crossing> crossings;
    crossings.reserve(n / 4 + 4);
    for (std::size_t i = 0; i + 1 < n; ++i) {
        const double a = yn[i], b = yn[i + 1];
        if (a < 0.0 && b >= 0.0) {
            crossings.push_back({ i, Crossing::Rise });
        }
        else if (a > 0.0 && b <= 0.0) {
            crossings.push_back({ i, Crossing::Fall });
        }
    }
    dbg.crossings = crossings;

    // 3) 取正半周期
    struct PosSeg { std::size_t s, e; };
    std::vector<PosSeg> pos;
    pos.reserve(crossings.size() / 2);
    for (std::size_t k = 0; k + 1 < crossings.size(); ++k) {
        if (crossings[k].kind == Crossing::Rise && crossings[k + 1].kind == Crossing::Fall) {
            const std::size_t s = crossings[k].i;
            const std::size_t e = crossings[k + 1].i + 1;
            if (e >= s + P.min_seg_len) {
                pos.push_back({ s, e });
            }
        }
    }

    if (pos.empty()) {
        dbg.summary.reason = "no_positive_half_periods";
        return { false, dbg };
    }

    // 4) 分析每段
    dbg.segments.reserve(pos.size());
    int tri_like = 0, rounded = 0;
    for (auto [s, e] : pos) {
        SegmentReport R;
        R.start_idx = s;
        R.end_idx = e;
        R.len = static_cast<int>(e - s + 1);
        R.seg.assign(yn.begin() + static_cast<std::ptrdiff_t>(s),
            yn.begin() + static_cast<std::ptrdiff_t>(e) + 1);

        if (R.len >= 2) {
            R.slopes.reserve(static_cast<std::size_t>(R.len - 1));
            for (int i = 1; i < R.len; ++i)
                R.slopes.push_back(R.seg[i] - R.seg[i - 1]);
        }

        // slope signs
        R.slope_signs.reserve(R.slopes.size());
        for (double s : R.slopes) {
            if (s > P.slope_eps) R.slope_signs.push_back(+1);
            else if (s < -P.slope_eps) R.slope_signs.push_back(-1);
        }

        // 斜率变化
        for (std::size_t i = 1; i < R.slope_signs.size(); ++i)
            if (R.slope_signs[i] != R.slope_signs[i - 1]) ++R.slope_changes;

        // 三角判定
        R.triangle_like =
            !R.slope_signs.empty() &&
            R.slope_signs.front() == +1 &&
            R.slope_signs.back() == -1 &&
            R.slope_changes == 1;

        // 峰值
        auto it = std::max_element(R.seg.begin(), R.seg.end());
        R.peak_idx = static_cast<std::size_t>(std::distance(R.seg.begin(), it));
        R.peak_val = *it;

        // near_peak_pts
        for (double v : R.seg)
            if (v >= R.peak_val - P.peak_flat_tol) ++R.near_peak_pts;

        // near_zero_slopes
        if (!R.slopes.empty()) {
            const int pk = static_cast<int>(R.peak_idx);
            const int lo = std::max(0, pk - 2);
            const int hi = std::min((int)R.slopes.size() - 1, std::max(0, pk));
            for (int j = lo; j <= hi; ++j)
                if (std::abs(R.slopes[j]) <= P.slope_eps) ++R.near_zero_slopes;
        }

        R.rounded = (R.near_peak_pts >= P.peak_flat_min_pts) || (R.near_zero_slopes >= 2);

        if (R.triangle_like) ++tri_like;
        if (R.rounded) ++rounded;
        dbg.segments.emplace_back(std::move(R));
    }

    // 5) 汇总
    const int total = static_cast<int>(dbg.segments.size());
    const double tri_like_ratio = total ? double(tri_like) / total : 0.0;
    const double non_rounded_ratio = total ? double(total - rounded) / total : 0.0;
    const bool decision = (tri_like_ratio >= P.majority) && (non_rounded_ratio >= P.majority);

    dbg.summary.total_pos_half_periods = total;
    dbg.summary.triangle_like_count = tri_like;
    dbg.summary.triangle_like_ratio = tri_like_ratio;
    dbg.summary.rounded_count = rounded;
    dbg.summary.non_rounded_ratio = non_rounded_ratio;
    dbg.summary.decision = decision;
    dbg.summary.reason = "majority rule";

    return { decision, dbg };
}

inline
bool isTriangleWave(const std::vector<double>& y, const DetectorParams& P = {})
{
    return isTriangleWaveDebug(y, P).first;
}
