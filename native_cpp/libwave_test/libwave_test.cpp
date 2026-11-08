#include <windows.h>
#include <cstdio>
#include <chrono>
#include <fstream>
#include <iostream>
#include <memory>
#include <string>
#include <vector>
#include "wave.h"

int main()
{
	using namespace std;
	using namespace std::chrono;
	FILE* pf;
	fopen_s(&pf, "data.csv", "r");
	// 1. 初始化设备
	// if (!InitDevice()) {
	//     printf("示波器初始化失败！\n");
	//     return -1;
	// }

	// // 2. 获取通道信息
	// ChannelInfo infos[4];
	// int count = 1;// GetChannelInfo(infos);
	// if (count <= 0) {
	//     printf("获取通道信息失败！\n");
	//     return -2;
	// }
	//
	// for (int i = 0; i < count; ++i) {
	//     printf("CH%d:\n", i + 1);
	//     printf("  Frequency: %.2f Hz\n", infos[i].frequency);
	//     printf("  Period:    %.6f s\n", infos[i].period);
	//     printf("  Vpp:       %.3f V\n", infos[i].vpp);
	//     printf("  RMS:       %.3f V\n", infos[i].rms);
	//     printf("---------------------------\n");
	// }


	// 3. 获取采样率
	double sampleRate = GetSampleRate();
	printf("\nSample Rate: %.2fHz\n", sampleRate);

	Sleep(3000);

	// 4.单独获取每个通道的采样数据
	unique_ptr<float> data[MAX_CH_NUM] = {nullptr, nullptr, nullptr, nullptr};
	int len = 0;
	for (int i = 0; i < MAX_CH_NUM; ++i)
	{
		data[i] = make_unique<float>(10000); // 分配足够的空间
		memset(data[i].get(), 0, sizeof(float) * 10000); // 初始化为0
	}

	printf("开始采样\n");
	//len = GetSingleChannelData(0, data[0], 10000);

	//    for (int i = 0; i < len; i++) {
	//        printf("CH1[%d]: %.3f V\n", i, data[0][i]);
	// 	fprintf(pf, "%d,%.3f\n", i, data[0][i]); // 写入CSV文件
	// }
	if (pf != NULL)
		fclose(pf);

	// 5. 获取所有通道的采样数据
	auto start = high_resolution_clock::now();
	///
	len = GetAllChannelData(1000, data[0].get(), data[1].get(), data[2].get(), data[3].get());
	///
	printf("结束采样\n");
	auto end = high_resolution_clock::now();
	duration<double, milli> elapsed = end - start;
	printf("\n获取数据耗时: %.3f ms\n", elapsed.count());

	// for (int i = 0; i < MAX_CH_NUM; ++i) {
	//        if (data[i] == nullptr) continue; // 如果没有数据则跳过
	//        printf("\nCH%d Data Length: %d\n", i + 1, len);
	//        for (int j = 0; j < 10; ++j) {
	//            printf("CH%d[%d]: %.3f V\n", i + 1, j, data[i][j]);
	//        }
	// }

	// 6. 获取所有通道的频率
	double freqs[MAX_CH_NUM] = {0.0};
	start = high_resolution_clock::now();
	int freqCount = GetAllChannelFreq(freqs);
	end = high_resolution_clock::now();
	elapsed = end - start;
	printf("\n获取频率耗时: %.3f ms\n", elapsed.count());
	for (int i = 0; i < freqCount; ++i)
	{
		printf("CH%d Frequency: %.2f Hz\n", i + 1, freqs[i]);
	}


	return 0;
}

// int main()
// {
// 	using namespace std;
// 	vector<double> csv_data;
// 	string filename;
//
// 	cin >> filename;
// 	ifstream file("C:/Users/Yezih/CLionProjects/triangle/csv/" + filename + ".csv", ios_base::in);
// 	if (!file.is_open())
// 	{
// 		cerr << "File could not be opened" << endl;
// 		return 1;
// 	}
// 	string line;
// 	while (getline(file, line))
// 	{
// 		csv_data.push_back(stod(line));
// 	}
// 	file.close();
//
// 	int segs = csv_data.size() / 10000;
// 	int err_num = 0;
//
// 	for (int i = 0; i < segs; i++)
// 	{
// 		int a = isTriangle(csv_data.data() + 10000 * i, 10000, 0.02,0.03,3,0.6);
// 		printf("%d %d\n",i, a);
// 		if (a = 0)
// 		{
// 			err_num++;
// 		}
// 	}
//
// 	if (err_num == 0)
// 	{
// 		printf("OK!");
// 	}
// 	else
// 	{
// 		printf("err_num: %d", err_num);
// 	}
// 	system("pause");
// 	return 0;
// }
