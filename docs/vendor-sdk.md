# 厂商 SDK

附件 `HT6004BX_SDK.zip` 的结构包括：`HeadFiles/`、`HeadFiles_UTF8/`、`Lib/x86|x64/`、`Dll/x86|x64/`、`Code Demo/`、`Manual/`。

关键 API：`dsoHTSearchDevice`, `dsoHTDeviceConnect`, `dsoHTSetSampleRate`, `dsoHTStartCollectData`, `dsoHTGetState`, `dsoHTGetData`。API 详见厂商原始头文件和文档。

SDK 的示例先从 `dsoHTGetData` 拿到 WORD 采样值，示波器显示数值和实际电压换算由参数及后处理确定。导出的 CSV 幅值不是直接以伏特计。

公开仓库默认**不复制**厂商 DLL、LIB、PDF、示例工程及第三方 FFTW 二进制。如果你拥有合法的再分发许可，可单独组织 `vendor/` 并附相应许可；不要把 SDK 提交进 Git 历史再删除。
