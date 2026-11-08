# HT6004BX 采集设备 SDK 记录

原始 SDK 资料包：`HT6004BX_SDK.zip`。内含：
- `HeadFiles/`、`HeadFiles_UTF8/`：C/C++ API 声明；
- `Dll/x64`、`Dll/x86`：厂商 Windows DLL；
- `Lib/x64`、`Lib/x86`：配套链接库；
- `Code Demo/QTDSO`、`VCDSO`、`VBDSO`、`LabView`：示例；
- `Manual/SDK_HTHardDll_CHS.pdf`、`SDK_HTSoftDll_CHS.pdf` 等：接口文档。

厂商 SDK 的闭源 DLL、链接库与手册**未作为本仓库源代码发布**。本项目需要自行获得已授权的设备 SDK，并核对型号/架构/版本。不要把 `HT6004BX_SDK.zip` 与自研 `libwave.7z` 混为一谈。

## 与采集密切相关的 API

```cpp
WORD dsoHTSearchDevice(short* pDevInfo);
WORD dsoHTDeviceConnect(WORD nDeviceIndex);
WORD dsoHTSetSampleRate(WORD nDeviceIndex, WORD nYTFormat,
                        PRELAYCONTROL pRelayControl, PCONTROLDATA pControl);
WORD dsoHTStartCollectData(WORD nDeviceIndex, WORD nStartControl);
WORD dsoHTGetState(WORD nDeviceIndex);
WORD dsoHTGetData(WORD nDeviceIndex, WORD* pCH1Data, WORD* pCH2Data,
                  WORD* pCH3Data, WORD* pCH4Data, PCONTROLDATA pControl);
FLOAT dsoGetSampleRate(WORD DeviceIndex);
```

具体调用条件、参数结构及状态语义以**对应版本 SDK**为准。示例工程 `Code Demo/QTDSO/Hard.cpp` 使用 `dsoHTGetData` 获取多通道 `USHORT` 采样，再调用 `SourceToDisplay` 做显示偏移调整。

## 原始采样和实际电压

源采样码值、显示偏移后的量、以 V 为单位的测量值并不相同。厂商 VCDSO Demo 的注释给出基于电压档位和位置的换算形式；真正的标定应结合通道增益、校准表、探头倍率、耦合模式和采集版本验证。

**先保留原始码值，再另行构造带单位的测量量。** Python 当前规则阈值必须明确标注对应哪个幅值域。

## 联合 XY 所需采集条件

两路必须由**同一次采集**的 `pCH1Data`、`pCH2Data` 等等长数组形成 XY 点对，记录真实采样率、触发状态和通道索引。两次独立单通道导出不可直接构成可信的李萨如判定。
