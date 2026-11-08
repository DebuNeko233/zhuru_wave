import numpy as np
import matplotlib.pyplot as plt
import matplotlib
matplotlib.rcParams['font.family'] = ['Times New Roman', 'SimSun']

# ----------------------------
# 参数设置
# ----------------------------
fs = 10000           # 采样率（Hz）
f = 250              # 三角波频率
fm = 0               # 幅度调制频率
duration = 0.1      # 信号时长（秒）
N = int(fs * duration)

# ----------------------------
# 生成轻微调幅三角波
# ----------------------------
t = np.arange(N) / fs
triangle = 2 * np.abs(2 * (t * f % 1) - 1) - 1
envelope = 1.0 + 0.3 * np.sin(2 * np.pi * fm * t)  # 正弦包络
signal = triangle * envelope

# 可加入噪声：
#signal += 0.15 * np.random.randn(N)

# ----------------------------
# FFT 分析
# ----------------------------
from scipy.fft import rfft, rfftfreq
window = np.hanning(N)
spectrum = np.abs(rfft(signal * window)) / (N/2)
freqs = rfftfreq(N, d=1/fs)

# 找出基波与3次谐波幅值
base_idx = np.argmax(spectrum[1:]) + 1
base_freq = freqs[base_idx]
third_idx = np.argmin(np.abs(freqs - 3 * base_freq))

A1 = spectrum[base_idx]
A3 = spectrum[third_idx]
ratio = A1 / A3 if A3 != 0 else float('inf')

# ----------------------------
# 判断是否为三角波
# ----------------------------
print(f"基波频率: {base_freq:.2f} Hz")
print(f"基波幅值: {A1:.3f}, 三次谐波幅值: {A3:.3f}")
print(f"幅值比 (A1/A3): {ratio:.2f}")

if 6.0 < ratio < 11.0:
    print("✅ 判定为三角波")
else:
    print("❌ 非三角波")

# ----------------------------
# 绘图
# ----------------------------
plt.figure(figsize=(12, 5))

# 波形图
plt.subplot(1, 2, 1)
plt.plot(t, signal)
plt.title("调幅三角波（时域）")
plt.xlabel("时间 (s)")
plt.ylabel("幅值")
plt.grid(True)

# 频谱图
plt.subplot(1, 2, 2)
plt.plot(freqs, spectrum)
plt.title("频谱（幅度）")
plt.xlabel("频率 (Hz)")
plt.ylabel("幅度")
plt.xlim(0, fs/2)
plt.grid(True)

plt.tight_layout()
plt.show()
