import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { promises as fs, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import icon from '../../resources/img.ico?asset'
import { AcquisitionProcess } from './acquisition-process'
import { checkNativeWaveFiles } from './native-loader'
import { isMainThread } from 'worker_threads'
import path from 'path'
import { WaveCheckRequestOptions } from './type'
import { apiService, getRequest, postRequest } from './api'
// import { rejects } from 'assert';
import { flattenTubiandianList } from './utils'

// 根据环境选择不同的基础目录
const getBaseDir = () => {
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：使用项目根目录
    return path.join(__dirname, '../../..')
  } else {
    // 生产环境：使用可执行文件目录
    try {
      // 确保 app 已经准备好
      if (app.isReady()) {
        return path.dirname(app.getPath('exe'))
      } else {
        // 如果 app 还没准备好，使用 process.execPath 作为备选
        return path.dirname(process.execPath)
      }
    } catch (error) {
      console.error('获取应用路径失败:', error)
      // 备选方案：使用当前工作目录
      return process.cwd()
    }
  }
}

// 延迟初始化路径，确保在 app ready 后
let baseDir: string

let USER_DATA_PATH: string
let USERS_FILE: string

const initializePaths = () => {
  baseDir = getBaseDir()
  USER_DATA_PATH = path.join(baseDir, './user-data')
  USERS_FILE = path.join(USER_DATA_PATH, 'users.json')
}

// const USER_DATA_PATH = path.join(baseDir,"./user-data")
// const USERS_FILE = path.join(USER_DATA_PATH,'users.json')
// const LOG_DATA_PATH = path.join(baseDir,'/logs')

// 全局状态管理
let isDeviceInitialized = false
let isDataCollectionRunning = false
// 数据采集 Worker
let dataWorker: any = null
let dataWorkerReadyPromise: Promise<void> | null = null
let acquisitionNativeCrash = false
let mainWindow: BrowserWindow | null = null
let dataProvider: any = null

// 动态获取 mainDataProvider
async function getMainDataProvider() {
  if (!dataProvider) {
    const { mainDataProvider } = await import('./data-provider')
    dataProvider = mainDataProvider
  }

  return dataProvider
}

async function getDataWorker() {
  if (!dataWorker) {
    // 厂商 DLL 在单独的 OS 工具进程中运行，不共享 Electron 主进程地址空间。
    const libPath = app.isPackaged
      ? path.join(process.resourcesPath, 'native', 'libwave.dll')
      : path.join(__dirname, '../../src/native/libwave.dll')
    // Fail immediately with the missing filename instead of a generic Win32 loader error.
    checkNativeWaveFiles(libPath)

    dataWorker = new AcquisitionProcess(libPath)

    const worker: AcquisitionProcess = dataWorker
    // Wait until the native DLL and its dependencies are actually loaded.
    // This turns a hidden worker initialization failure into an immediate IPC error.
    dataWorkerReadyPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup()
        reject(new Error('原生采集 DLL 初始化超时（8 秒）'))
      }, 8000)
      const onMessage = (message: any) => {
        if (message.type === 'library-init-success') {
          cleanup()
          resolve()
        } else if (message.type === 'library-init-error') {
          cleanup()
          reject(new Error(String(message.error || '原生采集 DLL 初始化失败')))
        }
      }
      const onError = (error: Error) => { cleanup(); reject(error) }
      const onExit = (code: number) => {
        cleanup()
        reject(new Error(`采集 Worker 初始化期间退出（${code}）`))
      }
      function cleanup() {
        clearTimeout(timer)
        worker.off('message', onMessage)
        worker.off('error', onError)
        worker.off('exit', onExit)
      }
      worker.on('message', onMessage)
      worker.on('error', onError)
      worker.on('exit', onExit)
    })

    // 监听 Worker 消息
    dataWorker.on('message', (message: any) => {
      if (message.type === 'device-disconnected') {
        isDataCollectionRunning = false
        isDeviceInitialized = false
      } else if (message.type === 'device-reconnected') {
        isDeviceInitialized = true
      }

      if (mainWindow && !mainWindow.isDestroyed()) {
        if (message.type === 'data' && message.data) {
          mainWindow.webContents.send('data:update', message.data)
        } else if (message.type === 'error' || message.type === 'library-init-error') {
          mainWindow.webContents.send('data:error', message.error)
        } else if (message.type === 'device-disconnected') {
          console.log('设备断开连接')
          mainWindow.webContents.send('device:disconnected', message.message)
        } else if (message.type === 'device-reconnected') {
          console.log('设备重新连接成功')
          mainWindow.webContents.send('device:reconnected', message.message)
        } else if (message.type === 'device-polling-stopped') {
          console.log('设备轮询已停止')
          mainWindow.webContents.send('device:polling-stopped', message.message)
        } else if (message.type === 'device-polling-started') {
          console.log('设备轮询已启动')
          mainWindow.webContents.send('device:polling-started', message.message)
        } else if (message.type === 'device-polling-stop-error') {
          console.log('❌ 停止设备轮询启动失败:', message.error)
          mainWindow.webContents.send('device-polling-stop-error', message.error)
        }
      }
    })

    dataWorker.on('error', (error: Error) => {
      console.log('💥 数据采集 Worker 错误:', error)
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('data:error', error.message)
      }
    })

    dataWorker.on('exit', (code: number) => {
      console.error(`🔚 采集子进程退出，代码: ${code} (0x${(code >>> 0).toString(16)})`)
      if (code !== 0 && dataWorker === worker) acquisitionNativeCrash = true
      if (code !== 0 && dataWorker === worker && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('data:error',
          `采集进程异常退出 (0x${(code >>> 0).toString(16)})，可能是厂商 DLL / USB 驱动发生原生崩溃；已暂停自动重连。`)
      }
      if (dataWorker === worker) {
        dataWorker = null
        dataWorkerReadyPromise = null
      }
      isDataCollectionRunning = false
      isDeviceInitialized = false
    })
  }
  try {
    await dataWorkerReadyPromise
  } catch (error) {
    const failed = dataWorker
    dataWorker = null
    dataWorkerReadyPromise = null
    // Release the failed worker, then permit a clean retry after repair.
    if (failed) await failed.terminate().catch(() => {})
    throw error
  }
  return dataWorker
}

