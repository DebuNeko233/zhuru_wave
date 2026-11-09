# Windows 打包后原生 DLL 加载诊断

软件打包时 `desktop/electron-builder.yml` 的 `extraResources` 将五个厂商 DLL 放到 `wave.exe` 同级的 `resources/native` 文件夹。

目录结构应类似：

```text
win-unpacked/
  wave.exe
  resources/
    app.asar
    native/
      libwave.dll
      HTHardDll.dll
      HTSoftDll.dll
      HTDisplayDll.dll
      MeasDll.dll
```

**不要只复制 `wave.exe`。** 必须保留整个 `win-unpacked` 目录。此问题不同于 Python 检测服务是否启动。

## 缺依赖为什么表现为“找不到指定的模块”

用 x64 PE 导入表确认了 `libwave.dll` 直接导入 `HTHardDll.dll`，而 `HTHardDll.dll` 又导入 `HTSoftDll.dll`；此外 `libwave.dll` 依赖系统的 `VCRUNTIME140.dll` 和 UCRT。

程序已改成先以绝对路径加载 `HTSoftDll.dll`，再加载 `HTHardDll.dll`，最后加载 `libwave.dll`，且失败时会指出具体文件。

- 如果提示缺少 `resources/native` 内的 DLL：重新执行 `npm run build:unpack`，并检查拷贝了整个目录。
- 如果全部 DLL 存在，但依旧提示 `VCRUNTIME140.dll` / 模块不存在：请检查目标电脑是否安装 **Microsoft Visual C++ 2015–2022 Redistributable (x64)**。请安装微软官方运行库，不要从第三方网站下载单独的 DLL。可使用 [Microsoft 官方最新受支持的 VC++ 运行库文档](https://learn.microsoft.com/en-us/cpp/windows/latest-supported-vc-redist) 获取 x64 安装包。
- 如果运行库齐全仍失败，可用 Microsoft `dumpbin /dependents`、Dependencies.exe 或系统事件日志进一步定位；设备厂家驱动亦可能是后续初始化失败的原因。

PowerShell 核对：

```powershell
cd desktop\dist\win-unpacked
Get-ChildItem .\resources\native\*.dll | Select-Object Name,Length
# 检查 VC++ 运行库（64 位系统目录）
Test-Path "$env:WINDIR\System32\VCRUNTIME140.dll"
```

**测试边界：** 代码已做单元测试，但最终要在用户的 Windows 上完成真实 DLL 及设备联调。
