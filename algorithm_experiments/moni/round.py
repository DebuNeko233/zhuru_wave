import numpy as np
import matplotlib.pyplot as plt
import matplotlib
from pandas import DataFrame

matplotlib.rcParams['font.family'] = ['Times New Roman', 'SimSun']
# 参数设置
fs = 100  # 采样率
f = 1   # 频率 (Hz)，与示波器上2.58kHz一致
duration = 2 / f  # 显示两个周期
t = np.linspace(0, duration, int(fs * duration), endpoint=False)

# 基本三角波
tri = 2 * np.abs(2 * (f * t % 1) - 1) - 1  # 标准三角波

# 通过卷积或平滑形成圆顶：使用小窗口平滑模拟“钝化”
window_size = int(fs / f * 0.2)  # 一个周期的5%
window = np.hanning(window_size)
window /= window.sum()
rounded_tri = np.convolve(tri, window, mode='same')

# 可视化
plt.figure(figsize=(10, 4))
plt.plot(t * 1000, rounded_tri, label="圆顶三角波")
plt.xlabel("时间 (ms)")
plt.ylabel("幅值")
plt.title("圆顶三角波模拟")
plt.grid(True)
plt.legend()
plt.tight_layout()
plt.show()

rounded_tri = rounded_tri.tolist()
data = DataFrame(rounded_tri[rounded_tri.index(-0.019999999999999987):(75+rounded_tri[75:].index(-0.020000000000000018))])
data.to_csv('圆顶三角波.csv', index=False, header=False)