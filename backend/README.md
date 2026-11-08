# 原始 Python 波形检测后端

`f6.py` 是原始现场后端源码的完整归档，不含人为算法调整。使用 Flask 路由、Waitress 服务和 Matplotlib 绘图，通过多进程保存异常周期图。

## 接口

`POST http://127.0.0.1:5001/wave_check`，请求顶层字段为 `data`：

```json
{
  "data": {
    "wave": [0.0, 1.0, -1.0],
    "epsilon": 0.2,
    "step1": 2,
    "step2": 2,
    "period_step": 2,
    "rate": 0.8,
    "smooth_window": 9,
    "edge_min_gap": 32,
    "adaptive_k": 1.0,
    "auto_params": false,
    "debug_total": false,
    "debug_single": false,
    "save_path": "C:/picture",
    "max_pic_num": 6
  }
}
```

**上面的 wave 数组只展示 JSON 形状，不是可用检测样本。真实请求至少需要 1000 点。**

返回包结构：

```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "pass_flag": false,
    "err_data_list": [],
    "err_pic_path_list": [],
    "tubiandian_list": []
  }
}
```

`tubiandian_list` 为每周期字典组成的列表；键为原序列的采样位置（JSON 中对象键会字符串化），值为差分量，不是实际电压。错误数据和图片列表需要结合服务的保存策略解释。

## 注意

- `f6.py` 仅实现**单通道**检测；当前没有 `wave_check_pair`、八边形拟合或清晰度评估。
- 默认截取请求前 10000 点；不足 1000 点会返回 `code:400` 的 JSON，但 HTTP 状态码仍可能是 200。
- 每次请求都会创建目录、写入 `document.txt`；部分情况下会生成 PNG。
- `ProcessPoolExecutor(max_workers=os.cpu_count())` 在多次请求和 Windows spawn 环境下应谨慎评估。
- `epsilon` 必须与传入幅值域一致；上层是否传入原始码值需要实测。
