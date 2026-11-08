import numpy as np
from matplotlib import pyplot as plt
from pandas import read_csv
from pandas import DataFrame

data = read_csv('test_data/零点台阶三角波.csv', header=None)


plt.plot(data)
plt.grid(True)
plt.show()