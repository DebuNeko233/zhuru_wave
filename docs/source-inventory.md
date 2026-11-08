# 原始来源清单与归档边界

该文档列举用户提供的原始附件，便于将现役代码和研究实验代码区分。附件本身不会因写入此文档而自动存在于 GitHub。

| 原始资料 | 类型 | 内容 | 默认公开策略 |
| --- | --- | --- | --- |
| `wave - 副本 (2).zip` | Electron 工程 | Vue 3 UI、TypeScript IPC/Worker、Koffi FFI、构建文件 | 仅源码与必要非敏感资源可公开；`src/native/*.dll` 除外 |
| `libwave.7z` | C++ 工程 | Visual Studio DLL、自研硬件包装、FFTW 接口、测试 | 自研源码可归档；厂商 SDK/FFTW 需独立核对许可 |
| `trianglewave_detection.zip` | Python 实验 | `ta.py`、`triangle_new.py`、`param.py` 等、合成测试 CSV | 仅算法源码与小型合成样本；大体积现场 CSV、字典缓存不直接公开 |
| `f6(20261108-120120).py` | Python HTTP 后端 | `POST /wave_check`，Flask/Waitress，规则检测、绘图 | 源码已归档为 `backend/f6.py` |
| `HT6004BX_SDK.zip` | 第三方厂商 SDK | DLL、LIB、H 头文件、PDF 手册、示例 | 不直接重新分发；以原供应商授权为准 |
| `60x1.csv`, `60x2.csv` | 现场采集 | 每个文件单通道的原始幅值数据、导出头部 | 百万级实测数据不进入公开仓库 |
| 现场示波器图片 | 参考图像 | 四幅异常波形示意、李萨如轨迹示意、末幅正常波形 | 默认不进入公开仓库（设备现场信息） |

## 现状

当前 GitHub 直接提交的是在线 Python 后端及项目技术资料；完整的 Electron 和 Visual Studio 本地源码仍需作为**独立代码导入步骤**处理。不要把本仓库误称为全部原工程已完成上传，也不要把缺失的 DLL 当作可通过 `pip install` 获取。

建议下一次导入时使用 `desktop/`、`native_cpp/`、`algorithm_experiments/` 目录，分别审查 `license`、商业组件依赖、数据保密性以及不同 DLL 的 ABI 匹配。
