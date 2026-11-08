# zhuru_wave

晶圆离子注入机 X/Y 扫描控制波形监测软件：Electron/Vue 桌面端、C++ 采集 DLL、Python 三角波检测服务，以及独立的李萨如轨迹分析模块。

## 目录

| 路径 | 内容 |
| --- | --- |
| `desktop/` | 原 Electron/Vue 程序；保留导入本地数据、报警和实时采集 |
| `backend/` | `f6.py` HTTP 服务及 `detector.py`、`lissajous.py` |
| `native_cpp/` | 原 `libwave` C++ 工程（原生 DLL 版本需核对） |
| `algorithm_experiments/` | 以前的算法实验和异常形状模板，不参与在线接口 |
| `scripts/` | 模拟 CSV 生成及检测回归统计 |
| `docs/` | 数据格式、SDK、已知问题和验收结果 |

## 离线演示

参见 [离线 CSV 和验收](docs/demo-data.md)。使用现有“导入本地数据”入口，分批读取数据并顺序等待 Python 服务；**实际算法检测产生报警，而不是读取注入标签伪造报警**。没有硬件时，仍需要启动 Python 服务与 Electron 桌面端。

## Windows 启动

在 `backend/` 运行 `pip install -r requirements.txt`、`python f6.py`，在 `desktop/` 运行 `npm ci`、`npm run dev`。完整硬件采集需要正确版本的 `libwave.dll` 和厂商 DLL、驱动、真实采集设备；源码工程 `native_cpp/` 与原程序的 DLL 接口存在差异，**不要直接互相替换**。

```powershell
# 后端（一个终端）
cd backend
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python f6.py

# 桌面（第二个终端）
cd desktop
npm ci
npm run dev
```

注意：实时采集路径保留原异步/跳检策略；离线回放执行每一批检测。采样幅值是**原始码值，不是电压**；采样率未知时无法报告实际 Hz。单通道指标包括幅度、周期/频率、斜率/线性度、稳定峰值周期数；双通道实现相位和李萨如轮廓指标，但未标定时返回 `UNVERIFIED`，**暂不作为销售演示或生产合格判定**。

所有数据和检测仅作诊断/演示，不直接控制或联锁离子注入机。真实采集数据、未经许可的 SDK/DLL 不应随公开仓库提交。
