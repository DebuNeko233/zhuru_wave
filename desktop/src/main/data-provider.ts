import koffi from 'koffi'
import path from 'path'
import { isMainThread, workerData } from 'worker_threads'
import { DeviceSettings } from './type'

let app: any
if (typeof process !== 'undefined' && !isMainThread) {
  // Worker线程
} else {
  try {
    const electron = require('electron')
    app = electron.app
  } catch (e) {
    console.error('Failed to import electron:', e)
  }
}

class MainDataProvider {
  private lib: any
  private InitDevice: any
  private GetSingleChannelData: any
  private GetAllChannelData: any
  private GetSampleRate: any
  private LookupSampleRateHz: any

  // private isInitialized = false

  private isLibraryLoaded = false // 库加载状态（只加载一次）

  constructor() {
    // 延迟初始化，避免在应用启动时就加载库
  }

  private initLibrary() {
    // if (this.isInitialized) return
    if (this.isLibraryLoaded) return // 库只加载一次

    try {
      const libName = 'libwave.dll'
      let libPath
      if (isMainThread) {
        libPath = app?.isPackaged
          ? path.join(process.resourcesPath, 'native', libName)
          : path.join(__dirname, '../../src/native', libName) // 修复：确保路径正确
      } else {
        libPath = workerData?.libPath || path.join(__dirname, '../../src/native', libName)
      }

      console.log('Loading library from main process:', libPath)
      console.log('__dirname:', __dirname) // 添加调试信息
      this.lib = koffi.load(libPath)

      // 定义函数签名
      this.InitDevice = this.lib.func('InitDevice', 'bool', [
        'ushort*', // WORD* nCHVoltDIV
        'ushort*', // WORD* nCHCoupling
        'ushort*', // WORD* bCHBWLimit
        'ushort', // WORD nTimeDIV
        'ushort', // WORD nTrigerSource
        'ushort', // WORD nTriggerSlope
        'ulong', // ULONG nBufferLen
        'ushort' // WORD curNTriggerMode
      ])
      this.GetSingleChannelData = this.lib.func('GetSingleChannelData', 'int', [
        'int',
        'float*',
        'int'
      ])
      this.GetAllChannelData = this.lib.func('GetAllChannelData', 'int', [
        'int',
        'float*',
        'float*',
        'float*',
        'float*'
      ])
      this.GetSampleRate = this.lib.func('GetSampleRate', 'double', [])
      this.LookupSampleRateHz = this.lib.func('LookupSampleRateHz', 'double', ['int', 'int'])
      // this.IsTriangle = this.lib.func('isTriangle', 'int', ['double*','int'])
      // this.IsTriangle = this.lib.func('isTriangle', 'int', ['double*','int'])

      // this.isInitialized = true

      this.isLibraryLoaded = true
      console.log('Library loaded successfully in main process')
    } catch (error) {
      console.error('Failed to load library in main process:', error)
      throw error
    }
  }

  initDevice(deviceSettings: DeviceSettings): boolean {
    this.initLibrary()
    try {
      console.log('正在调用 InitDevice...')
      const startTime = Date.now()

      // 准备参数数组 - 使用正确的类型
      const channelCount = deviceSettings.channels.length
      const nCHVoltDIV = new Uint16Array(channelCount) // WORD -> unsigned short -> Uint16Array
      const nCHCoupling = new Uint16Array(channelCount) // WORD -> unsigned short -> Uint16Array
      const bCHBWLimit = new Uint16Array(channelCount) // WORD -> unsigned short -> Uint16Array

      // 填充通道参数
      for (let i = 0; i < channelCount; i++) {
        const channel = deviceSettings.channels[i]
        nCHVoltDIV[i] = channel.nCHVoltDIV
        nCHCoupling[i] = channel.coupling
        bCHBWLimit[i] = channel.bCHBWLimit
      }

      // 调用InitDevice函数
      const result = this.InitDevice(
        nCHVoltDIV, // WORD* nCHVoltDIV
        nCHCoupling, // WORD* nCHCoupling
        bCHBWLimit, // WORD* bCHBWLimit
        deviceSettings.timeBaseIndex, // WORD nTimeDIV (unsigned short)
        deviceSettings.trigger.source, // WORD nTrigerSource (unsigned short)
        deviceSettings.trigger.slope, // WORD nTriggerSlope (unsigned short)
        deviceSettings.sampling.bufferLength, // ULONG nBufferLen (unsigned long)
        deviceSettings.trigger.mode // WORD curNTriggerMode (unsigned short)
      )

      const endTime = Date.now()

      console.log(`InitDevice 执行时间: ${endTime - startTime}ms`)
      console.log('Device initialization result:', result)
      console.log('Device settings applied:', {
        channels: deviceSettings.channels.map((ch) => ({
          id: ch.id,
          voltDiv: ch.nCHVoltDIV,
          coupling: ch.coupling,
          bwLimit: ch.bCHBWLimit
        })),
        timeBase: deviceSettings.timeBaseIndex,
        trigger: deviceSettings.trigger,
        bufferLength: deviceSettings.sampling.bufferLength
      })

      return result
    } catch (error) {
      console.error('Error in initDevice:', error)
      throw error
    }
  }

