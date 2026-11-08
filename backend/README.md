# Flask 波形检测服务

运行：`python -m venv .venv` → 激活环境 → `pip install -r requirements.txt` → `python f6.py`。

接口：`POST http://127.0.0.1:5001/wave_check`。JSON 结构：

```json
{"data": {"wave": [0, 1, 2], "epsilon": 0.2, "step1": 2, "step2": 2, "rate": 0.8, "period_step": 2, "smooth_window": 9, "edge_min_gap": 32, "adaptive_k": 1.0}}
```

**注意**：上面 `wave` 仅演示字段格式，实际调用必须至少 1,000 个点，否则返回应用层 `code: 400`。`epsilon` 要根据原始数据量纲校准。

正常响应：`{ "code":200,"msg":"success","data":{"pass_flag":...,"tubiandian_list":...,"err_data_list":...,"err_pic_path_list":...} }`。

目前每次调用都会创建输出目录并写入 `document.txt`。默认目录为 `C:/picture`，运行前检查权限和磁盘空间；性能、安全性及路径处理还需后续优化。代码中还存在 Windows 多进程启动方式方面的待核查问题。
