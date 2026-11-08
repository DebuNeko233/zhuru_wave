# zhuru_wave — 工业三角波与李萨如轨迹检测

该仓库整理自现有的 Windows 硬件采集、Electron/Vue 桌面监控、Flask 三角波检测服务和 Python 算法实验源码。
**目前已实现的是单通道三角波规则检测；双通道李萨如八边形清晰度判定是下一阶段需求，尚未接入线上服务。**

## 目录

| 路径 | 内容 |
| --- | --- |
| `desktop/` | Electron + Vue 3 + TypeScript 桌面程序，Koffi 调用原生 DLL；保留原始项目构建脚本 |
| `native_cpp/` | C++ `libwave` DLL 和测试工程源码（依赖第三方 SDK） |
| `backend/` | 现场 Flask/Waitress `POST /wave_check` 检测服务 (`f6.py`) |
| `algorithm_experiments/` | Python 算法原型及小型合成波形样本，不参与当前在线服务 |
| `tools/` | 原始 CSV 分析工具（不转换成电压） |
| `docs/` | 系统架构、接口、数据格式、已知问题及 SDK 集成说明 |

## 运行（Windows）

1. **厂商 SDK**：从你所持有的 `HT6004BX_SDK.zip` 按其许可安装对应架构的 DLL、头文件和 LIB。该仓库不再分发厂商二进制。
2. **原生 DLL**：使用 Visual Studio 打开 `native_cpp/libwave.sln`。注意：上传的 C++ 工程与现有桌面 DLL 不是同一导出接口版本，不能直接互换。
3. **Python**：在 `backend/` 中创建虚拟环境，执行 `pip install -r requirements.txt` 后运行 `python f6.py`。默认监听 `127.0.0.1:5001`。
4. **Electron**：在 `desktop/` 执行 `npm ci`，然后在 Windows 上 `npm run dev`。`desktop/src/native/` 需放入适配版本的 `libwave.dll` 和其依赖 DLL，且要先确认运行时 API 导出符号。

系统组件依赖实际采集硬件。缺失 DLL 或设备时不能完成实时采集测试。原 `package.json`、UI 和现有算法保留，整理过程不应被理解为修复了所有已知逻辑问题。

## 检测判据（当前实现）

`f6.py`：过零点分周期、移动平均、一阶差分和差分差、MAD 阈值、尖峰合并。每周期检测到 1–2 个突变点计入通过率；还要求三角波外形票数占比至少 55%。参见 `docs/algorithm.md`。

现场约束：正常单通道信号为干净的三角波；双通道同步采样形成的 XY 李萨如图应有清晰的八边形轨迹。**没有同步时间索引的两个 CSV 不能直接用于可靠的 XY 判定。**

## 原始数据与公开发布

现场 CSV 的 `Value` 是采集/导出程序提供的原始数值，**不能当成 V**。原始现场 CSV、设备照片和数百 MB 的实验 `analyze/csv` 数据不随源码公开提交；请保存在本地 `field_data/`，需要做公开发布前自行确认权限和脱敏。

厂商 SDK、FFTW/第三方二进制及文档需按各自许可取得，详见 `docs/vendor-sdk.md`。本整理项目未额外声明对上传第三方代码或资料的所有权。
