# 导入额外源码包

为保留原始资料之间的分层关系，仓库当前首先上传 `backend/f6.py` 和文档。完整原始桌面工程、C++ 工程和算法实验工程已另行整理为一个**不含厂商 DLL 和现场大数据**的 ZIP 源码包。

源码包包含：
- `desktop/` — Electron + Vue 源代码与必要的 UI 静态资源；
- `native_cpp/` — 自研 Visual Studio C++ 项目（排除闭源厂商头文件/库）；
- `algorithm_experiments/` — 研究用 Python 算法和小型测试样本；
- `backend/f6.py` — 与已提交版本相同的在线检测后端；
- `MANIFEST.json` — 每文件 SHA-256 和来源路径。

源码包本身是单独交付的文件，不代表它已经包含在 GitHub。该包不包括 `HTHardDll.dll`、`HTSoftDll.dll`、`MeasDll.dll`、`libwave.dll` 和现场百万级 CSV。

## 导入方式（Windows PowerShell）

1. 从本次交付资料下载 `zhuru_wave_source_bundle.zip`。
2. 克隆 `https://github.com/DebuNeko233/zhuru_wave.git`。
3. 在仓库目录执行：

```powershell
.\scripts\import-source-bundle.ps1 -ZipPath "C:\Downloads\zhuru_wave_source_bundle.zip"
git status --short
```

4. 审查所有变更及许可证后再执行：

```powershell
git add desktop native_cpp algorithm_experiments SOURCE_BUNDLE_MANIFEST.json
git commit -m "chore: import desktop, native DLL source, and experiment code"
git push origin main
```

**注意**：原始桌面代码中有将用户密码与配置数据明文比较/存储的逻辑，迁移到实际工业现场部署前须审查身份认证与数据存储安全。上述脚本不自动推送，避免未经检查将整个源项目公开。

## 依赖

桌面侧需要 Windows、Node.js/npm、Electron、厂商 DLL、Koffi、原生驱动；C++ 侧需要与 DLL 兼容的 MSVC、FFTW 与厂商 SDK；实验 Python 工程在 `algorithm_experiments/pyproject.toml` 单独定义依赖。不能把这些外部依赖视为已随 ZIP 和 GitHub 全量提供。
