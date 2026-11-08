import matplotlib.pyplot as plt

from analyze.prepare import get_data
from scipy.signal import butter, filtfilt
import numpy as np


def butter_lowpass_filtfilt(x, fs, cutoff_hz, order=4):
    """
    x: 1D 信号
    fs: 采样率(Hz)
    cutoff_hz: 截止频率(Hz)
    order: 滤波器阶数(越高滚降越陡，但更易振铃)
    """
    nyq = 0.5 * fs
    wn = cutoff_hz / nyq  # 归一化截止频率(0~1)
    b, a = butter(order, wn, btype='low', analog=False)
    y = filtfilt(b, a, x, method="pad")  # 零相位
    return y

if __name__ == '__main__':
    data = get_data('60x1')[:12500000]
    fs = 1250000
    y = butter_lowpass_filtfilt(data, fs, cutoff_hz=24720, order=4)
    plt.plot(y[400:1000])
    plt.plot(data[400:1000])
    plt.show()