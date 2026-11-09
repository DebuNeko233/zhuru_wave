/**
 * Resolve libwave.dll and preload its transitive vendor dependencies.
 * Windows can search a different directory for dependent DLLs than the path
 * used for the top-level DLL, so use absolute paths for every vendor library.
 *
 * Actual import chain (x64 PE import tables):
 *   libwave.dll -> HTHardDll.dll -> HTSoftDll.dll
 * libwave.dll additionally imports the Microsoft VC++ runtime VCRUNTIME140.dll.
 */
import { existsSync } from 'node:fs'
import path from 'node:path'

const retainedWaveLibraries = new Map<string, { lib: any; dependencies: any[] }>()

export const WAVE_DLL_LOAD_ORDER = ['HTSoftDll.dll', 'HTHardDll.dll', 'libwave.dll'] as const

export interface NativeWaveLoader {
  load(filename: string): any
}

export function checkNativeWaveFiles(libPath: string): void {
  if (!path.isAbsolute(libPath)) {
    throw new Error(`原生采集 DLL 路径不是绝对路径：${libPath}`)
  }

  const folder = path.dirname(libPath)
  const missing = WAVE_DLL_LOAD_ORDER.filter((filename) =>
    !existsSync(path.join(folder, filename))
  )
  if (missing.length) {
    throw new Error(
      `缺少原生采集组件：${missing.join('、')}。\n` +
      `应存在于：${folder}\n` +
      '打包版请保留 wave.exe 同级的 resources/native 文件夹，不要只复制 exe。'
    )
  }
}

export function loadNativeWaveLibrary(koffi: NativeWaveLoader, libPath: string): {
  lib: any
  dependencies: any[]
} {
  const cached = retainedWaveLibraries.get(libPath)
  if (cached) return cached
  checkNativeWaveFiles(libPath)
  const folder = path.dirname(libPath)
  const loaded: any[] = []

  for (const filename of WAVE_DLL_LOAD_ORDER) {
    const fullPath = path.join(folder, filename)
    try {
      loaded.push(koffi.load(fullPath))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(
        `无法加载 ${filename}：${fullPath}\n` +
        `Windows 错误：${message}\n` +
        '已检查程序自带的 DLL 文件存在。若提示“找不到指定的模块”，' +
        '请检查系统是否安装 Microsoft Visual C++ 2015–2022 Redistributable (x64)，' +
        '尤其是 VCRUNTIME140.dll；也可能是该 DLL 依赖的其他系统组件缺失。',
        { cause: error }
      )
    }
  }

  // Koffi releases libraries when their JS handles are garbage collected.
  // Retain the dependency handles alongside the main DLL for its entire lifetime.
  const handles = { lib: loaded[loaded.length - 1], dependencies: loaded.slice(0, -1) }
  retainedWaveLibraries.set(libPath, handles)
  return handles
}
