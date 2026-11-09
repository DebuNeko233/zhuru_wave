import { Worker, isMainThread, parentPort, WorkerOptions, workerData } from 'worker_threads'
import path from 'path'
import { apiService } from './api'
import type { ProgramSettings, DeviceSettings } from './type'
import { ChannelDataInfo, YAxisRange, ProcessedDataResponse } from './type'
import { flattenTubiandianList } from './utils'
import { mapDefectsToDisplay } from './defect-alignment'
interface WorkerMessage {
  cmd:
    | 'start'
    | 'stop'
    | 'changeEnerageLevelConfig'
    | 'initDevice'
    | 'deviceDeinit'
    | 'getSampleRate'
    | 'startDevicePolling'
    | 'stopDevicePolling'
  options?: {
    program: ProgramSettings
    device: DeviceSettings
    rate?: number
    epsilon?: number
    pollingInterval?: number
  }
}

// 在条件块外部声明函数
let createDataWorker: (options: WorkerOptions) => Worker

if (isMainThread) {
  createDataWorker = function (options: WorkerOptions): Worker {
    // 动态导入 electron，确保只在主线程中执行
    const electron = require('electron')
    const app = electron.app

    // 在主线程中确定库路径
    const libName = 'libwave.dll'
    const libPath = app.isPackaged
      ? path.join(process.resourcesPath, 'native', libName)
      : path.join(__dirname, '../../src/native', libName)

    const workerData = options.workerData || {}
    workerData.libPath = libPath
    options.workerData = workerData

    const worker = new Worker(__filename, options)
    return worker
  }
} else {
  // Worker 线程：重新实现数据获取逻辑，完全独立运行
  const koffi = require('koffi')

  let lib: any
  let GetAllChannelData: any
  let GetAllChannelFreq: any
  let InitDevice: any
  let GetSampleRate: any
  let SearchDevice: any
  let isLibInitialized = false
  // let isTriangle: any

  // 这部分代码在工作线程执行
  let isRunning = false

  // Worker 线程中的设备状态
  let isDeviceInitialized = false
  let currentDeviceSettings: any = null

  let devicePollingInterval: NodeJS.Timeout | null = null
  let isDevicePolling = false
  let lastDeviceSettings: any = null

  let interval = 1000 // 默认间隔1秒
  let maxLen = 10000 // 默认数据长度
  let targetLength = 1000 // 默认目标采样长度
  let epsilon = 6000
  let debug_total = false
  let debug_single = false
  let period_step = 2
  let rate = 0.9
  let debugImgPath = path.join(process.resourcesPath, '../debugImg')
  let step1 = 2
  let step2 = 2

  // 在 Worker 线程中初始化库
  function initWorkerLibrary() {
    if (isLibInitialized) return

    try {
      const libPath = workerData?.libPath
      if (!libPath) {
        throw new Error('Library path not provided in workerData')
      }

      console.log('Worker: Loading library from:', libPath)
      lib = koffi.load(libPath)

      // 定义函数签名
      GetAllChannelData = lib.func('GetAllChannelData', 'int', [
        'int',
        'float*',
        'float*',
        'float*',
        'float*'
      ])
      GetAllChannelFreq = lib.func('GetAllChannelFreq', 'int', ['double*'])
      // isTriangle = lib.func('isTriangle', 'int', ['double*','int'])
      InitDevice = lib.func('InitDevice', 'bool', [
        'uint16*', // WORD* nCHVoltDIV
        'uint16*', // WORD* nCHCoupling
        'uint16*', // WORD* bCHBWLimit
        'uint16', // WORD nTimeDIV
        'uint16', // WORD nTrigerSource
        'uint16', // WORD nTriggerSlope
        'uint32', // ULONG nBufferLen
        'uint16' // WORD curNTriggerMode
      ])
      GetSampleRate = lib.func('GetSampleRate', 'double', [])
      SearchDevice = lib.func('SearchDevice', 'int', [])
      isLibInitialized = true
      console.log('Worker: Library initialized successfully')
    } catch (error) {
      console.error('Worker: Failed to initialize library:', error)
      throw error
    }
  }

  // Worker 启动时立即初始化库
  try {
    console.log('Worker: 启动时初始化库...')
    initWorkerLibrary()
  } catch (error) {
    console.error('Worker: 启动时库初始化失败:', error)
    // 发送错误消息到主进程
    if (parentPort) {
      parentPort.postMessage({
        type: 'library-init-error',
        error: `库初始化失败: ${error}`
      })
    }
  }

  // Worker 线程中的设备初始化函数
  function initWorkerDevice(deviceSettings: any): boolean {
    if (!isLibInitialized) {
      initWorkerLibrary()
    }

    try {
      console.log('Worker: 正在初始化设备...', deviceSettings)
      const startTime = Date.now()

      // 固定按 4 通道传递给 native，避免长度不一致导致越界访问
      const channelCount = 4
      const channels = Array.isArray(deviceSettings?.channels) ? deviceSettings.channels : []
      const nCHVoltDIV = new Uint16Array(channelCount)
      const nCHCoupling = new Uint16Array(channelCount)
      const bCHBWLimit = new Uint16Array(channelCount)

      // 填充通道参数
      for (let i = 0; i < channelCount; i++) {
        const channel = channels[i]
        nCHVoltDIV[i] = channel?.nCHVoltDIV ?? 0
        nCHCoupling[i] = channel?.coupling ?? 0
        bCHBWLimit[i] = channel?.bCHBWLimit ?? 0
      }

      // 首先搜索设备
      console.log('Worker: 搜索设备...')
      const deviceCount = SearchDevice()
      console.log(`Worker: 检测到设备数量: ${deviceCount}`)

      if (deviceCount === 0) {
        throw new Error('未检测到设备连接，请检查设备是否正确连接')
      }

      // 调用InitDevice函数
      const result = InitDevice(
        nCHVoltDIV, // WORD* nCHVoltDIV
        nCHCoupling, // WORD* nCHCoupling
        bCHBWLimit, // WORD* bCHBWLimit
        deviceSettings.timeBaseIndex, // WORD nTimeDIV
        deviceSettings.trigger.source, // WORD nTrigerSource
        deviceSettings.trigger.slope, // WORD nTriggerSlope
        deviceSettings.sampling.bufferLength, // ULONG nBufferLen
        deviceSettings.trigger.mode // WORD curNTriggerMode
      )

      const endTime = Date.now()

      console.log(`Worker: InitDevice 执行时间: ${endTime - startTime}ms`)
      console.log('Worker: Device initialization result:', result)

      if (result) {
        isDeviceInitialized = true
        currentDeviceSettings = deviceSettings
        console.log('Worker: 设备初始化成功,当前设置', currentDeviceSettings)
      } else {
        isDeviceInitialized = false
        console.log('Worker: 设备初始化失败')
      }

      return result
    } catch (error) {
      console.error('Worker: Error in initDevice:', error)
      isDeviceInitialized = false
      throw error
    }
  }

  // Worker 线程中的数据获取函数
  function getAllChannelDataInWorker(maxLen: number = 1000) {
    if (!isLibInitialized) {
      initWorkerLibrary()
    }

    try {
      const ch1Buffer = new Float32Array(maxLen)
      const ch2Buffer = new Float32Array(maxLen)
      const ch3Buffer = new Float32Array(maxLen)
      const ch4Buffer = new Float32Array(maxLen)

      const actualLength = GetAllChannelData(maxLen, ch1Buffer, ch2Buffer, ch3Buffer, ch4Buffer)

      console.log('Worker: 获取到数据长度:', actualLength)

      // 方法1: 直接检查设备连接状态
      let deviceDisconnected = false
      try {
        const deviceCount = SearchDevice()
        console.log('Worker: 当前检测到设备数量:', deviceCount)
        if (deviceCount === 0) {
          deviceDisconnected = true
          console.error('Worker: 确认设备已断开连接')
        }
      } catch (searchError) {
        console.error('Worker: 检查设备状态时出错:', searchError)
        deviceDisconnected = true
      }

      // 如果确认设备断开，抛出错误
      if (deviceDisconnected) {
        const deviceDisconnectedError = new Error('设备已断开连接')
        ;(deviceDisconnectedError as any).code = 'DEVICE_DISCONNECTED'
        throw deviceDisconnectedError
      }

      if (!Number.isFinite(actualLength) || actualLength <= 0) {
        return {
          ch1: [],
          ch2: [],
          ch3: [],
          ch4: [],
          frequencies: [],
          actualLength: 0
        }
      }

      let frequencies: number[] = []
      try {
        const freqBuffer = new Float64Array(4)
        const freqRet = GetAllChannelFreq(freqBuffer)
        if (freqRet > 0) {
          const validCount = Math.min(freqRet, freqBuffer.length)
          frequencies = Array.from({ length: freqBuffer.length }, (_, i) => {
            if (i >= validCount) return 0
            const value = freqBuffer[i]
            return Number.isFinite(value) && value > 0 ? value : 0
          })
        }
      } catch (freqError) {
        // 频率获取失败不阻断采集主流程
        console.warn('Worker: 获取原生频率失败，回退到前端估算', freqError)
      }

      return {
        ch1: Array.from(ch1Buffer.slice(0, actualLength)),
        ch2: Array.from(ch2Buffer.slice(0, actualLength)),
        ch3: Array.from(ch3Buffer.slice(0, actualLength)),
        ch4: Array.from(ch4Buffer.slice(0, actualLength)),
        frequencies,
        actualLength
      }
    } catch (error) {
      console.error('Worker: Error getting channel data:', error)

      if ((error as any).code === 'DEVICE_DISCONNECTED') {
        console.log('Worker: 检测到设备断开，标记设备为未初始化状态')
        isDeviceInitialized = false

        // 发送设备断开消息到主进程
        if (parentPort) {
          parentPort.postMessage({
            type: 'device-disconnected',
            message: '设备在数据采集过程中断开连接,已取消数据采集'
          })
        }

        // 停止数据采集定时器
        if (fetchInterval) {
          console.log('Worker: 停止数据采集定时器')
          clearInterval(fetchInterval)
          fetchInterval = null
        }

        // 如果有保存的设备设置，自动启动设备轮询
        if (lastDeviceSettings && !isDevicePolling) {
          console.log('Worker: 自动启动设备轮询以检测设备重新连接')
          console.log('Worker: 使用的设备设置:', lastDeviceSettings)
          startDevicePolling(lastDeviceSettings, 3000) // 使用5秒间隔进行轮询

          if (parentPort) {
            parentPort.postMessage({
              type: 'device-polling-started',
              message: '设备断开后自动启动轮询，间隔5秒'
            })
          }
        } else {
          console.warn('Worker: 无法启动设备轮询，lastDeviceSettings 无效:', lastDeviceSettings)
          if (parentPort) {
            parentPort.postMessage({
              type: 'device-polling-start-error',
              error: '无法启动设备轮询：设备设置无效'
            })
          }
        }
      }
      throw error
    }
  }

  // 设备轮询函数
  function pollForDevice(): void {
    if (!isLibInitialized) {
      initWorkerLibrary()
    }

    try {
      console.log('Worker: 轮询检查设备连接...')
      const deviceCount = SearchDevice()
      console.log(`Worker: 检测到 ${deviceCount} 个设备`)

      if (deviceCount > 0 && lastDeviceSettings) {
        console.log('Worker: 检测到设备重新连接，尝试重新初始化...')

        // 尝试重新初始化设备
        const initResult = initWorkerDevice(lastDeviceSettings)

        // 停止轮询
        stopDevicePolling()
        if (initResult) {
          console.log('Worker: 设备重新初始化成功')
          if (parentPort) {
            parentPort.postMessage({
              type: 'device-reconnected',
              message: '设备重新连接并初始化成功'
            })
          }
        } else {
          console.log('Worker: 设备重新初始化失败，继续轮询...')
          startDevicePolling(lastDeviceSettings, 3000) // 重新开始轮询
        }
      }
    } catch (error) {
      console.error('Worker: 设备轮询错误:', error)
    }
  }

  // 启动设备轮询
  function startDevicePolling(deviceSettings: any, pollingInterval: number = 3000): void {
    if (isDevicePolling) {
      console.log('Worker: 设备轮询已在运行中')
      return
    }

    console.log(`Worker: 启动设备轮询，间隔 ${pollingInterval}ms`)
    console.log('Worker: 轮询设备设置:', deviceSettings)
    lastDeviceSettings = deviceSettings
    isDevicePolling = true

    devicePollingInterval = setInterval(pollForDevice, pollingInterval)

    if (parentPort) {
      parentPort.postMessage({
        type: 'device-polling-started',
        message: `设备轮询已启动，间隔 ${pollingInterval}ms`
      })
    }
  }

  // 停止设备轮询
  function stopDevicePolling(): void {
    if (devicePollingInterval) {
      clearInterval(devicePollingInterval)
      devicePollingInterval = null
    }
    isDevicePolling = false

    console.log('Worker: 设备轮询已停止')

    if (parentPort) {
      parentPort.postMessage({
        type: 'device-polling-stopped',
        message: '设备轮询已停止'
      })
    }
  }

  // 计算Y轴范围函数
  function calculateChannelYAxisRange(data: number[]): YAxisRange {
    if (!data || data.length === 0) {
      return {
        min: -5,
        max: 5
      }
    }

    const minValue = Math.min(...data)
    const maxValue = Math.max(...data)
    const range = maxValue - minValue
    const margin = range * 0.1 || 1

    return {
      min: Math.floor(minValue - margin),
      max: Math.ceil(maxValue + margin)
    }
  }

  // 处理原始数据函数
  async function processRawData(rawData: any): Promise<ProcessedDataResponse> {
    const result = {} as ProcessedDataResponse

    for (let i = 0; i < 4; i++) {
      const currentChannel = {} as ChannelDataInfo
      const currentChannelData = rawData[`ch${i + 1}`]
      const nativeFreq = rawData.frequencies?.[i]
      if (Number.isFinite(nativeFreq) && nativeFreq > 0) {
        currentChannel.frequency = Number(nativeFreq)
      }
      if (!Array.isArray(currentChannelData) || currentChannelData.length === 0) {
        currentChannel.peakVoltage = 0
        currentChannel.minimumVoltage = 0
        currentChannel.averageVoltage = 0
        currentChannel.range = '0.0'
        currentChannel.deviation = '0.00'
        currentChannel.isConnect = false
        currentChannel.status = '未连接'
        currentChannel.isWarn = false
        currentChannel.showData = []
        currentChannel.originalLength = 0
        currentChannel.yAxisRange = calculateChannelYAxisRange([])
        result[`ch${i + 1}`] = currentChannel
        continue
      }

      // 采样值可能跨过 0：峰峰值必须是 max(raw)-min(raw)。
      const maxValue = Math.max(...currentChannelData)
      const minValue = Math.min(...currentChannelData)
      const mean = currentChannelData.reduce((sum, val) => sum + val, 0) / currentChannelData.length
      // 标准差/方差用原始数据计算（用于连接状态判断）
      const originalMean = currentChannelData.reduce((sum, val) => sum + val, 0) / currentChannelData.length
      const variance =
        currentChannelData.reduce((sum, val) => sum + Math.pow(val - originalMean, 2), 0) /
        currentChannelData.length

      // 电压
      currentChannel.peakVoltage = maxValue
      currentChannel.minimumVoltage = minValue
      currentChannel.averageVoltage = mean

      // 计算区间值（峰峰值）
      currentChannel.range = (maxValue - minValue).toFixed(1)

      // 计算偏差值(标准差)
      currentChannel.deviation = Math.sqrt(variance).toFixed(2)

      if (variance <= 0.002) {
        // 说明该通道没有被连接到
        currentChannel.isConnect = false
        currentChannel.status = '未连接'
        currentChannel.isWarn = false
      } else {
        currentChannel.isConnect = true
        // 当前通道数据状态 后续要完成判断 #(TODO)
        // let isTriangleResult = isTriangle(currentChannelData,currentChannelData.length);

        let check_result: any
        try {
          check_result = await apiService.waveChekFnc({
            wave: currentChannelData,
            save_path: debugImgPath,
            epsilon: epsilon,
            debug_total: debug_total,
            debug_single: debug_single,
            period_step: period_step,
            step1: step1,
            step2: step2,
            rate: rate
          })
        } catch (err) {
          console.error('Worker: 波形检测调用异常:', err)
          // 将错误发送到前端
          parentPort?.postMessage({
            type: 'error',
            error: `后端出现异常,请检查是否启动后端服务`
          })
          // 回退为异常响应，避免中断后续流程
          check_result = { code: -1, msg: 'exception', data: null }
        }

        let isTriangleResult

        const result_data = check_result?.data

        if (!result_data || typeof result_data.pass_flag === 'undefined') {
          // 网络/服务器故障不是物理波形故障。
          currentChannel.status = '检测服务错误'
          currentChannel.isWarn = false
          isTriangleResult = null
        } else if (result_data.pass_flag) {
          isTriangleResult = true
        } else {
          isTriangleResult = false
          currentChannel.err_pic_path_list = result_data.err_pic_path_list
          currentChannel.err_data_list = result_data.err_data_list
          currentChannel.defectPoints = flattenTubiandianList(result_data.tubiandian_list)
          currentChannel.defectCycles = Array.isArray(result_data.defect_cycles) ? result_data.defect_cycles : []
        }

        // 这里默认先给正常
        if (isTriangleResult) {
          currentChannel.status = '正常'
          currentChannel.isWarn = false
        } else if (isTriangleResult === false) {
          currentChannel.status = '警告'
          currentChannel.isWarn = true
        }
      }

      // Detection uses full-resolution samples; the display must use one matching
      // coordinate map and preserve the exact samples chosen as defect markers.
      const display = mapDefectsToDisplay(
        currentChannelData,
        targetLength,
        currentChannel.defectPoints || [],
        currentChannel.defectCycles || []
      )
      currentChannel.showData = display.showData
      currentChannel.originalLength = currentChannelData.length
      currentChannel.defectPoints = display.defectPoints
      currentChannel.defectCycles = display.defectCycles
      currentChannel.yAxisRange = calculateChannelYAxisRange(display.showData)

      result[`ch${i + 1}`] = currentChannel
    }
    result.actualLength = rawData.actualLength

    return result
  }

  async function fetchData(): Promise<void> {
    // 防止并发执行
    if (isRunning) {
      console.log('Worker: 数据获取正在进行中，跳过本次调用')
      return
    }
    //设置运行标志
    isRunning = true
    try {
      if (!isLibInitialized) {
        initWorkerLibrary()
      }
      if (!isDeviceInitialized) {
        console.log('Worker: 设备未初始化，无法获取数据')
        return
      }

      // 使用 Worker 线程中的数据获取函数
      const allData = getAllChannelDataInWorker(maxLen)

      // const allData = {
      //     ch1: readChannelDataFromCSV('D:/ProjectFiles/VscodeVue/waveShow/analyze/60x1.csv', 10000),
      //     ch2: readChannelDataFromCSV('D:/ProjectFiles/VscodeVue/waveShow/analyze/60x2.csv', 10000),
      //     ch3: readChannelDataFromCSV('D:/ProjectFiles/VscodeVue/waveShow/analyze/60y1.csv', 10000),
      //     ch4: readChannelDataFromCSV('D:/ProjectFiles/VscodeVue/waveShow/analyze/60y2.csv', 10000),
      //     actualLength: 10000
      // };
      // 处理数据

      const processedData = await processRawData(allData)

      // 发送处理后的数据到主线程
      if (parentPort) {
        parentPort.postMessage({
          type: 'data',
          data: processedData
        })
      }
    } catch (error) {
      console.error('Worker: 数据获取错误:', error)
      console.error('Worker: 错误堆栈:', error instanceof Error ? error.stack : 'No stack trace')
      if (parentPort) {
        parentPort.postMessage({
          type: 'data',
          data: null,
          error: error instanceof Error ? error.message : '数据获取失败'
        })
      }
    } finally {
      // 确保在任何情况下都重置运行标志
      console.log('Worker: fetchData 执行完成，重置运行标志')

      // 如果设备未初始化且定时器仍在运行，停止定时器
      if (!isDeviceInitialized && fetchInterval) {
        console.log('Worker: 设备未初始化，停止数据采集定时器')
        clearInterval(fetchInterval)
        fetchInterval = null
      }
      isRunning = false
    }
  }

  let fetchInterval: NodeJS.Timeout | null = null

  // 监听主线程发送的消息
  if (parentPort) {
    parentPort.on('message', (message: WorkerMessage) => {
      console.log('Worker: 收到消息:', message)

      switch (message.cmd) {
        case 'initDevice':
          console.log('Worker: 开始初始化设备')

          try {
            // 确保库已初始化
            if (!isLibInitialized) {
              initWorkerLibrary()
            }

            // 初始化设备
            if (message.options?.device) {
              console.log('Worker: 开始初始化设备，参数:', message.options.device)
              const initResult = initWorkerDevice(message.options.device)
              lastDeviceSettings = message.options.device
              if (!initResult) {
                throw new Error('设备初始化返回失败')
              }

              // 向主进程发送初始化成功消息
              parentPort?.postMessage({
                type: 'init-success',
                message: '设备初始化成功'
              })
            } else {
              throw new Error('缺少设备参数')
            }
          } catch (error: any) {
            console.error('Worker: 设备初始化失败:', error)
            parentPort?.postMessage({
              type: 'init-error',
              error: `设备初始化失败: ${error.message}`
            })
          }
          break
        case 'deviceDeinit':
          // 重置设备状态，确保下次启动时重新初始化
          isDeviceInitialized = false
          currentDeviceSettings = null
          break
        case 'start':
          ;(async () => {
            try {
              // 防止重复启动
              if (fetchInterval) {
                console.log('Worker: 数据采集已在运行中，先停止当前采集')
                clearInterval(fetchInterval)
                fetchInterval = null
                // 等待当前运行的 fetchData 完成
                await new Promise((resolve) => setTimeout(resolve, 100))
              }

              if (message.options) {
                // 检查设备是否已初始化
                if (!isDeviceInitialized) {
                  console.error('Worker: 设备未初始化，无法开始数据采集')
                  if (parentPort) {
                    parentPort.postMessage({
                      type: 'error',
                      error: '设备未初始化，请先调用 initDevice 命令初始化设备'
                    })
                  }
                  return
                }
                interval = message.options.program.interval || interval
                maxLen = message.options.program.maxLen || maxLen
                targetLength = message.options.program.targetLength || targetLength
                epsilon = message.options.program.debugStorage.epsilon || epsilon
                debug_total = message.options.program.debugStorage.debug_total || debug_total
                debug_single = message.options.program.debugStorage.debug_single || debug_single
                period_step = message.options.program.debugStorage.period_step || period_step
                rate = message.options.program.debugStorage.rate || rate
                step1 = message.options.program.debugStorage.step1 || step1
                step2 = message.options.program.debugStorage.step2 || step2

                console.log('Worker: 更新后的调试参数:', {
                  epsilon,
                  debug_total,
                  debug_single,
                  period_step,
                  rate,
                  step1,
                  step2
                })
              }

              console.log('Worker: 开始数据采集，参数:', { interval, maxLen, targetLength })

              // 开始定时获取数据
              fetchInterval = setInterval(fetchData, interval)

              // 设备重连后给 native 一点稳定时间，避免立即读取触发崩溃
              setTimeout(() => {
                fetchData()
              }, 200)

              parentPort?.postMessage({
                type: 'start-success'
              })
            } catch (error) {
              console.error('Worker: 数据采集启动失败:', error)
              parentPort?.postMessage({
                type: 'start-error',
                error: `数据采集启动失败: ${error}`
              })
            }
          })()
          break

        case 'stop':
          try {
            console.log('Worker: 停止数据采集')
            if (fetchInterval) {
              clearInterval(fetchInterval)
              fetchInterval = null
            }
            parentPort?.postMessage({
              type: 'stop-success'
            })
            console.log('Worker: 已重置设备状态')
          } catch (error) {
            console.error('Worker: 停止数据采集失败:', error)
            parentPort?.postMessage({
              type: 'stop-error',
              error: `停止数据采集失败: ${error}`
            })
          }
          break

        case 'changeEnerageLevelConfig':
          if (message.options) {
            rate = message.options.rate || rate
            epsilon = message.options.epsilon || epsilon
          }
          break

        case 'getSampleRate':
          try {
            // 确保库已初始化
            if (!isLibInitialized) {
              initWorkerLibrary()
            }
            if (!isDeviceInitialized) {
              throw new Error('设备未初始化，无法获取采样率')
            }

            console.log('Worker: 获取采样率')
            const sampleRate = GetSampleRate()
            console.log('Worker: 采样率:', sampleRate)

            // 向主进程发送采样率
            parentPort?.postMessage({
              type: 'sample-rate-response',
              sampleRate: sampleRate
            })
          } catch (error) {
            console.error('Worker: 获取采样率失败:', error)
            parentPort?.postMessage({
              type: 'sample-rate-error',
              error: `获取采样率失败: ${error}`
            })
          }
          break

        case 'startDevicePolling':
          try {
            if (message.options?.device) {
              console.log('Worker: 开始设备轮询', message.options.device)
              const pollingInterval = message.options.pollingInterval || 3000
              startDevicePolling(message.options.device, pollingInterval)

              parentPort?.postMessage({
                type: 'device-polling-start-success',
                message: `设备轮询启动成功，轮询间隔: ${pollingInterval}ms`
              })
            } else {
              throw new Error('缺少设备参数')
            }
          } catch (err) {
            console.error('Worker: 设备轮询启动失败:', err)
            parentPort?.postMessage({
              type: 'device-polling-start-error',
              error: `设备轮询启动失败: ${err}`
            })
          }
          break
        case 'stopDevicePolling':
          try {
            stopDevicePolling()
          } catch (error) {
            console.error('Worker: 停止设备轮询失败:', error)
            parentPort?.postMessage({
              type: 'device-polling-stop-error',
              error: `停止设备轮询失败: ${error}`
            })
          }
          break
      }
    })
  }
}

export { createDataWorker }
