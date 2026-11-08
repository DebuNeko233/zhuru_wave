#ifndef TRIANGLE_DETECTOR_H
#define TRIANGLE_DETECTOR_H


bool find_triangle_half_period(const double* x, const double* y, int len, int* out_start, int* out_end);
bool is_triangle_half_period(const double* x, const double* y, int start, int end,
    double rmse_thresh, double slope_sym_thresh);

#endif
