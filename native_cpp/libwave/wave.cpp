#include "pch.h"
#define WAVE_EXPORTS
#include "wave.h"

#include <fftw3.h>
#include <algorithm>
#include <assert.h>
#include <chrono>
#include <numeric>
#include <thread>

#include "DefMacro.h"
#include "HTSoftDll.h"
#include "HTHardDll.h"
#include "MeasDll.h"
// #include "triangle.hpp"
#include <memory>


#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif


static CONTROLDATA g_control = {};
static RELAYCONTROL g_relay = {};
static WORD g_deviceIndex = 0;
static bool g_initialized = false;
static WORD* g_rawData[4]; // 原始数据
static short* g_srcData[4]; // 去掉垂直位置偏移的数据
static double g_sampleRateHz = 0;
static double g_lastFreq[4] = {0}; // 每通道上一次频率

int ResetParam()
{
	memset(&g_control, 0, sizeof(g_control));
	memset(&g_relay, 0, sizeof(g_relay));
	return 0;
}

// WORD ：unsigned short，无符号 16bit 整型，两个字节
int SetParam(WORD nCHVoltDIV, WORD nTrigerSource, WORD nTimeDIV)
{
	// 设置通道参数
	for (int i = 0; i < 4; ++i)
	{
		g_relay.bCHEnable[i] = 1; // 全部打开 默认1
		g_relay.nCHVoltDIV[i] = 7; // 500mV（索引7）查表3 默认7
		g_relay.nCHCoupling[i] = 0; // DC耦合 默认0
		g_relay.bCHBWLimit[i] = 0; // 不限带宽 默认0
	}
	g_relay.nTrigSource = nTrigerSource;	//表示触发源，以索引值形式取值。假设现在为4CH示波器，则内部触发取值
								//为：CH1 为0；CH2为1；CH3为2；CH4为3；如果有外部触发，则EXT
								//为5；如果有EXT / 10触发，则取值为6。默认0

	
	g_control.nCHSet = 0b1111;	// CH开关-- -//第0位：表示CH1开或者关. 0:关，1开 默认0b1111
								//第1位：表示CH2开或者关. 0:关，1开 
								//第2位：表示CH3开或者关. 0:关，1开 
								//第3位：表示CH4开或者关. 0:关，1开 
	g_control.nTimeDIV = nTimeDIV;	//时基 查表1 默认15
	g_control.nTriggerSource = g_relay.nTrigSource;
	g_control.nBufferLen = 20000; // 别改，数据buffer长度
	g_control.nReadDataLen = 10000;//一次读取的数据长度

	return 0;
}

bool InitDevice()
{
	for (int i = 0; i < 4; ++i)
	{
		g_rawData[i] = new WORD[10000];
		g_srcData[i] = new short[10000];
		memset(g_rawData[i], 0, sizeof(g_rawData[i]));
		memset(g_srcData[i], 0, sizeof(g_srcData[i]));
	}

	short devInfo[32] = {};
	if (dsoHTSearchDevice(devInfo) == 0 || devInfo[0] == 0)
		return false;

	g_deviceIndex = 0;
	if (dsoHTDeviceConnect(g_deviceIndex) == 0)
		return false;

	// 初始化硬件
	dsoInitHard(g_deviceIndex);
	// 设置启用通道数
	dsoHTADCCHModGain(g_deviceIndex, 4); // 四通道模式，自行查手册

	dsoHTSetCHAndTrigger(g_deviceIndex, &g_relay, g_control.nTimeDIV); // 200us 时基
	WORD voltDiv[4] = {
		g_relay.nCHVoltDIV[0],
		g_relay.nCHVoltDIV[1],
		g_relay.nCHVoltDIV[2],
		g_relay.nCHVoltDIV[3]
	};
	// 通道位置（垂直位置），默认 128 居中
	WORD chPos[4] = {128, 128, 128, 128};
	dsoHTSetAmpCalibrate(g_deviceIndex, g_control.nCHSet, g_control.nTimeDIV, voltDiv, chPos);

	dsoHTSetSampleRate(g_deviceIndex, 0, &g_relay, &g_control);
	for (int ch = 0; ch < 4; ++ch)
	{
		dsoHTSetCHPos(g_deviceIndex, g_relay.nCHVoltDIV[ch], 128, ch, 4);
	}
	dsoHTSetTrigerMode(g_deviceIndex, 0 /*边沿*/, g_control.nTriggerSlope /*上升沿*/, 0 /*DC耦合*/);
	dsoHTSetVTriggerLevel(g_deviceIndex, 128, 20);
	dsoHTSetRamAndTrigerControl(g_deviceIndex, g_control.nTimeDIV, g_control.nCHSet, g_control.nTriggerSource, 0);

	dsoHTStartCollectData(g_deviceIndex, 0);

	g_sampleRateHz = LookupSampleRateHz(g_control.nTimeDIV, 4);

	g_initialized = true;
	return true;
}


