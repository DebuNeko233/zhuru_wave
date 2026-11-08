#pragma once

#ifdef WAVE_EXPORTS
#define DLL_API extern "C" __declspec(dllexport)
#else
#define DLL_API extern "C" __declspec(dllimport)
#endif


#define MAX_CH_NUM 4

#ifdef __cplusplus
extern "C" {
#endif

	DLL_API int SetParam(WORD nCHVoltDIV, WORD nTrigerSource, WORD nTimeDIV);

	DLL_API int ResetParam();

	/// 初始化设备并开始采集模式
	DLL_API bool InitDevice();

	/// 获取单个通道的采样点数据（返回实际获取的点数）
	DLL_API int GetSingleChannelData(int ch, float* outBuf, int maxLen);

	/// 获取所有通道采样数据，单位 Volt
	/// 每个通道数据保存在对应 float* 缓冲区中，可任意传入 nullptr 忽略某通道
	/// return 实际获取的点数（每个通道相同），失败返回 0
	DLL_API int GetAllChannelData(int maxLen, float* ch1Data, float* ch2Data, float* ch3Data, float* ch4Data);

	/// 获取采样率（Hz）
	DLL_API double GetSampleRate();

	/// 内部用，查表
	DLL_API double LookupSampleRateHz(int timeDivIdx, int channelCount);

	// 获取单个通道内信号的频率
	DLL_API double GetSingleChannelFreq(int ch, double* outFreq);

	// 获取四个通道内信号的频率
	DLL_API int GetAllChannelFreq(double *outFreqs);

	/* 判断是否为三角波
	 * val 是输入的波形数据数组
	 *
	 * len 是数据长度
	 * 
	 * double slope_eps = 0.02; // 斜率近零阈值（归一化后），0.02~0.04 更宽松
     * double peak_flat_tol = 0.03; // “接近峰顶”的容差（越小越不易判圆顶）
     * int    peak_flat_min_pts = 4;  // 近峰顶点数达到该值才算“圆顶/平顶”
     * double majority = 0.7;  // 多数规则阈值（0.55~0.6 更宽松）
	 */
	// DLL_API int isTriangle(double* val, int len, double slope_eps, double peak_flat_tol, int peak_flat_min_pts, double majority);


#ifdef __cplusplus
}
#endif
