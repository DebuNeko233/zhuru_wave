# zhuru_wave desktop

保留原 Electron/Vue 界面、通道详情的 **导入本地数据**、报警历史和硬件采集入口。

## 启动

Windows：在启动 Python `backend/f6.py` 后运行 `npm ci`、`npm run dev`。离线导入 CSV 不需要打开 HT6004BX 实时采集，但程序的原生依赖及 Electron 构建环境仍需正确安装。

离线回放按照 CSV 文件索引从头逐批显示，2000 点/批，同步等待每次 Python 返回，不丢弃检测结果；波形上的指标属于原始采样单位。当前软件的实时采集线程保持异步设计。点击“快照”可暂停/恢复，检测报警时有短暂停顿。导入结束停留在最后一帧，不自动重连采集。

详细格式与测试见 [`../docs/demo-data.md`](../docs/demo-data.md)。
