import matplotlib.pyplot as plt
import numpy as np
from scipy import signal
import pandas as pd

# ==== 参数设置 ====
fs = 100         # 采样率（Hz）
f_tri = 1        # 三角波频率（Hz）
duration = 2     # 信号持续时间（秒）

# ==== 生成三角波 ====
t = np.linspace(0, duration, int(fs * duration), endpoint=False)
y = signal.sawtooth(2 * np.pi * f_tri * t, width=0.5)  # 标准对称三角波
y = y[25:(25+100)]
# ==== 写入 CSV，仅电压值 ====
df = pd.DataFrame(y)
df.to_csv('triangle_wave.csv', index=False, header=False)

print(f"✅ 已写入 triangle_wave.csv，共 {len(y)} 个采样点（仅电压值）")
