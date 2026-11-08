# zhuru_wave

工业设备三角波监测项目资料与原始实现归档（2026-11-08）。

## 目标

利用多通道示波采集设备获取波形，检测单通道三角波的毛刺、折点、峰谷异常和形状失真；对**同步采集的两路三角波**进行 X-Y 李萨如分析，以**轮廓清晰、内部不过度填充的八边形轨迹**作为目标特征。最终提供实时显示、异常定位、报警与日志。

> **当前状态**：项目尚未完成“双通道八边形联合判定”。`backend/f6.py` 是现场使用的单通道 Flask 检测后端原始版本，并非完整的新算法。仓库内分析文档不代表现场校准或测试通过。

## 已归档

- `backend/f6.py` — 2026-11-08 上传的原始在线检测程序（保持源代码原样）。
- `backend/requirements.txt` / `.env.example` — 运行环境基础说明。
- `docs/architecture.md` — Electron / C++ / Python 数据流与组件关系。
- `docs/algorithm.md` — 现有在线判据、局限与拟扩展方向。
- `docs/data-and-labels.md` — CSV 原始码值格式、现场图像标注及同步数据要求。
- `docs/hardware-sdk.md` — HT6004BX SDK、关键 API 和源程序兼容性注意事项。
- `docs/known-issues.md` — 已发现的待核实问题与后续工作。

## 本地启动 Python 服务

建议 Python 3.12 环境：

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
python f6.py
```

默认监听 `http://127.0.0.1:5001`，提供 `POST /wave_check`。运行前建议配置 `SAVE_PATH` 所在磁盘；原脚本实际从请求参数读取 `save_path`，默认值为 `C:/picture`。Windows 上如果使用进程池，请按实际 CPU 核数和可用内存评估。

## 数据与发布约束

现场 CSV 数值是采集设备导出的**原始幅值**，不能当作实际电压。两份独立导出的单通道 CSV 不等于已同步的 XY 双通道数据；不能仅据它们的散点云认定李萨如失真。原始百万级 CSV、设备现场照片、厂家闭源 DLL、安装包与编译输出不默认纳入公开仓库。SDK 安装和拷贝由设备授权与原供应商许可决定。

目前不宣称支持现场部署、自动识别准确率或李萨如八边形检测通过率。

## 推荐阅读

先看 [架构](docs/architecture.md)、[数据与标注](docs/data-and-labels.md)、[算法](docs/algorithm.md)、[硬件 SDK](docs/hardware-sdk.md) 和 [问题清单](docs/known-issues.md)。
