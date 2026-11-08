# 波形检测服务

在 `backend/` 下安装环境并启动：

```powershell
py -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python f6.py
```

默认监听 `127.0.0.1:5001`。原有 Electron 接口保持不变：

```http
POST /wave_check
Content-Type: application/json
```

```json
{
  "data": {
    "wave": [0.0, 0.1, 0.2],
    "sample_rate_hz": null,
    "sensitivity": 1.0
  }
}
```

示例仅说明字段格式，实际必须提供至少 256 个有效采样点和足够的完整周期。`sample_rate_hz` 未知时传 `null` 或省略，`frequency_hz` 将返回 `null`；不可根据索引凭空推导 Hz。

成功返回 `code=200`、`data.pass_flag`、`data.defects`、`data.metrics`，也保留旧界面兼容的 `tubiandian_list`、`err_data_list` 和 `err_pic_path_list`（后两者暂为空数组）。突变点坐标是**本次请求中数据窗口的局部采样索引**。检测失败、无有效周期等情况返回 HTTP 400，**不应当作为物理波形警告**。

## 双通道（尚未进入销售演示）

```http
POST /wave_check_pair
```

```json
{"data":{"wave_x":[...],"wave_y":[...],"synchronized":true}}
```

必须是同次、同时钟、同时间索引的同步采样，才能将 `synchronized` 设为 `true`。返回相位差、相位稳定度、轮廓厚度、内部填充率、八边形边数和清晰度。未提供经过现场验证的阈值时，状态是 `UNVERIFIED`，不产生合格/异常结论。只有显式传入完整的候选 `thresholds` 后才评估候选合格规则。

当前检测不会默认绘图、创建时间目录或保存敏感采样数据。`epsilon`、`step1`、`step2`、`rate` 等原接口参数为兼容保留，**不再用作新版检测核心的阈值**；新核心依赖归一化周期特征、鲁棒统计和事件合并。结果仅用于观察和研究，未经现场验证不得作为注入机安全联锁依据。

## 测试

```bash
python -m pytest backend/tests/test_detector.py -q
python scripts/check_demo.py /path/to/generated/demo
```
