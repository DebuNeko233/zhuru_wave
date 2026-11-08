# 整理发现、未修复事项

- 不同来源的 `libwave.dll` 导出接口不一致，不能盲目重新编译替换。
- Electron 单通道 HTTP 检测的网络失败状态可能被 UI 错归类为真实波形告警。
- `data-worker.ts` 和 Pinia 中异常点坐标存在重复缩放风险。
- 峰峰值算法应使用 `max(y) - min(y)`，而非绝对值极差。
- 原 Python 每次请求均创建目录并写入 `document.txt`，高频轮询有 I/O 和重名覆盖风险。
- `save_single_pic_mp` 的 `max_pic_num` 限制的是候选周期遍历，不是实际保存的异常图片数。
- `is_triangle_like` 并未严格检验升降沿线性度，正弦波等可能被误判。
- `split_single_period` 基于零点符号变化，对偏置/触发抖动/噪声敏感。
- `f6.py` 模块级初始化 `ProcessPoolExecutor`，尤其 Windows 冻结/启动模式需复核。
- 双通道李萨如八边形检测尚未实现，不应在 README 中声称支持自动八边形合格判定。
- 原 `desktop` 项目仅保证 Windows 脚本：`npm run dev` 含 `chcp`。尚未在硬件环境做端到端回归。
