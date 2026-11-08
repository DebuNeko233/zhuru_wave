# 项目架构与现有调用链

## 分层

1. **硬件采集**：四通道 HT 系列采集设备，通过厂商 `HTHardDll.dll` 等 SDK 操作。
2. **原生层（C++）**：`libwave.dll` 封装设备发现、参数设置、多通道数据读取与频率估计；相关实验工程包含 FFTW 和三角波规则算法。
3. **桌面主进程/Worker（Electron + TypeScript）**：Koffi FFI 连接 DLL，Worker 轮询数据，向本地 Python 服务发起请求。
4. **HTTP 算法服务（Python）**：Flask `POST /wave_check`，Waitress 默认 `127.0.0.1:5001`。
5. **前端展示（Vue 3 + Pinia + ECharts）**：波形、设备状态、异常提示、报警记录、参数设置。

数据流：采集设备 → DLL → Electron Worker → `POST /wave_check` → `pass_flag/tubiandian_list/err_data_list` → UI。

## 技术资料来源

- `wave - 副本 (2).zip`：Electron 工程，关键文件包括 `src/main/api.ts`、`data-worker.ts`、`data-provider.ts`、`src/renderer/src/store/channelDataStore.ts`。
- `libwave.7z`：独立 Visual Studio C++ DLL 工程和测试工程。
- `trianglewave_detection.zip`：Python 规则方法、数据分析和小型合成波形样本。
- `f6(20261108-120120).py`：实际部署思路对应的 Flask 服务源文件。
- `HT6004BX_SDK.zip`：厂商 DLL、头文件、Demo 和操作/API 手册。
- `60x1.csv` / `60x2.csv`：现场导出的原始幅值采样数据。

## 版本边界

上传的 C++ Release DLL 与桌面包内 `src/native/libwave.dll` **导出函数表不一致**。在实验中发现桌面 DLL 有 `SearchDevice`，另一个 Release DLL 中有 `SetParam`，不能未经 ABI 对照就直接替换。

现有 `/wave_check` 只分析一条 `wave`；新目标中的 XY 八边形联合判定仍是待实现功能。不要把 C++ 的 `triangle.hpp` 或算法实验 `ta.py` 自动视为现役 Flask 算法。
