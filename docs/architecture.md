# 系统架构（现有实现）

```text
四通道采集设备
  -> 厂商 HTHardDll/HTSoftDll
  -> 自研 native_cpp/libwave.dll
  -> desktop/src/main/data-provider.ts (Koffi)
  -> desktop/src/main/data-worker.ts (采集/轮询)
  -> desktop/src/main/api.ts (HTTP)
  -> backend/f6.py: POST /wave_check (Flask + Waitress)
  -> Electron IPC/Pinia/Vue/ECharts (显示、报警、记录)
```

Python 原型目录 `algorithm_experiments/` 为独立研发验证代码，不是当前 `/wave_check` 服务入口。

现有服务只接受 `wave` 一路采样。未来 `wave_x`、`wave_y` 双路输入和八边形 Li​​ssajous 识别尚未实现；新增前必须解决同触发、同时钟、等点数采样和时间同步问题。

## 版本风险

原桌面包 `src/native/libwave.dll` 导出 `SearchDevice`；另一份 `libwave.7z` 工程编译品导出 `SetParam` 且未导出 `SearchDevice`。不要覆盖可工作的现有 DLL。应先建立稳定 C ABI 并补齐自动化接口检测。
