interface WorkerMessage {
  type: string
  payload?: any
  complete: boolean
}
interface RequestDataPayload {
  maxLen: number
}
interface ErrorPayload {
  error: string
}
interface YAxisRange {
  min: number
  max: number
}

interface ProcessedDataPayload {
  ch1: number[]
  ch2: number[]
  ch3: number[]
  ch4: number[]
  yAxisRanges: (YAxisRange | null)[]
}

interface DataResponsePayload {
  ch1: number[]
  ch2: number[]
  ch3: number[]
  ch4: number[]
}

class DataWorker {
  private isRunning: boolean
  private intervalId: ReturnType<typeof setTimeout> | undefined
  private maxLen: number
  constructor(maxLen) {
    this.isRunning = false
    this.intervalId = undefined
    this.maxLen = maxLen
  }

  private uniformSample(data: number[], targetLength: number = 1000): number[] {
    if (!data || data.length === 0) {
      return []
    }
    if (data.length <= targetLength) {
      return [...data]
    }
    const result: number[] = []
    const step = data.length / targetLength

    for (let i = 0; i < targetLength; i++) {
      const index = Math.floor(i * step)
      if (index < data.length) {
        result.push(data[index])
      }
    }
    return result
  }

  private calculateChannelYAxisRange(data: number[]): YAxisRange {
    if (!data || data.length === 0) {
      return {
        min: -1,
        max: 1
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

  processRawData(payload: DataResponsePayload, maxLen: number = 500): ProcessedDataPayload {
    console.log('Worker: 开始处理原始数据，数据长度:', {
      ch1: payload.ch1?.length || 0,
      ch2: payload.ch2?.length || 0,
      ch3: payload.ch3?.length || 0,
      ch4: payload.ch4?.length || 0
    })

    // 对每个通道进行均匀采样
    const sampledCh1 = this.uniformSample(payload.ch1, maxLen)
    const sampledCh2 = this.uniformSample(payload.ch2, maxLen)
    const sampledCh3 = this.uniformSample(payload.ch3, maxLen)
    const sampledCh4 = this.uniformSample(payload.ch4, maxLen)

    // 为每个通道分别计算 Y 轴范围
    const yAxisRanges: YAxisRange[] = [
      this.calculateChannelYAxisRange(sampledCh1),
      this.calculateChannelYAxisRange(sampledCh2),
      this.calculateChannelYAxisRange(sampledCh3),
      this.calculateChannelYAxisRange(sampledCh4)
    ]

    console.log('Worker: 数据处理完成，采样后长度:', {
      ch1: sampledCh1.length,
      ch2: sampledCh2.length,
      ch3: sampledCh3.length,
      ch4: sampledCh4.length,
      yAxisRanges
    })

    return {
      ch1: sampledCh1,
      ch2: sampledCh2,
      ch3: sampledCh3,
      ch4: sampledCh4,
      yAxisRanges
    }
  }

  processPartialRawData(payload: DataResponsePayload, maxLen: number = 500): ProcessedDataPayload {
    console.log('Worker: 开始处理部分原始数据，数据长度:', {
      ch1: payload.ch1?.length || 0,
      ch2: payload.ch2?.length || 0,
      ch3: payload.ch3?.length || 0,
      ch4: payload.ch4?.length || 0
    })
    // 只处理有数据的通道
    const sampledCh1 = payload.ch1?.length > 0 ? this.uniformSample(payload.ch1, maxLen) : []
    const sampledCh2 = payload.ch2?.length > 0 ? this.uniformSample(payload.ch2, maxLen) : []
    const sampledCh3 = payload.ch3?.length > 0 ? this.uniformSample(payload.ch3, maxLen) : []
    const sampledCh4 = payload.ch4?.length > 0 ? this.uniformSample(payload.ch4, maxLen) : []

    // 创建一个空的Y轴范围数组
    const yAxisRanges: (YAxisRange | null)[] = []

    // 只计算有数据的通道的Y轴范围，其他通道返回null
    yAxisRanges[0] = sampledCh1.length > 0 ? this.calculateChannelYAxisRange(sampledCh1) : null
    yAxisRanges[1] = sampledCh2.length > 0 ? this.calculateChannelYAxisRange(sampledCh2) : null
    yAxisRanges[2] = sampledCh3.length > 0 ? this.calculateChannelYAxisRange(sampledCh3) : null
    yAxisRanges[3] = sampledCh4.length > 0 ? this.calculateChannelYAxisRange(sampledCh4) : null

    console.log('Worker: 部分数据处理完成，采样后长度:', {
      ch1: sampledCh1.length,
      ch2: sampledCh2.length,
      ch3: sampledCh3.length,
      ch4: sampledCh4.length,
      yAxisRanges
    })
    return {
      ch1: sampledCh1,
      ch2: sampledCh2,
      ch3: sampledCh3,
      ch4: sampledCh4,
      yAxisRanges
    }
  }

  requestData(): void {
    try {
      self.postMessage({
        type: 'REQUEST_DATA',
        payload: { maxLen: this.maxLen } as RequestDataPayload
      } as WorkerMessage)
    } catch (error) {
      self.postMessage({
        type: 'ERROR',
        payload: { error: (error as Error).message } as ErrorPayload
      } as WorkerMessage)
    }
  }

  startCollection(): void {
    if (this.isRunning) return

    this.isRunning = true
    console.log('Worker: 开始数据采集')

    // 只保留一次初始请求
    this.requestData()

    // 设置定时器进行后续请求
    this.intervalId = setTimeout(() => {
      if (this.isRunning) {
        this.requestData()
        // 设置后续的定时器
        const animate = (): void => {
          if (this.isRunning) {
            this.requestData()
            this.intervalId = setTimeout(animate, 10000)
          }
        }
        this.intervalId = setTimeout(animate, 10000)
      }
    }, 10000)
  }

  stopCollection(): void {
    this.isRunning = false
    if (this.intervalId) {
      clearTimeout(this.intervalId)
      this.intervalId = undefined
    }
    console.log('Worker: 停止数据采集')
  }
}

const dataWorker = new DataWorker(10000)

self.onmessage = function (e: MessageEvent<WorkerMessage>): void {
  const { type, payload, complete } = e.data

  switch (type) {
    case 'START_COLLECTION':
      dataWorker.startCollection()
      break
    case 'STOP_COLLECTION':
      dataWorker.stopCollection()
      break
    case 'DATA_RESPONSE':
      const processedData = dataWorker.processRawData(payload, 1000)
      self.postMessage({
        type: 'DATA_PROCESSED',
        payload: processedData,
        complete: true
      })
      break
    case 'PARTIAL_DATA_RESPONSE':
      const partialProcessedData = dataWorker.processPartialRawData(payload, 1000)
      self.postMessage({
        type: 'DATA_PROCESSED',
        payload: partialProcessedData,
        complete: complete || false
      })
    default:
      console.warn('Worker: Unknown message type:', type)
  }
}

export type {
  WorkerMessage,
  RequestDataPayload,
  ErrorPayload,
  DataResponsePayload,
  ProcessedDataPayload
}