float VoltDivIndexToVolt(int idx)
{
	static const float table[] = {
		0.002f, 0.005f, 0.01f, 0.02f,
		0.05f, 0.1f, 0.2f, 0.5f,
		1.0f, 2.0f, 5.0f, 10.0f
	};
	assert(idx >= 0 && idx <12);
	return table[idx];
}


int GetSingleChannelData(int ch, float* outBuf, int maxLen)
{
	if (!g_initialized || !outBuf || ch < 0 || ch > 3)
		return 0;
	for (int i = 0; i < 100; ++i)
	{
		if ((dsoHTGetState(g_deviceIndex) & 0x02) != 0)
			break;
		Sleep(10);
	}

	dsoHTGetData(g_deviceIndex,
	             g_rawData[0], g_rawData[1], g_rawData[2], g_rawData[3], &g_control);

	int len = std::min<ULONG>(g_control.nReadDataLen, maxLen);
	float voltPerDiv = VoltDivIndexToVolt(g_relay.nCHVoltDIV[ch]);
	float scale = voltPerDiv / 32.0f;

	for (int i = 0; i < len; ++i)
		outBuf[i] = (g_rawData[ch][i] - 128) * scale;

	return len;
}


int GetAllChannelData(int maxLen, float* ch1Data, float* ch2Data, float* ch3Data, float* ch4Data)
{
	if (!g_initialized)
		return 0;

	float* outBufs[4] = {ch1Data, ch2Data, ch3Data, ch4Data};
	// 等待采集完成（最多 100ms 秒）
	for (int i = 0; i < 10; ++i)
	{
		if ((dsoHTGetState(g_deviceIndex) & 0x02) != 0)
			break;
		Sleep(10);
	}


	dsoHTGetData(
		g_deviceIndex,
		g_rawData[0], g_rawData[1], g_rawData[2], g_rawData[3],
		&g_control
	);

	int len = std::min<ULONG>(g_control.nReadDataLen, maxLen);
	int vPos = 128;

	for (int ch = 0; ch < 4; ++ch)
	{
		if (!outBufs[ch]) continue;

		float voltPerDiv = VoltDivIndexToVolt(g_relay.nCHVoltDIV[ch]);
		float scale = voltPerDiv / 32.0f;

		for (int i = 0; i < len; ++i)
		{
			g_srcData[ch][i] = g_rawData[ch][i] - vPos;
			outBufs[ch][i] = g_srcData[ch][i] * scale;
		}
	}

	return len;
}


double GetSampleRate()
{
	return g_sampleRateHz;
}


