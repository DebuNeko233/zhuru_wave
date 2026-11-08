import numpy as np
from scipy import optimize
import matplotlib.pyplot as plt

# 三角波数据点
x = np.linspace(0, 1, 100)
y = np.abs(2*(x - np.floor(x + 0.5))) + 0.1*np.random.randn(100)

# 定义线性模型
def linear_func(x, a, b):
    return a*x + b

# 最小二乘拟合
params, _ = optimize.curve_fit(linear_func, x, y)
a, b = params

# 计算残差
residuals = y - linear_func(x, a, b)
rmse = np.sqrt(np.mean(residuals**2))
nrmse = rmse / (max(y) - min(y))

import matplotlib.pyplot as plt

plt.figure(figsize=(10, 4))
plt.plot(x, y, 'b.', label='Noisy triangle wave')
plt.plot(x, linear_func(x, a, b), 'r-', label=f'Linear fit: y={a:.2f}x + {b:.2f}')
plt.legend()
plt.title(f'Linear Fit NRMSE = {nrmse:.4f}')
plt.xlabel('x')
plt.ylabel('y')
plt.grid(True)
plt.show()
