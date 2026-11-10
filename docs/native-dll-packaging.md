# Windows 免安装包：厂商 DLL 放置与校验

打包入口：在 `desktop/` 下执行 `npm run build:unpack`，它会执行 renderer/main 编译、electron-builder 的 Windows x64 unpacked 打包以及 DLL 校验。

打包前源文件必须完整：

```
desktop/src/native/
  libwave.dll
  HTHardDll.dll
  HTSoftDll.dll
  HTDisplayDll.dll
  MeasDll.dll
```

打包后这五个 DLL 应位于：

```
desktop/dist/win-unpacked/resources/native/
```

注意：它们不在 `win-unpacked/wave.exe` 同级，也不应在 `app.asar` 内。加载代码通过 `process.resourcesPath/native` 查找。

项目使用 `electron-builder.yml` 的 `extraResources` 来复制原生资源，并使用 `build/afterPack.cjs` 在 Windows 打包时补齐缺失/旧版本 DLL、校验 SHA-256。`scripts/check-native-bundle.cjs` 在打包完成后独立核验，缺文件会让 `npm run build:unpack` 失败，而不是输出一个不完整的安装目录。`npm run test:native-pack` 用临时目录测试该行为。

PowerShell 检查命令：

```powershell
cd desktop
Get-ChildItem .\src\native\*.dll
npm run build:unpack
Get-ChildItem .\dist\win-unpacked\resources\native\*.dll
```

若构建程序报告没有源 DLL，请确认在完整仓库、正确目录下构建，而不是只复制 `desktop` 中部分文件；若源 DLL 存在但目标缺失，确认确实使用项目的 `electron-builder.yml`。如果五个 DLL 都存在，依旧报 `Failed to load shared library`，请检查对应 x64 VC++ Redistributable（特别是 `VCRUNTIME140.dll`）、DLL 依赖以及程序架构，缺少的系统运行时不包含在这里。

部署必须保留完整 `win-unpacked` 文件夹，不能只复制 `wave.exe`。