function createWindow(): void {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    title: '智博威视电源波形缺陷检测系统',
    autoHideMenuBar: true,
    icon: icon, // 使用导入的icon变量，适用于所有平台
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (process.env.NODE_ENV === 'development' && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 只在主线程中注册 IPC 处理器
if (isMainThread) {
  // 注册 IPC 处理器
  // 添加文件对话框处理器
  ipcMain.handle('dialog:showOpenDialog', async (_, options) => {
    try {
      const result = await dialog.showOpenDialog(mainWindow!, {
        properties: ['openDirectory'],
        title: '选择目录',
        ...options
      })
      return result
    } catch (error) {
      console.error('打开文件对话框错误:', error)
      throw error
    }
  })

  ipcMain.handle('fs:read-analyze-csv-files', async (_, n: number) => {
    try {
      // 使用安装目录下的 analyze 文件夹
      const analyzeDir = path.join(baseDir, 'analyze')

      // 检查目录是否存在
      if (!existsSync(analyzeDir)) {
        console.warn('analyze目录不存在:', analyzeDir)
        return [[], [], [], []]
      }

      const files = await fs.readdir(analyzeDir)

      // 过滤出CSV文件，取前4个
      const csvFiles = files.filter((file) => file.endsWith('.csv')).slice(0, 4)

      const channelData: number[][] = [] // 明确声明为二维数字数组类型

      for (let i = 0; i < 4; i++) {
        if (i < csvFiles.length) {
          const filePath = path.join(analyzeDir, csvFiles[i])
          console.log(`读取文件: ${csvFiles[i]}`)

          try {
            const content = await fs.readFile(filePath, 'utf8')
            const lines = content.trim().split('\n')
            const numbers: number[] = [] // 明确声明为number数组类型

            for (const line of lines) {
              if (numbers.length >= n) break // 只取前n个数据

              const trimmedLine = line.trim()
              if (!trimmedLine) continue // 跳过空行

              if (trimmedLine.includes(',')) {
                // CSV格式：逗号分隔的数据
                const values = trimmedLine
                  .split(',')
                  .map((v) => parseFloat(v.trim()))
                  .filter((v) => !isNaN(v))
                numbers.push(...values)
              } else {
                // 单个数字
                const value = parseFloat(trimmedLine)
                if (!isNaN(value)) {
                  numbers.push(value)
                }
              }
            }

            const finalData = numbers.slice(0, n) // 确保只有n个数据
            channelData.push(finalData)
            console.log(`文件 ${csvFiles[i]} 读取了 ${finalData.length} 个数据点`)
          } catch (fileError) {
            console.error(`读取文件 ${csvFiles[i]} 失败:`, fileError)
            channelData.push([]) // 读取失败时添加空数组
          }
        } else {
          // 如果CSV文件不足4个，用空数组填充
          channelData.push([])
        }
      }

      console.log(
        'CSV文件读取完成，返回数据:',
        channelData.map((data) => `${data.length}个点`)
      )
      return channelData
    } catch (error) {
      console.error('读取analyze CSV文件失败:', error)
      // 如果读取失败，返回4个空数组
      return [[], [], [], []]
    }
  })

  ipcMain.handle(
    'fs:read-analyze-csv-batch',
    async (
      _,
      options: {
        batchSize: number
        startIndex: number
        channelIndex?: number // 可选：指定读取哪个通道的文件
      }
    ) => {
      try {
        const { batchSize, startIndex, channelIndex } = options

        // 使用安装目录下的 analyze 文件夹
        const analyzeDir = path.join(baseDir, 'analyze')

        // 检查目录是否存在
        if (!existsSync(analyzeDir)) {
          console.warn('analyze目录不存在:', analyzeDir)
          return {
            success: false,
            error: 'analyze目录不存在',
            data: [],
            hasMore: false,
            totalFiles: 0
          }
        }

        const files = await fs.readdir(analyzeDir)
        const csvFiles = files.filter((file) => file.endsWith('.csv')).slice(0, 4)

        if (csvFiles.length === 0) {
          return {
            success: false,
            error: '没有找到CSV文件',
            data: [],
            hasMore: false,
            totalFiles: 0
          }
        }

        // 如果指定了通道索引，只读取该通道的文件
        const targetFiles =
          channelIndex !== undefined ? [csvFiles[channelIndex]].filter(Boolean) : csvFiles

        const batchData: { channelIndex: number; data: number[]; hasMore: boolean }[] = []

        for (let i = 0; i < targetFiles.length; i++) {
          const actualChannelIndex = channelIndex !== undefined ? channelIndex : i
          const fileName = targetFiles[i]

          if (!fileName) continue

          const filePath = path.join(analyzeDir, fileName)

          try {
            const content = await fs.readFile(filePath, 'utf8')
            const lines = content.trim().split('\n')
            const allNumbers: number[] = []

            // 解析所有数据
            for (const line of lines) {
              const trimmedLine = line.trim()
              if (!trimmedLine) continue

              if (trimmedLine.includes(',')) {
                const values = trimmedLine
                  .split(',')
                  .map((v) => parseFloat(v.trim()))
                  .filter((v) => !isNaN(v))
                allNumbers.push(...values)
              } else {
                const value = parseFloat(trimmedLine)
                if (!isNaN(value)) {
                  allNumbers.push(value)
                }
              }
            }

            // 获取指定批次的数据
            const endIndex = startIndex + batchSize
            const batchNumbers = allNumbers.slice(startIndex, endIndex)
            const hasMore = endIndex < allNumbers.length

            batchData.push({
              channelIndex: actualChannelIndex,
              data: batchNumbers,
              hasMore
            })

            console.log(
              `文件 ${fileName} 批次读取: 起始${startIndex}, 大小${batchSize}, 实际获取${batchNumbers.length}个点, 还有更多: ${hasMore}`
            )
          } catch (fileError) {
            console.error(`读取文件 ${fileName} 失败:`, fileError)
            batchData.push({
              channelIndex: actualChannelIndex,
              data: [],
              hasMore: false
            })
          }
        }

        return {
          success: true,
          data: batchData,
          startIndex,
          batchSize,
          totalFiles: csvFiles.length
        }
      } catch (error) {
        console.error('分批读取CSV文件失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
          data: [],
          hasMore: false,
          totalFiles: 0
        }
      }
    }
  )

  ipcMain.handle('config:changeEnerageLevelConfig', async (_, options) => {
    try {
      if (isDataCollectionRunning && dataWorker) {
        dataWorker.postMessage({ cmd: 'changeEnerageLevelConfig', options })
        return { success: true, msg: '配置更新成功' }
      } else {
        return { success: false, error: '数据采集未运行或数据采集线程不存在,本地运行并未收到影响' }
      }
    } catch (error) {
      console.error('更新配置错误:', error)
      return { success: false, error: error instanceof Error ? error.message : '未知错误' }
    }
  })

  // 添加读取图片的API
  ipcMain.handle('read-image', async (_, imagePath: string) => {
    try {
      const buffer = readFileSync(imagePath)
      const base64 = buffer.toString('base64')
      const ext = imagePath.split('.').pop()?.toLowerCase()
      const mimeType =
        ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
      return `data:${mimeType};base64,${base64}`
    } catch (error) {
      console.error('读取图片失败:', error)
      return null
    }
  })

  ipcMain.handle('app:restart', async () => {
    try {
      console.log('🔄 收到应用重启请求')

      // 停止数据采集
      if (isDataCollectionRunning && dataWorker) {
        console.log('🛑 停止数据采集...')
        dataWorker.postMessage({ cmd: 'stop' })
        dataWorker.terminate()
        dataWorker = null
        isDataCollectionRunning = false
      }

      // 重置设备状态
      isDeviceInitialized = false

      console.log('🚀 重启应用程序...')

      // 重启应用
      app.relaunch()
      app.exit(0)

      return { success: true, message: '应用程序正在重启' }
    } catch (error) {
      console.error('💥 重启应用失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  ipcMain.handle('data:init-device', async () => {
    try {
      const provider = await getMainDataProvider()
      const result = provider.initDevice()

      // 只有在初始化成功时才设置标志
      if (result) {
        isDeviceInitialized = true
      } else {
        isDeviceInitialized = false
      }

      return result
    } catch (error) {
      console.error('IPC initDevice error:', error)
      // 确保错误时标志为false
      isDeviceInitialized = false
      throw error
    }
  })

  ipcMain.handle('data:start-device-polling', async (_, options) => {
    if (acquisitionNativeCrash) {
      return { success: false, error: '采集子进程异常退出，自动轮询已暂停；请检查设备后手动重连' }
    }
    console.log('收到启动设备轮询请求: 所获取参数', options)

    try {
      await getDataWorker()

      const startPollingResult = await new Promise<{
        success: boolean
        message?: string
        error?: string
      }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject({ success: false, error: '启动设备轮询超时' })
        }, 10000)

        const handleResponse = (message: any) => {
          if (message.type === 'device-polling-start-success') {
            clearTimeout(timeout)
            dataWorker?.off('message', handleResponse)
            resolve({ success: true, message: message.message })
          } else if (message.type === 'device-polling-start-error') {
            clearTimeout(timeout)
            dataWorker?.off('message', handleResponse)
            reject({ success: false, error: message.error })
          }
        }
        dataWorker?.on('message', handleResponse)

        dataWorker?.postMessage({
          cmd: 'startDevicePolling',
          options: {
            ...options,
            pollingInterval: 3000
          }
        })
      })

      if (startPollingResult.success) {
        isDataCollectionRunning = true
        return { success: true, message: startPollingResult.message }
      } else {
        return { success: false, error: startPollingResult.error }
      }
    } catch (error) {
      console.error('启动设备轮询失败:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  // 停止设备轮询
  ipcMain.handle('data:stop-device-polling', async () => {
    console.log('🛑 收到停止设备轮询请求')
    try {
      if (dataWorker) {
        dataWorker.postMessage({ cmd: 'stopDevicePolling' })
        return { success: true, message: '设备轮询停止请求已发送' }
      } else {
        return { success: true, message: '设备轮询未运行' }
      }
    } catch (error) {
      console.error('💥 停止设备轮询错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  ipcMain.handle('data:get-single-channel', async (_, channelIndex: number, maxLen: number) => {
    try {
      const provider = await getMainDataProvider()
      return provider.getSingleChannelData(channelIndex, maxLen)
    } catch (error) {
      console.error('IPC getSingleChannelData error:', error)
      throw error
    }
  })

  // CSV 回放前检查 Python 服务，不能把连接失败伪装成正常波形。
  ipcMain.handle('data:detector-health', async () => {
    try {
      const status = await getRequest<{ status?: string; service?: string }>(
        '/health', { timeout: 2000 }
      )
      if (status.status === 'ok' && status.service === 'zhuru-wave-detector') {
        return { success: true }
      }
      return { success: false, error: '检测服务版本不匹配' }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      }
    }
  })

  // Analyse only explicitly synchronized, equal-length paired samples.
  // The Python endpoint defaults to UNVERIFIED until field-calibrated thresholds exist.
  ipcMain.handle('data:lissajous', async (_, args: {
    wave_x: number[]; wave_y: number[]; synchronized: boolean
  }) => {
    const x = args?.wave_x
    const y = args?.wave_y
    if (!args?.synchronized || !Array.isArray(x) || !Array.isArray(y) ||
        x.length !== y.length || x.length < 256 || x.length > 4096 ||
        !x.every(Number.isFinite) || !y.every(Number.isFinite)) {
      return { success: false, error: '需要 256–4096 个同批次、严格同步的 X/Y 采样点' }
    }
    try {
      const response = await postRequest<{ code: number; data: unknown; msg?: string }>(
        '/wave_check_pair',
        { data: { wave_x: x, wave_y: y, synchronized: true } },
        { timeout: 8000 }
      )
      return response.code === 200
        ? { success: true, data: response.data }
        : { success: false, error: response.msg || '分析失败' }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  ipcMain.handle('data:isTriangle', async (_, data: WaveCheckRequestOptions) => {
    try {
      const result = await apiService.waveChekFnc({
        wave: data.wave,
        epsilon: data.epsilon,
        save_path: data.save_path,
        debug_total: data.debug_total,
        debug_single: data.debug_single,
        period_step: data.period_step,
        step1: data.step1,
        step2: data.step2,
        rate: data.rate,
        sample_rate_hz: data.sample_rate_hz
      })
      console.log(result)
      if (result.data.err_data_list) {
        console.log('后端返回错误数据', result.data.err_data_list)
      }
      if (result.code === 200) {
        const result_data = result.data
        const diagnosticFields = {
          metricResults: result_data.metric_results,
          cycleMetrics: result_data.cycle_metrics || [],
          peakStableSpans: result_data.peak_stable_spans || [],
          suspectCycles: result_data.suspect_cycles || []
        }
        if (result_data.pass_flag) {
          return {
            success: true,
            isTriangle: true,
            ...diagnosticFields
          }
        } else {
          console.log('tubiandian_list', result_data.tubiandian_list)
          return {
            success: true,
            isTriangle: false,
            err_pic_path_list: result_data.err_pic_path_list,
            err_data_list: result_data.err_data_list,
            defectPoints: flattenTubiandianList(result_data.tubiandian_list),
            defectCycles: result_data.defect_cycles || [],
            ...diagnosticFields,
            defectTypes: [...new Set((result_data.defects || []).flatMap((d: {types: string[]}) => d.types))]
          }
        }
      } else {
        console.log('获取失败,请检查后端连接')
        return { success: false, error: '获取失败,请检查后端连接' }
      }
    } catch (error) {
      console.error('Wave detection service error:', error)
      return { success: false, error: error instanceof Error ? error.message : String(error) }
    }
  })

  ipcMain.handle('data:get-all-channels', async (_, maxLen: number) => {
    try {
      const provider = await getMainDataProvider()
      return provider.getAllChannelData(maxLen)
    } catch (error) {
      console.error('IPC getAllChannelData error:', error)
      throw error
    }
  })

  ipcMain.handle('data:get-sample-rate', async () => {
    try {
      // 如果没有 Worker，创建一个
      await getDataWorker()

      // 使用 Promise 等待 Worker 的采样率响应
      const sampleRate = await new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('获取采样率超时'))
        }, 5000) // 5秒超时

        const messageHandler = (message: any) => {
          if (message.type === 'sample-rate-response') {
            clearTimeout(timeout)
            dataWorker?.off('message', messageHandler)
            resolve(message.sampleRate)
          } else if (message.type === 'sample-rate-error') {
            clearTimeout(timeout)
            dataWorker?.off('message', messageHandler)
            reject(new Error(message.error))
          }
        }

        dataWorker?.on('message', messageHandler)

        // 发送获取采样率命令
        dataWorker?.postMessage({
          cmd: 'getSampleRate'
        })
      })

      console.log('✅ 从 Worker 获取采样率成功:', sampleRate)
      return sampleRate
    } catch (error) {
      console.error('IPC getSampleRate error:', error)
      throw error
    }
  })

  ipcMain.handle('data:lookup-sample-rate', async (_, timeDivIdx: number, channelCount: number) => {
    try {
      const provider = await getMainDataProvider()
      return provider.lookupSampleRateHz(timeDivIdx, channelCount)
    } catch (error) {
      console.error('IPC lookupSampleRateHz error:', error)
      throw error
    }
  })

  ipcMain.handle('data:get-chart-data', async (_, channelIndex: number, maxLen: number) => {
    try {
      const provider = await getMainDataProvider()
      return provider.getChartData(channelIndex, maxLen)
    } catch (error) {
      console.error('IPC getChartData error:', error)
      throw error
    }
  })

  ipcMain.handle('data:run-sample-case', async () => {
    try {
      const provider = await getMainDataProvider()
      return await provider.runSampleCase()
    } catch (error) {
      console.error('IPC runSampleCase error:', error)
      throw error
    }
  })

  // 新增：获取设备状态
  ipcMain.handle('data:get-device-status', async () => {
    return {
      isInitialized: isDeviceInitialized,
      isCollecting: isDataCollectionRunning
    }
  })

  ipcMain.handle('data:setParam', async (_, params) => {
    try {
      const provider = await getMainDataProvider()
      return await provider.setParam(params)
    } catch (error) {
      console.error('设置参数错误:', error)
      throw error
    }
  })
  // 测试用

  // ipcMain.handle('data:start-collection',async(_,options = {}) => {

  //   console.log('收到启动数据采集请求:', options)

  //   try{
  //     // 创建或重用 Worker
  //     if(!dataWorker){
  //       console.log("创建数据采集 Worker")
  //       dataWorker = createDataWorker({workerData: {options}});

  //       // 监听 Worker 消息
  //       dataWorker.on('message',(message:any) => {
  //         if(mainWindow && !mainWindow.isDestroyed()){
  //           if(message.type === 'data' && message.data){
  //             mainWindow.webContents.send('data:update',message.data)
  //           }else if(message.error){
  //             mainWindow.webContents.send('data:error',message.error)
  //           }

  //         }
  //       })

  //       dataWorker.on('error', (error: Error) => {
  //         console.log("数据采集 Worker 错误:", error)
  //         if(mainWindow && !mainWindow.isDestroyed()){
  //           mainWindow.webContents.send('data:error',error.message)
  //         }
  //       })
  //       dataWorker.on('exit', (code: number, _: string) => {
  //         console.log(`数据采集 Worker 退出，退出码: ${code}`)
  //         dataWorker = null
  //         isDataCollectionRunning = false
  //       })
  //     }
  //     dataWorker.postMessage({
  //       cmd: 'start',
  //       options: {
  //         interval: options.interval || 1000,
  //         maxLen: options.maxLen || 10000,
  //         targetLength: options.targetLength || 1000,
  //         slope_sym_thresh: options.slope_sym_thresh || 0.05,
  //         rmse_thresh: options.rmse_thresh || 0.03,
  //       }
  //     })
  //     isDataCollectionRunning = true
  //     console.log('数据采集已启动')

  //     return {success:true,message: '数据采集已启动'};
  //   }catch(error){
  //     console.error('启动数据采集错误:', error)
  //     return {success:false,error: error instanceof Error ? error.message : '未知错误'}
  //   }
  // })

  // ipcMain.handle('data:start-collection',async(_,options = {}) => {
  //   console.log('收到启动数据采集请求:', options)
  //   console.log('channels',options.device.channels)
  //   try{
  //     const provider = await getMainDataProvider();
  //       // 先修改参数
  //     await provider.setParam(options.device);
  //     // 只有在设备未初始化时才初始化
  //     if(!isDeviceInitialized){
  //       console.log("开始初始化设备")
  //       const initResult = await provider.initDevice();
  //       if(!initResult){
  //         throw new Error("设备初始化失败")
  //       }
  //       isDeviceInitialized  = true;
  //       console.log("设备初始化成功")
  //     }else{
  //       console.log("设备已初始化，跳过初始化")
  //     }
  //     // 如果数据采集已在运行，先停止
  //     if(isDataCollectionRunning && dataWorker){
  //       console.log('停止现有的数据采集...')
  //       dataWorker.postMessage({ cmd: 'stop' })
  //       isDataCollectionRunning = false
  //     }

  //     // 创建或重用 Worker
  //     if(!dataWorker){
  //       console.log("创建数据采集 Worker")
  //       dataWorker = createDataWorker({workerData: {options}});

  //       // 监听 Worker 消息
  //       dataWorker.on('message',(message:any) => {
  //         if(mainWindow && !mainWindow.isDestroyed()){
  //           if(message.type === 'data' && message.data){
  //             mainWindow.webContents.send('data:update',message.data)
  //           }else if(message.error){
  //             mainWindow.webContents.send('data:error',message.error)
  //           }

  //         }
  //       })

  //       dataWorker.on('error', (error: Error) => {
  //         console.log("数据采集 Worker 错误:", error)
  //         if(mainWindow && !mainWindow.isDestroyed()){
  //           mainWindow.webContents.send('data:error',error.message)
  //         }
  //       })
  //       dataWorker.on('exit', (code: number, _: string) => {
  //         console.log(`数据采集 Worker 退出，退出码: ${code}`)
  //         dataWorker = null
  //         isDataCollectionRunning = false
  //       })
  //     }
  //     dataWorker.postMessage({
  //       cmd: 'start',
  //       options: options
  //     })
  //     isDataCollectionRunning = true
  //     console.log('数据采集已启动')

  //     return {success:true,message: '数据采集已启动'};
  //   }catch(error){
  //     console.error('启动数据采集错误:', error)
  //     return {success:false,error: error instanceof Error ? error.message : '未知错误'}
  //   }
  // })

  // ipcMain.handle('data:stop-collection',async () => {
  //   try{
  //     if(dataWorker){
  //       dataWorker.postMessage({
  //         cmd: 'stop'
  //       })

  //       // 等待Worker正常退出
  //       await new Promise(resolve => setTimeout(resolve, 1000))
  //       // 强制终止Worker
  //       dataWorker.terminate()
  //       dataWorker = null
  //     }

  //     // 注意：不要重置设备初始化状态，除非确实需要重新初始化设备
  //     isDataCollectionRunning = false

  //     console.log('数据采集已停止，设备初始化状态已重置')

  //     return {success:true}
  //   }catch(error){
  //       console.error('停止数据采集错误:', error)
  //       return { success: false, error: error instanceof Error ? error.message : '未知错误' }
  //     }
  // })

  // 新增：专门的设备初始化处理器
  // ipcMain.handle('data:initialize-device', async (_, deviceSettings) => {
  //   console.log('🔧 收到设备初始化请求:', deviceSettings)
  //   try {
  //     const provider = await getMainDataProvider();

  //     // 如果有正在运行的 Worker 线程，先终止它
  //     if (dataWorker) {
  //       console.log('🛑 终止现有的 Worker 线程以确保状态同步...')
  //       if(isDataCollectionRunning){
  //         dataWorker.postMessage({ cmd: 'stop' })
  //       }
  //       dataWorker.terminate()
  //       dataWorker = null
  //       await new Promise(resolve => setTimeout(resolve, 500))
  //       isDataCollectionRunning = false
  //     }

  //     // 初始化设备
  //     console.log('🔌 开始初始化设备...')
  //     const initResult = await provider.initDevice(deviceSettings);

  //     if (initResult) {
  //       isDeviceInitialized = true;
  //       console.log('✅ 设备初始化成功')
  //       return { success: true, message: '设备初始化成功' };
  //     } else {
  //       isDeviceInitialized = false;
  //       console.log('❌ 设备初始化失败')
  //       return { success: false, message: '设备初始化失败' };
  //     }
  //   } catch (error) {
  //     console.error('💥 设备初始化错误:', error)
  //     isDeviceInitialized = false;
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : '未知错误'
  //     };
  //   }
  // })

  ipcMain.handle('data:initialize-device', async (_, options) => {
    // Explicit initialization permits a retry after a previous native crash.
    acquisitionNativeCrash = false
    try {
      // 创建或重用 Worker
      await getDataWorker()

      // 初始化设备
      console.log('🔌 开始初始化设备...')

      // 使用 Promise 等待 Worker 的初始化响应
      const initResult = await new Promise<{ success: boolean; message?: string; error?: string }>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('设备初始化超时'))
          }, 10000) // 10秒超时

          const messageHandler = (message: any) => {
            if (message.type === 'init-success') {
              clearTimeout(timeout)
              dataWorker?.off('message', messageHandler)
              resolve({ success: true, message: message.message })
            } else if (message.type === 'init-error') {
              clearTimeout(timeout)
              dataWorker?.off('message', messageHandler)
              resolve({ success: false, error: message.error })
            }
          }

          dataWorker?.on('message', messageHandler)

          // 发送初始化命令
          setTimeout(() => {
            console.log('Main: 发送 initDevice 命令到 Worker')
            dataWorker?.postMessage({
              cmd: 'initDevice',
              options: options
            })
          }, 100)
        }
      )

      if (initResult.success) {
        isDeviceInitialized = true
        return { success: true, message: initResult.message }
      } else {
        isDeviceInitialized = false
        console.error('💥 设备初始化失败:', initResult.error)
        return { success: false, error: initResult.error }
      }
    } catch (error) {
      console.error('💥 设备初始化错误:', error)
      isDeviceInitialized = false
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  // 重新创建 Worker 并初始化设备的处理器
  ipcMain.handle('data:reinitialize-device-with-new-worker', async (_, options) => {
    acquisitionNativeCrash = false
    try {
      // 先终止现有的 Worker 以确保状态同步
      if (dataWorker) {
        console.log('🔄 终止现有 Worker 线程')
        await dataWorker.terminate()
        dataWorker = null
        isDataCollectionRunning = false
        isDeviceInitialized = false
      }

      // 使用统一创建入口，复用 DLL 路径和消息/错误事件监听器。
      console.log('🔧 创建新的数据采集 Worker')
      await getDataWorker()

      // 初始化设备并等待响应
      console.log('🔌 在新 Worker 中初始化设备...')

      // 使用 Promise 等待 Worker 的初始化响应
      const initResult = await new Promise<{ success: boolean; message?: string; error?: string }>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('设备初始化超时'))
          }, 10000) // 10秒超时

          const messageHandler = (message: any) => {
            if (message.type === 'init-success') {
              clearTimeout(timeout)
              dataWorker?.off('message', messageHandler)
              resolve({ success: true, message: '设备初始化成功' })
            } else if (message.type === 'init-error') {
              clearTimeout(timeout)
              dataWorker?.off('message', messageHandler)
              resolve({ success: false, error: message.error })
            }
          }

          dataWorker?.on('message', messageHandler)

          // 发送初始化命令
          dataWorker?.postMessage({
            cmd: 'initDevice',
            options: options
          })
        }
      )

      if (initResult.success) {
        isDeviceInitialized = true
        console.log('✅ 新 Worker 中设备初始化成功')
        return { success: true, message: initResult.message }
      } else {
        isDeviceInitialized = false
        console.error('💥 新 Worker 中设备初始化失败:', initResult.error)
        return { success: false, error: initResult.error }
      }
    } catch (error) {
      console.error('💥 重新创建 Worker 并初始化设备错误:', error)
      isDeviceInitialized = false
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  // 数据采集处理器
  ipcMain.handle('data:start-collection', async (_, options = {}) => {
    console.log('🚀 收到启动数据采集请求:', options)
    try {
      // 创建或重用 Worker
      await getDataWorker()

      // 启动数据采集
      console.log('🚀 启动数据采集...')

      const startResult = await new Promise<{ success: boolean; message?: string; error?: string }>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('数据采集启动超时'))
          }, 10000) // 10秒超时

          const messageHandler = (message: any) => {
            if (message.type === 'start-success') {
              clearTimeout(timeout)
              dataWorker?.off('message', messageHandler)
              resolve({ success: true, message: '数据采集启动成功' })
            } else if (message.type === 'start-error') {
              clearTimeout(timeout)
              dataWorker?.off('message', messageHandler)
              resolve({ success: false, error: message.error })
            }
          }

          dataWorker?.on('message', messageHandler)

          dataWorker.postMessage({
            cmd: 'start',
            options: options
          })
        }
      )

      if (startResult.success) {
        isDataCollectionRunning = true
        return { success: true, message: startResult.message }
      } else {
        return { success: false, error: startResult.error }
      }
    } catch (error) {
      console.error('💥 启动数据采集错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  // 新增：停止数据采集处理器
  ipcMain.handle('data:stop-collection', async () => {
    console.log('🛑 收到停止数据采集请求')
    try {
      if (isDataCollectionRunning && dataWorker) {
        const stopResult = await new Promise<{
          success: boolean
          message?: string
          error?: string
        }>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('数据采集停止超时'))
          }, 10000) // 10秒超时

          const messageHandler = (message: any) => {
            if (message.type === 'stop-success') {
              clearTimeout(timeout)
              dataWorker?.off('message', messageHandler)
              resolve({ success: true, message: '数据采集停止成功' })
            } else if (message.type === 'stop-error') {
              clearTimeout(timeout)
              dataWorker?.off('message', messageHandler)
              resolve({ success: false, error: message.error })
            }
          }

          dataWorker?.on('message', messageHandler)

          dataWorker.postMessage({ cmd: 'stop' })
        })

        if (stopResult.success) {
          isDataCollectionRunning = false
          return { success: true, message: stopResult.message }
        } else {
          return { success: false, error: stopResult.error }
        }
      } else {
        console.log('ℹ️ 数据采集未运行')
        return { success: true, message: '数据采集未运行' }
      }
    } catch (error) {
      console.error('💥 停止数据采集错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  // 新增：重置设备处理器
  ipcMain.handle('data:reset-device', async () => {
    console.log('🔄 收到重置设备请求')
    try {
      // 先停止数据采集
      if (isDataCollectionRunning && dataWorker) {
        dataWorker.postMessage({ cmd: 'stop' })
        isDataCollectionRunning = false
      }

      console.log('✅ 设备已重置')
      return { success: true, message: '设备已重置' }
    } catch (error) {
      console.error('💥 重置设备错误:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      }
    }
  })

  ipcMain.handle('data:deinit-device', async () => {
    try {
      isDeviceInitialized = false
      return { success: true, message: '设备去初始化成功' }
    } catch (error) {
      console.error('IPC deinitDevice error:', error)
      return { success: false, message: error instanceof Error ? error.message : '未知错误' }
    }
  })

  ipcMain.handle(
    'fs:read-alarm-files',
    async (_, folderPath: string, page: number = 1, pageSize: number = 10) => {
      try {
        // 将相对路径转化为绝对路径
        // 简化版本
        // 修正路径拼接逻辑

        const absolutePath = (() => {
          // 如果已经是绝对路径（包含盘符如 C: 或网络路径），直接使用
          if (folderPath.includes(':') || folderPath.startsWith('\\\\')) {
            return folderPath
          }

          // 处理相对路径：移除开头的 ./ 或 .\\
          let cleanPath = folderPath
          if (cleanPath.startsWith('./') || cleanPath.startsWith('.\\')) {
            cleanPath = cleanPath.substring(2)
          } else if (cleanPath === '.') {
            cleanPath = ''
          }

          // 与用户主目录拼接
          return join(baseDir, cleanPath)
        })()

        await fs.mkdir(absolutePath, { recursive: true })

        const files = await fs.readdir(absolutePath)

        const alarmFiles: any[] = []

        let todayCount = 0 // 当日的报警统计
        let currentMonthCount = 0 // 当前月份的报警统计

        // 获取当前月份的开始和结束时间
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        const monthStart = new Date(currentYear, currentMonth, 1).getTime()
        const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime()

        now.setHours(0, 0, 0, 0)
        const todayStart = now.getTime()
        const todayEnd = todayStart + 24 * 60 * 60 * 1000

        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = join(absolutePath, file)
            const stats = await fs.stat(filePath)
            const fileTime = stats.mtime.getTime()
            alarmFiles.push({
              name: file,
              path: filePath,
              mtime: stats.mtime.getTime()
            })
            // 统计当前月份的报警数量（根据文件修改时间）
            if (fileTime >= monthStart && fileTime <= monthEnd) {
              currentMonthCount++
            }
            // 统计当天的报警数量（根据文件修改时间）
            if (fileTime >= todayStart && fileTime < todayEnd) {
              todayCount++
            }
          }
        }
        // 按修改时间排序，最新的在前
        alarmFiles.sort((a, b) => b.mtime - a.mtime)

        // 计算分页
        const totalCount = alarmFiles.length
        const totalPages = Math.ceil(totalCount / pageSize)
        const startIndex = (page - 1) * pageSize
        const endIndex = startIndex + pageSize
        const paginatedFiles = alarmFiles.slice(startIndex, endIndex)

        // 读取分页的内容
        const alarmData: any[] = []
        for (const fileInfo of paginatedFiles) {
          try {
            const content = await fs.readFile(fileInfo.path, 'utf-8')
            const data = JSON.parse(content)
            alarmData.push({
              ...data,
              fileName: fileInfo.name,
              filePath: fileInfo.path,
              fileModified: fileInfo.mtime
            })
          } catch (parseError) {
            console.error(`解析文件 ${fileInfo.name} 失败:`, parseError)
          }
        }
        return {
          success: true,
          data: alarmData,
          pagination: {
            currentPage: page,
            pageSize: pageSize,
            totalCount: totalCount,
            totalPages: totalPages,
            hasNext: page < totalPages,
            hasPrevious: page > 1,
            MonthCount: currentMonthCount,
            todayCount: todayCount
          }
        }
      } catch (error) {
        console.log('读取报警文件失败:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
          data: [],
          pagination: {
            currentPage: page,
            pageSize: pageSize,
            totalCount: 0,
            totalPages: 0,
            hasNext: false,
            hasPrevious: false
          }
        }
      }
    }
  )

  ipcMain.handle(
    'fs:save-alarm-file',
    async (_, folderPath: string, fileName: string, data: any) => {
      try {
        // 将相对路径转化为绝对路径
        // 修正路径拼接逻辑
        const absolutePath = (() => {
          // 如果已经是绝对路径（包含盘符如 C: 或网络路径），直接使用
          if (folderPath.includes(':') || folderPath.startsWith('\\\\')) {
            return folderPath
          }

          // 处理相对路径：移除开头的 ./ 或 .\\
          let cleanPath = folderPath
          if (cleanPath.startsWith('./') || cleanPath.startsWith('.\\')) {
            cleanPath = cleanPath.substring(2)
          } else if (cleanPath === '.') {
            cleanPath = ''
          }

          // 与用户主目录拼接
          return join(baseDir, cleanPath)
        })()

        await fs.mkdir(absolutePath, { recursive: true })

        const filePath = join(absolutePath, fileName)

        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8')

        return { success: true, message: '文件保存成功', filePath: filePath }
      } catch (error) {
        console.log('保存报警文件错误:', error)
        return {
          success: false,
          error: error instanceof Error ? error.message : '未知错误'
        }
      }
    }
  )

  ipcMain.handle('fs:delete-alarm-file', async (_, filePath: string) => {
    try {
      await fs.unlink(filePath)
      return { success: true, message: '文件删除成功', filePath: filePath }
    } catch (error) {
      console.log('删除报警文件错误:', error)
      return {
        success: false,
        message: '文件删除失败'
      }
    }
  })

  ipcMain.handle('fs:ensureDir', async (_, folderPath: string, dirPath: string) => {
    const fullPath = join(folderPath, dirPath)
    await fs.mkdir(fullPath, { recursive: true })
    return true
  })

  ipcMain.handle('fs:fileExists', async (_, folderPath: string, filePath: string) => {
    const fullPath = join(folderPath, filePath)
    try {
      await fs.access(fullPath)
      return true
    } catch {
      return false
    }
  })

  ipcMain.handle(
    'fs:appendFile',
    async (_, fileFolder: string, filePath: string, content: string) => {
      const fullPath = join(fileFolder, filePath)
      await fs.appendFile(fullPath, content, 'utf8')
      return true
    }
  )

  ipcMain.handle(
    'fs:writeFile',
    async (_, fileFolder: string, filePath: string, content: string) => {
      const fullPath = join(fileFolder, filePath)
      const utf8BOM = '\uFEFF'
      await fs.writeFile(fullPath, utf8BOM + content, 'utf8')
      return true
    }
  )

  ipcMain.handle(
    'fs:writeCSVFile',
    async (_, fileFolder: string, filePath: string, content: string) => {
      const fullPath = join(fileFolder, filePath)
      // UTF-8 BOM + 内容
      const buffer = Buffer.concat([
        Buffer.from([0xef, 0xbb, 0xbf]), // UTF-8 BOM
        Buffer.from(content, 'utf8')
      ])
      await fs.writeFile(fullPath, buffer)
      return true
    }
  )

  ipcMain.handle(
    'fs:appendCSVFile',
    async (_, fileFolder: string, filePath: string, content: string) => {
      const fullPath = join(fileFolder, filePath)
      const buffer = Buffer.from(content, 'utf8')
      await fs.appendFile(fullPath, buffer)
      return true
    }
  )

  ipcMain.handle('fs:readFile', async (_, fileFolder: string, filePath: string) => {
    const fullPath = join(fileFolder, filePath)
    const content = await fs.readFile(fullPath, 'utf8')
    return content
  })

  ipcMain.handle('fs:cleanupOldLogs', async (_, fileFolder: string, cutoffDate: string) => {
    const cutoff = new Date(cutoffDate)
    try {
      const years = await fs.readdir(fileFolder)
      for (const year of years) {
        const yearPath = join(fileFolder, year)
        const months = await fs.readdir(yearPath)
        for (const month of months) {
          const monthPath = join(yearPath, month)
          const files = await fs.readdir(monthPath)
          for (const file of files) {
            if (file.endsWith('.csv')) {
              const filePath = join(monthPath, file)
              const stats = await fs.stat(filePath)
              if (stats.mtime < cutoff) {
                await fs.unlink(filePath)
                console.log(`删除旧日志文件: ${filePath}`)
              }
            }
          }
          // 如果月份文件夹为空，删除它
          const remainingFiles = await fs.readdir(monthPath)
          if (remainingFiles.length === 0) {
            await fs.rmdir(monthPath)
          }
        }
        // 如果年份文件夹为空，删除它
        const remainingFiles = await fs.readdir(yearPath)
        if (remainingFiles.length === 0) {
          await fs.rmdir(yearPath)
        }
      }
    } catch (error) {
      console.log('删除旧日志文件错误:', error)
    }
    return true
  })

  // 添加新用户
  ipcMain.handle('user:add-user', async (_, userData) => {
    try {
      // 确保用户数据目录存在
      await fs.mkdir(USER_DATA_PATH, { recursive: true })

      let profiles = {}

      if (existsSync(USERS_FILE)) {
        const data = await fs.readFile(USERS_FILE, 'utf8')
        profiles = JSON.parse(data)
      }

      // 检查用户名是否已存在
      for (const userId in profiles) {
        if (profiles[userId].username === userData.username) {
          return {
            success: false,
            message: '用户名已存在，请选择其他用户名'
          }
        }
      }

      // 检查邮箱是否已存在
      for (const userId in profiles) {
        if (profiles[userId].email === userData.email) {
          return {
            success: false,
            message: '邮箱已被使用，请使用其他邮箱'
          }
        }
      }

      // 验证必填字段
      if (!userData.username || !userData.email || !userData.password) {
        return {
          success: false,
          message: '用户名、邮箱和密码为必填项'
        }
      }

      // 创建新用户对象
      const newUser = {
        id: userData.id || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        username: userData.username,
        password: userData.password,
        email: userData.email,
        avatar: userData.avatar || 'default',
        phone: userData.phone || '',
        department: userData.department || '',
        role: userData.role || 'user',
        lastLoginTime: null
      }

      // 保存新用户到文件
      profiles[newUser.id] = newUser
      await fs.writeFile(USERS_FILE, JSON.stringify(profiles, null, 2))

      console.log('新用户添加成功:', newUser.username)
      return {
        success: true,
        message: '用户添加成功',
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role
        }
      }
    } catch (error: any) {
      console.error('添加用户失败:', error)
      return {
        success: false,
        message: '添加用户失败: ' + error.message
      }
    }
  })

  // 获取所有用户列表
  ipcMain.handle('user:get-all-users', async () => {
    try {
      if (!existsSync(USERS_FILE)) {
        return { success: true, users: [] }
      }

      const data = await fs.readFile(USERS_FILE, 'utf8')
      const profiles = JSON.parse(data)

      // 转换为数组格式，并移除敏感信息（如密码）
      const users = Object.values(profiles).map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        department: user.department,
        role: user.role,
        avatar: user.avatar,
        createdAt: user.createdAt,
        lastLoginTime: user.lastLoginTime
      }))

      return { success: true, users }
    } catch (error: any) {
      console.error('获取用户列表失败:', error)
      return {
        success: false,
        message: '获取用户列表失败: ' + error.message,
        users: []
      }
    }
  })

  // 删除用户
  ipcMain.handle('user:delete-user', async (_, userId) => {
    try {
      if (!existsSync(USERS_FILE)) {
        return {
          success: false,
          message: '用户文件不存在'
        }
      }

      const data = await fs.readFile(USERS_FILE, 'utf8')
      const profiles = JSON.parse(data)

      if (!profiles[userId]) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      // 检查是否为管理员用户（可选的安全检查）
      if (profiles[userId].role === 'admin') {
        // 检查是否还有其他管理员
        const adminCount = Object.values(profiles).filter(
          (user: any) => user.role === 'admin'
        ).length
        if (adminCount <= 1) {
          return {
            success: false,
            message: '不能删除最后一个管理员用户'
          }
        }
      }

      const deletedUser = profiles[userId]
      delete profiles[userId]

      await fs.writeFile(USERS_FILE, JSON.stringify(profiles, null, 2))

      console.log('用户删除成功:', deletedUser.username)
      return {
        success: true,
        message: '用户删除成功',
        deletedUser: {
          id: deletedUser.id,
          username: deletedUser.username
        }
      }
    } catch (error: any) {
      console.error('删除用户失败:', error)
      return {
        success: false,
        message: '删除用户失败: ' + error.message
      }
    }
  })

  // 验证用户密码
  ipcMain.handle('user:verify-password', async (_, { userId, password }) => {
    try {
      if (!existsSync(USERS_FILE)) {
        return {
          success: false,
          message: '用户数据文件不存在'
        }
      }

      const data = await fs.readFile(USERS_FILE, 'utf8')
      const profiles = JSON.parse(data)

      // 查找用户
      if (!profiles[userId]) {
        return {
          success: false,
          message: '用户不存在'
        }
      }

      // 验证密码
      if (profiles[userId].password === password) {
        return {
          success: true,
          message: '密码验证成功'
        }
      } else {
        return {
          success: false,
          message: '密码不正确'
        }
      }
    } catch (error) {
      console.error('密码验证失败:', error)
      return {
        success: false,
        message: '密码验证过程中发生错误'
      }
    }
  })

  // 修改用户密码
  ipcMain.handle(
    'user:change-password',
    async (_, { userId, username, currentPassword, newPassword, timestamp }) => {
      try {
        if (!existsSync(USERS_FILE)) {
          return {
            success: false,
            message: '用户数据文件不存在'
          }
        }

        const data = await fs.readFile(USERS_FILE, 'utf8')
        const profiles = JSON.parse(data)

        // 查找用户
        if (!profiles[userId]) {
          return {
            success: false,
            message: '用户不存在'
          }
        }

        // 验证当前密码
        if (profiles[userId].password !== currentPassword) {
          return {
            success: false,
            message: '当前密码不正确'
          }
        }

        // 检查新密码是否与当前密码相同
        if (currentPassword === newPassword) {
          return {
            success: false,
            message: '新密码不能与当前密码相同'
          }
        }

        // 更新密码
        profiles[userId].password = newPassword
        profiles[userId].lastPasswordChange = timestamp || new Date().toISOString()

        // 保存更新后的用户数据
        await fs.writeFile(USERS_FILE, JSON.stringify(profiles, null, 2), 'utf8')

        return {
          success: true,
          message: '密码修改成功',
          data: {
            userId: userId,
            username: username,
            timestamp: profiles[userId].lastPasswordChange
          }
        }
      } catch (error) {
        console.error('密码修改失败:', error)
        return {
          success: false,
          message: '密码修改过程中发生错误'
        }
      }
    }
  )

  ipcMain.handle('user:get-profile-by-id', async (_, userId) => {
    try {
      if (existsSync(USERS_FILE)) {
        const data = await fs.readFile(USERS_FILE, 'utf8')
        const profiles = JSON.parse(data)
        return profiles[userId] || null
      }
      return {}
    } catch (error) {
      console.log('读取用户数据失败', error)
      return {}
    }
  })

  ipcMain.handle('user:get-profile-login', async (_, username, password) => {
    try {
      if (existsSync(USERS_FILE)) {
        const data = await fs.readFile(USERS_FILE, 'utf8')
        const profiles = JSON.parse(data)
        // 遍历所有用户，找到匹配的用户名
        for (const userId in profiles) {
          if (profiles[userId].username === username && profiles[userId].password === password) {
            return {
              success: true,
              data: profiles[userId],
              message: '登录成功'
            }
          }
        }
        return {
          success: false,
          data: null,
          message: '登录失败，用户或密码错误'
        }
      }
      return {
        success: false,
        data: null,
        message: '登录失败，没有找到users.json文件,请联系厂商'
      }
    } catch (error) {
      console.log('登录失败', error)
      return { success: false, data: null, message: `登录出现问题${error}` }
    }
  })

  ipcMain.handle('user:get-profile-by-username', async (_, username) => {
    try {
      if (existsSync(USERS_FILE)) {
        const data = await fs.readFile(USERS_FILE, 'utf8')
        const profiles = JSON.parse(data)
        // 遍历所有用户，找到匹配的用户名
        for (const userId in profiles) {
          if (profiles[userId].username === username) {
            return profiles[userId]
          }
        }
        return null
      }
      return {}
    } catch (error) {
      console.log('读取用户数据失败', error)
      return {}
    }
  })

  ipcMain.handle('user:save-profile', async (_, userInfo) => {
    try {
      let profiles = {}
      if (!existsSync(USERS_FILE)) {
        return {
          success: false,
          message: '用户数据保存失败，users.json文件不存在,请联系厂商'
        }
      }
      const data = await fs.readFile(USERS_FILE, 'utf8')
      profiles = JSON.parse(data)

      // 使用用户ID作为主键，避免用户名修改问题
      profiles[userInfo.id] = userInfo
      await fs.writeFile(USERS_FILE, JSON.stringify(profiles, null, 2))
      return { success: true, message: '用户配置保存成功' }
    } catch (error: any) {
      console.error('保存用户数据失败:', error)
      return { success: false, error: error.message }
    }
  })

  // 修正：读取用户设置文件内容
  ipcMain.handle('user:get-user-setting', async () => {
    try {
      const settingsFilePath = path.join(USER_DATA_PATH, 'settings.json')
      const settingsDir = path.dirname(settingsFilePath)
      // 确保目录存在
      await fs.mkdir(settingsDir, { recursive: true })

      // 检查文件是否存在
      try {
        await fs.access(settingsFilePath)
      } catch {
        // 文件不存在，返回默认设置
        const defaultSettings = {}
        await fs.writeFile(settingsFilePath, JSON.stringify(defaultSettings, null, 2), 'utf8')
        return defaultSettings
      }

      // 读取并解析设置文件
      const settingsContent = await fs.readFile(settingsFilePath, 'utf8')
      const settings = JSON.parse(settingsContent)
      console.log('current Settings', settings)
      return settings
    } catch (error) {
      console.error('IPC user:get-user-setting', error)
      throw error
    }
  })

  // 写入用户设置的函数
  ipcMain.handle('user:set-user-setting', async (_, settingsData) => {
    try {
      const settingsFilePath = path.join(USER_DATA_PATH, 'settings.json')
      const settingsDir = path.dirname(settingsFilePath)

      // 确保目录存在
      await fs.mkdir(settingsDir, { recursive: true })

      // 写入设置数据到文件
      await fs.writeFile(settingsFilePath, JSON.stringify(settingsData, null, 2), 'utf8')

      console.log('Settings saved successfully to:', settingsFilePath)
      return { success: true, path: settingsFilePath }
    } catch (error) {
      console.error('IPC user:set-user-setting', error)
      throw error
    }
  })

  // 读取enerageLevelMap配置
  ipcMain.handle('config:get-enerage-level-map', async () => {
    try {
      const configFilePath = path.join(USER_DATA_PATH, 'enerage-level-map.json')
      const configDir = path.dirname(configFilePath)

      // 确保目录存在
      await fs.mkdir(configDir, { recursive: true })

      // 检查文件是否存在
      try {
        await fs.access(configFilePath)
      } catch {
        // 文件不存在，返回默认配置
        const defaultEnerageLevelMap = {}
        await fs.writeFile(configFilePath, JSON.stringify(defaultEnerageLevelMap, null, 2), 'utf8')
        return defaultEnerageLevelMap
      }

      // 读取并解析配置文件
      const configContent = await fs.readFile(configFilePath, 'utf8')
      const config = JSON.parse(configContent)
      console.log('current EnerageLevelMap:', config)
      return config
    } catch (error) {
      console.error('IPC config:get-enerage-level-map', error)
      throw error
    }
  })

  // 保存enerageLevelMap配置
  ipcMain.handle('config:set-enerage-level-map', async (_, configData) => {
    try {
      const configFilePath = path.join(USER_DATA_PATH, 'enerage-level-map.json')
      const configDir = path.dirname(configFilePath)

      // 确保目录存在
      await fs.mkdir(configDir, { recursive: true })

      // 写入配置数据到文件
      await fs.writeFile(configFilePath, JSON.stringify(configData, null, 2), 'utf8')

      console.log('EnerageLevelMap saved successfully to:', configFilePath)
      return { success: true, path: configFilePath }
    } catch (error) {
      console.error('IPC config:set-enerage-level-map', error)
      throw error
    }
  })

  app.commandLine.appendSwitch('--disable-gpu-sandbox')
  app.commandLine.appendSwitch('--disable-software-rasterizer')
  app.commandLine.appendSwitch('--no-sandbox')
  app.commandLine.appendSwitch('--disable-dev-shm-usage')

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  // Some APIs can only be used after this event occurs.
  app.whenReady().then(() => {
    // 初始化路径（必须在 app ready 后）
    initializePaths()
    // Set app user model id for windows
    if (process.platform === 'win32') {
      app.setAppUserModelId('com.electron')
    }

    // IPC test
    ipcMain.on('ping', () => console.log('pong'))

    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  app.on('before-quit', () => {
    if (dataWorker) {
      console.log('应用退出，清理 Worker...')
      dataWorker.postMessage({ cmd: 'stop' })
      dataWorker.terminate()
      dataWorker = null
      isDataCollectionRunning = false
    }
  })
}

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