double LookupSampleRateHz(int timeDivIdx, int channelCount)
{
	// 通道模式：1=单通道，2=双通道，4=四通道
	// 查表SDK_HTHardDll_CHS.pdf 附录表1
	static const double table[36][3] = {
		{1e9, 500e6, 250e6}, // 0: 2ns
		{1e9, 500e6, 250e6}, // 1: 5ns
		{1e9, 500e6, 250e6}, // 2: 10ns
		{1e9, 500e6, 250e6}, // ...
		{1e9, 500e6, 250e6},
		{1e9, 500e6, 250e6},
		{1e9, 500e6, 250e6},
		{1e9, 500e6, 250e6},
		{250e6, 250e6, 250e6}, // 8: 1us
		{125e6, 125e6, 125e6},
		{50e6, 50e6, 50e6},
		{25e6, 25e6, 25e6},
		{12.5e6, 12.5e6, 12.5e6},
		{5e6, 5e6, 5e6},
		{2.5e6, 2.5e6, 2.5e6},
		{1.25e6, 1.25e6, 1.25e6}, // 15: 200us
		{500e3, 500e3, 500e3},
		{250e3, 250e3, 250e3},
		{125e3, 125e3, 125e3},
		{50e3, 50e3, 50e3},
		{25e3, 25e3, 25e3},
		{12.5e3, 12.5e3, 12.5e3},
		{5e3, 5e3, 5e3},
		{2.5e3, 2.5e3, 2.5e3},
		{1.25e3, 1.25e3, 1.25e3},
		{500, 500, 500},
		{250, 250, 250},
		{125, 125, 125},
		{50, 50, 50},
		{25, 25, 25},
		{12.5, 12.5, 12.5},
		{5, 5, 5},
		{2.5, 2.5, 2.5},
		{1.25, 1.25, 1.25},
		{0.5, 0.5, 0.5},
		{0.25, 0.25, 0.25}
	};

	int modeIdx;
	if (channelCount == 1) modeIdx = 0;
	else if (channelCount == 2) modeIdx = 1;
	else modeIdx = 2; // 3/4通道都归入四通道模式

	if (timeDivIdx < 0 || timeDivIdx > 35)
		return 1.25e6; // 默认返回 1.25MSa/s
	return table[timeDivIdx][modeIdx];
}

// ---- 工具：估计单通道频率（short 输入，内部转 double） ----
static double estimate_freq_fftw(const short* s, int N, double fs)
{
	if (N < 16 || fs <= 0.0) return 0.0;

	// 1) 拷贝并加窗（Hann）
	double* in = (double*)fftw_malloc(sizeof(double) * N);
	if (!in) return 0.0;
	for (int i = 0; i < N; ++i)
	{
		double w = 0.5 * (1.0 - cos(2.0 * M_PI * i / (N - 1))); // Hann
		in[i] = (double)s[i] * w;
	}

	// 2) r2c 输出长度 N/2 + 1
	fftw_complex* out = (fftw_complex*)fftw_malloc(sizeof(fftw_complex) * (N / 2 + 1));
	if (!out)
	{
		fftw_free(in);
		return 0.0;
	}

	// 使用多线程
	fftw_init_threads();
	fftw_plan_with_nthreads(4); //四个线程


	fftw_plan plan = fftw_plan_dft_r2c_1d(N, in, out, FFTW_ESTIMATE);
	fftw_execute(plan);

	// 3) 找峰（跳过 DC），并做二次插值
	int k_lo = 1;
	int k_hi = N / 2 - 1; // 留出 k-1, k+1
	if (k_hi <= k_lo)
	{
		fftw_destroy_plan(plan);
		fftw_free(in);
		fftw_free(out);
		return 0.0;
	}

	int k_max = k_lo;
	double mag_max = 0.0;
	auto mag2 = [&](int k)-> double
	{
		double re = out[k][0], im = out[k][1];
		return re * re + im * im; // 用功率，稳定些
	};
	for (int k = k_lo; k <= k_hi; ++k)
	{
		double m = mag2(k);
		if (m > mag_max)
		{
			mag_max = m;
			k_max = k;
		}
	}

	double freq = 0.0;
	if (mag_max > 0.0 && k_max > 0 && k_max < N / 2)
	{
		double a = mag2(k_max - 1);
		double b = mag2(k_max);
		double c = mag2(k_max + 1);
		double denom = (a - 2.0 * b + c);
		double delta = 0.0; // [-0.5, 0.5] 之间
		if (fabs(denom) > 1e-30)
		{
			delta = 0.5 * (a - c) / denom;
			if (delta > 0.5) delta = 0.5;
			if (delta < -0.5) delta = -0.5;
		}
		double k_star = (double)k_max + delta;
		freq = k_star * fs / (double)N;
	}

	fftw_destroy_plan(plan);
	fftw_free(in);
	fftw_free(out);
	fftw_cleanup_threads();
	return freq;
}

