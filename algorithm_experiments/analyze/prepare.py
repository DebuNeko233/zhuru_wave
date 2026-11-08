import numpy as np
from pandas import read_csv
from pandas import DataFrame


def get_data(s:str) -> list[float]:
    data = read_csv(f"C:\\Users\\Yezih\PycharmProjects\\trianglewave_detection\\analyze\\csv\\{s}.csv")


    data = data[data.keys()[0]][2:]
    data = data.to_numpy().tolist()
    str_data = [ str(i) for i in data]
    real_data = []
    for i in str_data:
        row = i.split('\t')
        float_data = float(row[2])
        real_data.append(float_data)
    return real_data
    # print(max(real_data)/32/1000, min(real_data)/32/10000)

def get_test_data(file_name: str)->list:
    data = read_csv( r'C:\Users\Yezih\PycharmProjects\trianglewave_detection\test_data\\'+ file_name + '.csv', header=None)
    data = np.tile(data[0],10)
    data = data.tolist()
    return data

if __name__ == '__main__':
    datas= ['60x1','60x2', '60y1', '60y2']
    for i in datas:
        data = get_data(i)
        DataFrame(data).to_csv(i + '.csv', index=False)
