# 采集设备连接后闪退：采集进程隔离

## 背景

原实现使用 Node.js `worker_threads.Worker` 调用 `koffi` 和厂商 DLL。Worker 线程与 Electron 主进程属于同一 OS 进程：厂商 DLL 访问冲突、驱动异常、原生缓冲区越界等可能使整个程序闪退，JavaScript 的 try/catch 无法捕获操作系统级崩溃。

## 当前架构

```
Electron 主界面/主进程
  └─ Electron utilityProcess（独立 OS 进程）
       └─ data-worker.ts → koffi → HTSoftDll/HTHardDll/libwave → USB 设备
```

`acquisition-process.ts` 统一实现 `postMessage`、`message`、`exit` 和 `terminate`，复用既有业务消息。`data-worker.ts` 通过 `process.parentPort` 接收消息，发送 `library-init-success`/错误/采集数据。原生访问冲突发生时仅采集子进程退出；主进程保留 UI，显示退出码（Windows 访问冲突通常为 0xC0000005），避免错误地报告“波形异常”。

出现异常退出后，自动轮询/重连暂时禁用，需检查设备、驱动后点击首页“连接采集”手动重试。CSV 离线导入、XY 李萨如仍可使用。

## 排障

1. 先在不接设备的情况下启动桌面程序，确认界面可以打开。
2. 连接设备并启动，观察是否弹出“采集进程异常退出 (0x...)”。
3. 如有闪退，打开 **事件查看器 → Windows 日志 → 应用程序**，在崩溃时刻查看 `Faulting module name`、`Exception code`，区分 `HTHardDll.dll`、`libwave.dll`、`usb*.dll` 或其他模块。
4. 检查设备型号、厂商原版驱动、USB 连接和 x64 VC++ 运行库。不要把不明来源 DLL 放入系统目录。
5. 在 `desktop` 执行 `npm run test:acquisition` 和 `npm run build:unpack`；在真实 Windows/硬件环境完成连接、采样、断连、重连测试。

## 已知限制

- 没有连接真实硬件的 Windows 联调环境，本次改造解决**进程隔离与闪退保护**，不能据此判定厂商 SDK 的原生崩溃根因已修复。
- 历史 `data-provider.ts` 仍包含直接在 Electron 主进程加载 DLL 的旧调用入口；自动实时采集不走该旧入口，其他调用应逐步迁移到采集子进程。避免使用旧版 `data:init-device` 等直调 API。
- `native_cpp/libwave` 中存档的旧 `InitDevice()` 接口与 `desktop/src/native/wave.h`（8 参数）不同；不要未核实就用旧源代码覆盖当前 `libwave.dll`。