// ---- 导出接口：单通道频率 ----
double GetSingleChannelFreq(int ch, double* outFreq)
{
	if (!g_initialized || ch < 0 || ch > 3) return 0.0;

	// 注释是因为可直接使用之前采集过的数据,节约时间
	// // 采集一次（与 GetSingleChannelData 同步逻辑）
	// for (int i = 0; i < 100; ++i)
	// {
	// 	if ((dsoHTGetState(g_deviceIndex) & 0x02) != 0) break;
	// 	Sleep(10);
	// }
	// dsoHTGetData(g_deviceIndex,
	//     g_rawData[0], 
	// 	g_rawData[1], 
	// 	g_rawData[2], 
	// 	g_rawData[3], 
	// 			&g_control);

	const int len = (int)g_control.nReadDataLen;
	const int vPos = 128;
	for (int i = 0; i < len; ++i)
		g_srcData[ch][i] = (short)((int)g_rawData[ch][i] - vPos);

	double f = estimate_freq_fftw(g_srcData[ch], len, g_sampleRateHz);
	if (f <= 0.0)
		f = g_lastFreq[ch]; // 回退
	else
		g_lastFreq[ch] = f;

	if (outFreq) *outFreq = f;
	return f;
}

// ---- 导出接口：四通道频率 ----
int GetAllChannelFreq(double* outFreqs)
{
	if (!g_initialized) return 0;

	// 注释是因为可直接使用之前采集过的数据
	// // 采集一次所有通道
	// for (int i = 0; i < 100; ++i)
	// {
	// 	if ((dsoHTGetState(g_deviceIndex) & 0x02) != 0) break;
	// 	Sleep(10);
	// }
	// dsoHTGetData(g_deviceIndex,
	//     g_rawData[0], 
	// 	g_rawData[1], 
	// 	g_rawData[2], 
	// 	g_rawData[3], 
	// 			&g_control);

	const int len = (int)g_control.nReadDataLen;
	const int vPos = 128;
	for (int ch = 0; ch < 4; ++ch)
	{
		for (int i = 0; i < len; ++i)
			g_srcData[ch][i] = (short)((int)g_rawData[ch][i] - vPos);
	}

	int filled = 0;
	for (int ch = 0; ch < 4; ++ch)
	{
		double f = estimate_freq_fftw(g_srcData[ch], len, g_sampleRateHz);
		if (f <= 0.0)
			f = g_lastFreq[ch];
		else
			g_lastFreq[ch] = f;

		if (outFreqs)
			outFreqs[ch] = f;
		++filled;
	}
	return filled; // 返回处理的通道数
}
//
// int isTriangle(double *val, int len, double slope_eps, double peak_flat_tol, int peak_flat_min_pts, double majority)
// {
// 	DetectorParams p {
// 		slope_eps,
// 		peak_flat_tol,
// 		peak_flat_min_pts,
// 		majority,
// 		4
// 		// 0.02, // slope_eps
// 		// 0.03, // peak_flat_tol
// 		// 3,    // peak_flat_min_pts
// 		// 0.6,  // majority
// 		// 4     // min_seg_len
//
// 	};
// 	std::vector<double> data(val, val + len);
// 	bool result = isTriangleWave(data, p);
// 	return result ? 1 : 0;
// }
