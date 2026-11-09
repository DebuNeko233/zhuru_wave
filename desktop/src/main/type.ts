export interface WaveCheckRequest {
  wave: number[] //需要验证的波形数据，必填
  epsilon: number //突变点阈值,可选,默认6000
  save_path: string
  debug_total: boolean //画出大图调试,可选,默认关闭
  debug_single: boolean //画出周期小图,可选,默认关闭
  period_step: number //周期步长,可选,默认2
  step1: number //斜率步长
  step2: number //斜率差步长
  rate: number // 正确率
  sample_rate_hz?: number // 离线原始采样文件中的采样率（未知则不填）
}

export interface WaveCheckRequestOptions extends WaveCheckRequest {
  rate: number
}

export interface YAxisRange {
  min: number
  max: number
}

export interface DefectCycle {
  start_index: number
  end_index_exclusive: number
  peak_index: number | null // 仅局部缺陷有准确的标记位置
  marker_kind?: string | null
  types: string[]
  score: number
}

export type WaveMetricStatus = 'ALERT' | 'REFERENCE' | 'DATA_INSUFFICIENT'
export interface WaveMetricValue {
  value?: number | null
  rise_value?: number | null
  fall_value?: number | null
  status: WaveMetricStatus
  unit: string
  variation_cv?: number
  period_samples?: number
  period_jitter_cv?: number
  linearity_error?: number
  reference_peak_to_peak_raw?: number
}
export interface FourWaveMetrics {
  peak_to_peak: WaveMetricValue
  frequency: WaveMetricValue
  slope: WaveMetricValue
  peak_stable_cycles: WaveMetricValue
}
export interface StablePeakSpan {
  start_index: number
  end_index_exclusive: number
  cycle_count: number
}
export interface WaveCycleMetric {
  start_index: number
  end_index_exclusive: number
  peak_to_peak_raw: number
  period_samples: number
  rise_slope_raw_per_sample: number
  fall_slope_raw_per_sample: number
  linearity_error: number
}

export interface ChannelDataInfo {
  frequency?: number // 信号频率(Hz)，优先来自 native 频率接口
  peakVoltage: number // 最高峰值电压
  averageVoltage: number // 平均峰值电压
  minimumVoltage: number // 最低峰值电压
  status: string // 状态
  deviation: string // 偏差值
  range: string // 区间值
  showData: number[] // 展示用的数据
  metricResults?: FourWaveMetrics
  peakStableSpans?: StablePeakSpan[]
  suspectCycles?: DefectCycle[]
  sampleRateHz?: number
  originalLength?: number // 原始数据长度，便于缩放报警点坐标
  yAxisRange: YAxisRange // y轴范围
  isWarn: boolean
  isConnect: boolean
  err_pic_path_list?: string[] // 报警图片地址
  err_data_list?: [number, number][] // 报警数据
  defectPoints?: Point[]
  defectCycles?: DefectCycle[] // 已确认异常的逐周期区间（批次内采样索引）
}

export interface ProcessedDataResponse {
  ch1: ChannelDataInfo
  ch2: ChannelDataInfo
  ch3: ChannelDataInfo
  ch4: ChannelDataInfo
  actualLength: number
  error?: string
}

export interface Point {
  x: number
  y: number
}

export type ProgramSettings = {
  interval: number // 采样周期/刷新间隔(ms)
  maxLen: number // 最大采样点数
  targetLength: number // 下采样后显示点数
  loggingEnabled: boolean // 日志采集开关
  realTimeMode: boolean // 实时模式开关
  autoSaveEnabled: boolean
  storageDir: Storage // 存储位置
  enableDebug: boolean
  debugStorage: DebugStorage
}

export type Storage = {
  alarmDataPath: string
  logPath: string
}

export type DebugStorage = {
  debugImgPath: string
  debug_total: boolean
  debug_single: boolean
  period_step: number
  enerageLevel: number
  epsilon: number // 能量等级  60 对应  epsilon 6000  rate 0.9
  //          80 对应  epsilon 6000  rate 0.9
  //          120对应  epsilon 6000  rate 0.9
  //          150对应  epsilon 10000 rate 0.8
  rate: number
  step1: number
  step2: number
}

// 设备通道类型定义
export type DeviceChannel = {
  id: number
  bCHEnable: boolean
  nCHVoltDIV: number //0 2mV 16mV        6 200mV 1.6V
  //1 5mV 40mV        7 500mV 4V(默认)
  //2 10mV 80mV       8 1V 8V
  //3 20mV 160mV      9 2V 16V
  //4 50mV 400mV      10 5V 40V
  //5 100mV 800mV      11 10V 80V
  bCHBWLimit: number // 带宽限制 1为打开带宽限制，0为关闭带宽限制
  coupling: number // 耦合方式 DC:0,AC:1
}

// 设备参数类型定义
export type DeviceSettings = {
  channels: DeviceChannel[]
  timeBaseIndex: number // 时基索引
  trigger: {
    mode: number //触发模式。0：边沿 1：脉冲 2：视频
    source: number //CH1 为0；CH2为1；CH3为2；CH4为3；如果有外部触发，则EXT 为5；如果有EXT / 10触发，则取值为6。默认0
    level: number // 触发电平
    slope: number //0：上升沿 1：下降沿
  }
  sampling: {
    bufferLength: number // 采样率
  }
}

// 统一的设置类型
export type AppSettings = {
  program: ProgramSettings
  device: DeviceSettings
}