  // isTriangle(data: number[], maxLen: number): boolean {
  //   this.initLibrary()
  //   try {
  //     const buffer = new Float64Array(data)
  //     const result = this.IsTriangle(buffer, maxLen)
  //     return result === 1
  //   } catch (error) {
  //     console.error('Error in isTriangle:', error)
  //     throw error
  //   }
  // }

  // isTriangle(data: number[], maxLen: number,slope_sym_thresh:number,rmse_thresh:number): boolean {
  //   this.initLibrary()
  //   try {
  //     const buffer = new Float64Array(data)
  //     const result = this.IsTriangle(buffer, maxLen,slope_sym_thresh,rmse_thresh)
  //     return result === 1
  //   } catch (error) {
  //     console.error('Error in isTriangle:', error)
  //     throw error
  //   }
  // }

  getSingleChannelData(channelIndex: number, maxLen: number = 10000) {
    this.initLibrary()
    try {
      const buffer = new Float32Array(maxLen)
      const actualLen = this.GetSingleChannelData(channelIndex, buffer, maxLen)

      console.log(`Channel ${channelIndex + 1} data length: ${actualLen}`)

      return {
        data: Array.from(buffer.slice(0, actualLen)), // 转换为普通数组以便 IPC 传输
        actualLength: actualLen
      }
    } catch (error) {
      console.error(`Error in getSingleChannelData for channel ${channelIndex}:`, error)
      throw error
    }
  }

  getAllChannelData(maxLen: number = 1000) {
    this.initLibrary()
    try {
      const ch1Buffer = new Float32Array(maxLen)
      const ch2Buffer = new Float32Array(maxLen)
      const ch3Buffer = new Float32Array(maxLen)
      const ch4Buffer = new Float32Array(maxLen)

      const actualLen = this.GetAllChannelData(maxLen, ch1Buffer, ch2Buffer, ch3Buffer, ch4Buffer)

      console.log(`All channels data length: ${actualLen}`)

      return {
        ch1: Array.from(ch1Buffer.slice(0, actualLen)),
        ch2: Array.from(ch2Buffer.slice(0, actualLen)),
        ch3: Array.from(ch3Buffer.slice(0, actualLen)),
        ch4: Array.from(ch4Buffer.slice(0, actualLen)),
        actualLength: actualLen
      }
    } catch (error) {
      console.error('Error in getAllChannelData:', error)
      throw error
    }
  }

  getSampleRate(): number {
    this.initLibrary()
    try {
      const rate = this.GetSampleRate()
      console.log(`Sample rate: ${rate} Hz`)
      return rate
    } catch (error) {
      console.error('Error in getSampleRate:', error)
      throw error
    }
  }

  lookupSampleRateHz(timeDivIdx: number, channelCount: number): number {
    this.initLibrary()
    try {
      return this.LookupSampleRateHz(timeDivIdx, channelCount)
    } catch (error) {
      console.error('Error in lookupSampleRateHz:', error)
      throw error
    }
  }

  // 便捷方法：获取图表数据
  getChartData(channelIndex: number, maxLen: number = 1000) {
    const dataResult = this.getSingleChannelData(channelIndex, maxLen)
    const sampleRate = this.getSampleRate()

    // 转换为图表数据格式 [时间, 电压]
    const chartData = dataResult.data.map((voltage: number, index: number) => {
      const time = index / sampleRate
      return [time, voltage]
    })

    return {
      data: chartData,
      sampleRate,
      actualLength: dataResult.actualLength
    }
  }

  // 模拟完整测试流程
  // async runSampleCase() {
  //   try {
  //     console.log('开始初始化设备...')
  //     const initResult = this.initDevice()
  //     if (!initResult) {
  //       console.error('示波器初始化失败！')
  //       return { success: false, sampleRate: 0 }
  //     }
  //     console.log('设备初始化成功！')

  //     const sampleRate = this.getSampleRate()
  //     console.log(`采样率: ${sampleRate} Hz`)

  //     // 等待3秒
  //     console.log('等待3秒...')
  //     await new Promise(resolve => setTimeout(resolve, 3000))

  //     // 获取单通道数据
  //     console.log('开始采样单通道数据...')
  //     const ch1Result = this.getSingleChannelData(0, 10000)
  //     console.log(`CH1 数据长度: ${ch1Result.actualLength}`)

  //     // 获取所有通道数据
  //     console.log('获取所有通道数据...')
  //     const allData = this.getAllChannelData(1000)

  //     return {
  //       success: true,
  //       sampleRate,
  //       ch1Data: ch1Result.data,
  //       allChannelData: allData
  //     }
  //   } catch (error) {
  //     console.error('运行示例案例时出错:', error)
  //     return { success: false, sampleRate: 0 }
  //   }
  // }
}

export const mainDataProvider = new MainDataProvider()
