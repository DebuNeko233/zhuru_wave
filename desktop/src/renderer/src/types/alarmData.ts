import type { Point, DefectCycle } from '@main/type'
// 报警数据接口
export interface AlarmData {
  id: string
  channelId: string | number
  timestamp: number
  severity?: 'critical' | 'warning'
  triggerValue?: number
  threshold?: number
  unit?: string
  duration?: number
  analysisConclusion: string
  snapshotData: {
    waveformData: number[]
    statistics: {
      peakVoltage: number
      minimumVoltage: number
      averageVoltage: number
      range: string
      deviation: string
      status: string
    }
    yAxisRange: {
      min: number
      max: number
    }
    err_pic_path_list: string[]
    err_data_list?: [number, number][]
    defectPoints?: Point[]
    defectCycles?: DefectCycle[]
  }
}

export interface AlarmFileData extends AlarmData {
  fileName: string
  filePath: string
  fileModified: Date
}

export interface AlarmDataReturnType {
  success: boolean
  data: AlarmFileData[]
  error?: string
  pagination: {
    currentPage: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
    todayCount: number // 新增：当日报警计数
    MonthCount: number // 新增：当前月份报警计数
  }
}

export interface ChannelAlarmState {
  alarmList: AlarmFileData[]
  currentPage: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrevious: boolean
  loading: boolean
  error: string | null
  MonthCount: number // 新增：当前月份报警计数
  todayCount: number // 新增：当日报警计数
}
