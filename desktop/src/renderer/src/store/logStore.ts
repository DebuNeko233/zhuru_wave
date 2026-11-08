import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import type { LogEntry } from '@renderer/types/log'

import useParamSettingStore from './paramentSetting'
import { useUserStore } from './user'
import { storeToRefs } from 'pinia'

export const useLogStore = defineStore('log', () => {
  const logs = ref<LogEntry[]>([])
  const maxLogs = ref(5000) // 最大日志条数

  const { userRole } = storeToRefs(useUserStore())
  const autoSave = ref(true)
  const isLoading = ref(false)
  const searchQuery = ref('')
  const selectedLevel = ref('all')

  // 当前加载的日期范围
  const dateRange = ref<{ start: Date; end: Date }>({
    start: new Date(),
    end: new Date()
  })

  // 计算属性
  const errorLogs = computed(() => {
    if (userRole.value === 'admin') {
      return logs.value.filter((log) => log.level === 'error')
    } else {
      return []
    }
  })
  const warnLogs = computed(() => {
    if (userRole.value === 'admin') {
      return logs.value.filter((log) => log.level === 'warn')
    } else {
      return []
    }
  })
  const infoLogs = computed(() => logs.value.filter((log) => log.level === 'info'))

  const debugLogs = computed(() => {
    if (userRole.value === 'admin') {
      return logs.value.filter((log) => log.level === 'debug')
    } else {
      return []
    }
  })

  const roleLogs = computed(() => {
    if (userRole.value === 'admin') {
      return logs.value
    } else {
      return infoLogs.value
    }
  })

  const stats = computed(() => ({
    total: roleLogs.value.length,
    error: errorLogs.value.length,
    warn: warnLogs.value.length,
    info: infoLogs.value.length,
    debug: debugLogs.value.length
  }))

  const paramentSettingStore = useParamSettingStore()

  // 按日期分组的趋势数据
  const trendData = computed(() => {
    const dayMap = new Map<string, any>()

    // 初始化日期范围内的所有天
    const current = new Date(dateRange.value.start)
    while (current <= dateRange.value.end) {
      const dateKey = current.toISOString().split('T')[0]
      dayMap.set(dateKey, {
        date: dateKey,
        count: 0,
        errors: 0,
        warns: 0,
        infos: 0,
        debugs: 0
      })
      current.setDate(current.getDate() + 1)
    }

    // 统计每天的日志数量
    logs.value.forEach((log) => {
      const logDate = new Date(log.timestamp).toISOString().split('T')[0]
      const dayData = dayMap.get(logDate)
      if (dayData) {
        dayData.count++
        switch (log.level) {
          case 'error':
            dayData.errors++
            break
          case 'warn':
            dayData.warns++
            break
          case 'info':
            dayData.infos++
            break
          case 'debug':
            dayData.debugs++
            break
        }
      }
    })

    return Array.from(dayMap.values())
  })

  // 格式化日期为文件路径
  const formatDateToPath = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return {
      folderPath: `${year}/${month}`,
      fileName: `${year}-${month}-${day}.csv`,
      filePath: `${year}/${month}/${year}-${month}-${day}.csv`
    }
  }
  const getFileFolder = () => {
    return paramentSettingStore.programSettings.storageDir.logPath
  }

  // 获取日期范围内的所有日期
  const getDateRange = (startDate: Date, endDate: Date): Date[] => {
    const dates: Date[] = []
    const current = new Date(startDate)
    while (current <= endDate) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }

    return dates
  }

  // 添加日志信息
  const addLog = async (logEntry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    if (!paramentSettingStore.programSettings.loggingEnabled) {
      return
    }

    const newLog: LogEntry = {
      ...logEntry,
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2)}`,
      timestamp: new Date()
    }

    // 如果新日志在当前的日期范围内，添加到内存中
    const logDate = new Date(newLog.timestamp)
    const isInRange = logDate >= dateRange.value.start && logDate <= dateRange.value.end
    if (isInRange) {
      logs.value.unshift(newLog)
      // 按时间顺序排序
      logs.value.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      // 限制最大日志数量
      if (logs.value.length > maxLogs.value) {
        logs.value = logs.value.slice(0, maxLogs.value)
      }
    }

    if (autoSave.value) {
      await saveToCSVFile(newLog)
    }
    return newLog
  }

  // 保存日志到CSV文件
  const saveToCSVFile = async (logEntry: LogEntry) => {
    try {
      const targetDate = new Date(logEntry.timestamp)
      const { folderPath, filePath } = formatDateToPath(targetDate)

      const basicPath = getFileFolder()

      // 确保目录存在
      await window.electronAPI.invoke('fs:ensureDir', basicPath, folderPath)

      // 检查文件是否存在，如果不存在则创建并写入表头
      const fileExists = await window.electronAPI.invoke('fs:fileExists', basicPath, filePath)
      if (!fileExists) {
        const headers = ['ID', 'Timestamp', 'Level', 'Source', 'Message', 'Details', 'Stack']
        await window.electronAPI.invoke(
          'fs:writeCSVFile',
          basicPath,
          filePath,
          headers.join(',') + '\n'
        )
      }

      // 追加日志到文件
      const csvRow = [
        logEntry.id,
        logEntry.timestamp.toISOString(),
        logEntry.level,
        logEntry.source,
        `"${logEntry.message.replace(/"/g, '""')}"`,
        logEntry.details ? `"${JSON.stringify(logEntry.details).replace(/"/g, '""')}"` : '',
        logEntry.stack ? `"${logEntry.stack.replace(/"/g, '""')}"` : ''
      ].join(',')

      await window.electronAPI.invoke('fs:appendCSVFile', basicPath, filePath, csvRow + '\n')
    } catch (error) {
      console.error('保存日志到CSV文件失败:', error)
      ElMessage.error('保存日志失败')
    }
  }

  const loadFromCSVFile = async (date: Date): Promise<LogEntry[]> => {
    try {
      const { filePath } = formatDateToPath(date)
      const fileFolder = getFileFolder()
      const fileExists = await window.electronAPI.invoke('fs:fileExists', fileFolder, filePath)
      if (!fileExists) {
        return []
      }
      const csvContent = await window.electronAPI.invoke('fs:readFile', fileFolder, filePath)
      if (!csvContent) {
        return []
      }

      // 解析csv内容

      const lines = csvContent.split('\n').filter((line) => line.trim())
      if (lines.length <= 1) {
        return []
      }

      // 跳过表头，解析数据行
      const parsedLogs: LogEntry[] = []
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i]
        const columns = parseCSVLine(line)

        if (columns.length >= 6) {
          try {
            const log: LogEntry = {
              id: columns[0],
              timestamp: new Date(columns[1]),
              level: columns[2] as LogEntry['level'],
              source: columns[3],
              message: columns[4],
              details: columns[5] ? JSON.parse(columns[5]) : undefined,
              stack: columns[6] || undefined
            }
            parsedLogs.push(log)
          } catch (parseError) {
            console.warn('解析日志行失败:', line, parseError)
          }
        }
      }
      return parsedLogs
    } catch (error) {
      console.error('加载日志失败', error)
      return []
    }
  }

  // 解析CSV行（处理引号内的逗号）
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const chart = line[i]

      if (chart === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (chart === ',' && !inQuotes) {
        result.push(current)
        current = ''
      } else {
        current += chart
      }
    }
    result.push(current)

    return result
  }

  //加载日期范围内的所有日志
  const loadDateRange = async (startDate: Date, endDate: Date) => {
    try {
      isLoading.value = true

      // 更新日期范围
      dateRange.value = { start: new Date(startDate), end: new Date(endDate) }

      // 获取日期范围内的所有日期
      const dates = getDateRange(startDate, endDate)

      // 并行加载所有日期的日志
      const allLogsPromises = dates.map((date) => loadFromCSVFile(date))

      const allLogsArrays = await Promise.all(allLogsPromises)

      // 合并所有日志并按时间排序
      const allLogs = allLogsArrays.flat()
      logs.value = allLogs.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // 限制最大日志数量
      if (logs.value.length > maxLogs.value) {
        logs.value = logs.value.slice(0, maxLogs.value)
      }

      const totalDays = dates.length
      const totalLogs = allLogs.length
      ElMessage.success(`成功加载 ${totalDays} 天共 ${totalLogs} 条日志`)

      // await new Promise(resolve => setTimeout(resolve, 1500));
    } catch (error) {
      console.error('加载日期范围日志失败:', error)
      ElMessage.error('加载日志失败')
      logs.value = []
    } finally {
      isLoading.value = false
    }
  }

  // 加载前七天的日志(默认)
  const loadLastSevenDays = async () => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 6)
    await loadDateRange(startDate, endDate)
  }

  // 加载指定单天的日志
  const loadSingleDay = async (date: Date) => {
    await loadDateRange(date, date)
  }

  // 加载今天的日志
  const loadToday = async () => {
    await loadSingleDay(new Date())
  }

  // 加载昨天的日志
  const loadYesterday = async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    await loadSingleDay(yesterday)
  }

  // 加载最近N天的日志
  const loadRecentDays = async (days: number) => {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (days - 1))

    await loadDateRange(startDate, endDate)
  }

  // 清空当前加载的日志
  const clearLogs = async () => {
    logs.value = []
    ElMessage.success('日志已清空')
  }

  // 清空指定级别的日志信息
  const clearLogsByLevel = (level: LogEntry['level']) => {
    const beforeCount = logs.value.length
    logs.value = logs.value.filter((log) => log.level !== level)
    const afterCount = logs.value.length

    ElMessage.success(`已清空 ${beforeCount - afterCount} 条 ${level} 级别日志`)
  }

  // 根据id删除当前日志
  const removeLog = (id: string) => {
    const index = logs.value.findIndex((log) => log.id === id)
    if (index !== -1) {
      logs.value.splice(index, 1)
      return true
    }
    return false
  }

  // 获取指定id的日志
  const getLogById = (id: string) => {
    return logs.value.find((log) => log.id === id)
  }

  // 导出当前日志
  const exportLogs = (format: 'json' | 'csv' = 'json') => {
    if (format === 'json') {
      return JSON.stringify(logs.value, null, 2)
    } else {
      const headers = ['ID', '时间', '级别', '来源', '消息', '详情', '栈信息']
      const csvContent = [
        headers.join(','),
        ...logs.value.map((log) =>
          [
            log.id,
            log.timestamp.toISOString(),
            log.level,
            log.source,
            `"${log.message.replace(/"/g, '""')}"`,
            log.details ? `"${JSON.stringify(log.details).replace(/"/g, '""')}"` : '',
            log.stack ? `"${log.stack.replace(/"/g, '""')}"` : ''
          ].join(',')
        )
      ].join('\n')
      return csvContent
    }
  }

  // 导入日志
  const importLogs = (data: LogEntry[]) => {
    try {
      const vaildLogs = data.filter(
        (log) => log.id && log.timestamp && log.level && log.source && log.message
      )

      logs.value = [...vaildLogs]
      ElMessage.success(`成功导入 ${vaildLogs.length} 条日志`)
      return true
    } catch (error) {
      ElMessage.error('导入日志失败')
      return false
    }
  }

  // 设置方法
  const setSearchQuery = (query: string) => {
    searchQuery.value = query
  }

  const setSelectedLevel = (level: string) => {
    selectedLevel.value = level
  }

  const setAutoSave = (enabled: boolean) => {
    autoSave.value = enabled
  }

  // 初始化时加载前七天的日志
  const initialize = async () => {
    await loadLastSevenDays()
  }

  return {
    // 状态
    logs,
    maxLogs,
    autoSave,
    isLoading,
    searchQuery,
    selectedLevel,
    dateRange,
    roleLogs,

    // 计算属性
    errorLogs,
    warnLogs,
    infoLogs,
    debugLogs,
    stats,
    trendData,

    // 方法
    addLog,
    clearLogs,
    clearLogsByLevel,
    removeLog,
    getLogById,
    exportLogs,
    importLogs,

    // 日期加载方法
    loadDateRange,
    loadLastSevenDays,
    loadSingleDay,
    loadToday,
    loadYesterday,
    loadRecentDays,

    // 设置方法
    setSearchQuery,
    setSelectedLevel,
    setAutoSave,

    // 初始化
    initialize
  }
})
