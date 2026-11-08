# 离线演示数据与验收

## CSV 规范 `zhuru-wave-v1`

从文件第一行起，固定列为 `meta_key,meta_value,sample_index,X_raw[,Y_raw,...]`。
元数据占最初若干行，仅填写前两列，采样行仅填写索引及各通道的原始码值：

```csv
meta_key,meta_value,sample_index,X_raw
format,zhuru-wave-v1,,
sample_rate_hz,,,
channel_count,1,,
channel_names,X,,
amplitude_unit,raw,,
mode,DEMO,,
scenario,mixed,,
source,60x1.csv,,
,,0,20625.3
,,1,18750.3
,,2,17500.3
```

样本索引从 0 开始，连续、等间隔；多通道行必须**在同一采样时刻**对应。原始码值不是伏特，若不知道采样率就把 `sample_rate_hz` 留空。现场 DRC 风格的 TSV（含三行头部）和历史单列、双列 CSV 也可被现有导入按钮兼容读取。

## 构造演示数据

用 `60x1.csv` 的**未修改现场底稿**叠加用户上传的异常形状模板：

```powershell
python scripts/generate_demo_data.py --source C:\field_data\60x1.csv --templates algorithm_experiments\test_data --output C:\demo
```

生成 `00_正常三角波.csv`、五份单项异常文件、`06_混合异常.csv` 和 `labels.json`。第一份文件的含义是 **未注入模拟缺陷**，并不是经过工艺认证的“绝对正常”样本。生成时不填未知的实际采样率。

`labels.json` 仅用于测试统计，**绝不能发送给 detector 或用于强制触发报警**。

## 实际播放路径

原来的 **通道详情 → 导入本地数据** 按钮不变。顺序读取 2000 点一批，等待每次 Python 检测返回，然后显示该批波形、标记异常并触发旧报警系统；检测服务异常与物理波形报警分开。回放完成后停留在最后一帧，不自动重新启动采集卡。实时采集 Worker 保持原本异步执行策略。

## 本轮可复现结果

对本轮生成数据按 2000 点切窗并实际调用 `backend/detector.py`：

| 数据 | 人工注入区间数 | 命中 | 未匹配事件 |
| --- | ---: | ---: | ---: |
| 未注入底稿 | 0 | — | 0 |
| 毛刺 | 1 | 1 | 0 |
| 削波 | 1 | 1 | 0 |
| 圆顶 | 1 | 1 | 0 |
| 顶峰突降 | 1 | 1 | 0 |
| 零点台阶 | 1 | 1 | 0 |
| 混合异常 | 5 | 4 | 3 |

这不是现场工艺检出率或误报警率；混合样本未匹配的三个事件可能来自原始现场波形已有的扰动，不应直接断言是假阳性。它也揭示现阶段混合异常仍有漏检，需要后续现场采样校准。一次异常横跨两个窗口时会有两个算法事件；前端采用上升沿合并提醒的方式减少重复弹窗。

### 暂未完成的验证

- 实际 Windows HT6004BX 硬件采集、DLL ABI 和完整 Electron 编译/运行。
- 实际 Flask/Waitress 网络端到端联调（当前离线环境缺少这两个 Python 包）。
- 同步 X/Y 现场数据的李萨如八边形阈值标定。
- 现场条件下的误报警、漏检、吞吐、报警延迟和长期运行稳定性。
