import numpy as np
from matplotlib import pyplot as plt
from prepare import get_data
import matplotlib

matplotlib.rcParams['font.family'] = ['Times New Roman', 'SimSun']


def estimate_frequency_fft(y, fs):
    n = len(y)
    y = y - np.mean(y)  # 去直流分量
    spectrum = np.fft.rfft(y)
    freqs = np.fft.rfftfreq(n, 1 / fs)
    peak_idx = np.argmax(np.abs(spectrum))
    return freqs[peak_idx]


def plot_spectrum(y, fs, title='频谱图'):
    """
    绘制波形的频谱图
    :param y: 波形数据（1D numpy 数组）
    :param fs: 采样率 (Hz)
    :param title: 图标题
    """
    n = len(y)
    y = y - np.mean(y)  # 去掉直流分量
    fft_vals = np.fft.rfft(y)
    fft_freqs = np.fft.rfftfreq(n, d=1 / fs)
    magnitude = np.abs(fft_vals) / n  # 归一化幅度

    plt.figure(figsize=(10, 4), dpi=300)
    plt.plot(fft_freqs, magnitude)
    plt.title(title)
    plt.xlabel("频率 (Hz)")
    plt.ylabel("幅度")
    plt.grid(True)
    plt.xlim(0, fs / 16)  # 截至 Nyquist 频率
    plt.tight_layout()
    plt.show()


if __name__ == '__main__':
    energy_s = ['60', '80', '120', '150']
    groups = ['x1', 'x2', 'y1', 'y2']

    data_grp: list[str] = []
    for energy in energy_s:
        for group in groups:
            data_grp.append(energy + group)

    # datas = {i:get_data(i)[:12500] for i in data_grp}
    # import pickle
    # with open('datas.dict', 'wb') as f:
    #     pickle.dump(datas, f)
    # exit(0)
    # pickle.load()
    data = get_data('60y2')[:1250000]
    print(f"频率{estimate_frequency_fft(data, 1250000)}Hz，周期 {1 / estimate_frequency_fft(data, 1250000)}S")
    plot_spectrum(data, 1250000)
    # from math import sqrt
    print(max(data), min(data))
