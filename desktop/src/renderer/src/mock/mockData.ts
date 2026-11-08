import type { LogEntry } from '@renderer/types/log'

// 模拟数据生成器
export class MockDataGenerator {
  private static logSources = [
    'System',
    'Database',
    'API',
    'Authentication',
    'FileSystem',
    'Network',
    'Cache',
    'Queue',
    'Scheduler',
    'WebSocket'
  ]

  private static infoMessages = [
    '用户登录成功',
    '数据同步完成',
    '缓存更新成功',
    '定时任务执行完成',
    '文件上传成功',
    '连接建立成功',
    '配置加载完成',
    '服务启动成功',
    '数据备份完成',
    '邮件发送成功'
  ]

  private static warnMessages = [
    '内存使用率较高',
    '磁盘空间不足',
    '连接超时重试',
    '缓存命中率低',
    '响应时间较慢',
    '队列积压较多',
    '数据库连接池不足',
    'API调用频率过高',
    '文件大小超出建议值',
    '网络延迟较高'
  ]

  private static errorMessages = [
    '数据库连接失败',
    '文件读取错误',
    '网络请求超时',
    '认证失败',
    '权限不足',
    '数据格式错误',
    '服务不可用',
    '内存溢出',
    '磁盘写入失败',
    '配置文件损坏'
  ]

  private static debugMessages = [
    '开始执行查询操作',
    '缓存键值对更新',
    '请求参数验证通过',
    '开始文件处理流程',
    '数据转换完成',
    '开始建立数据库连接',
    '解析配置文件',
    '初始化组件',
    '开始数据校验',
    '执行清理操作'
  ]

  private static errorDetails = [
    {
      code: 'DB_CONNECTION_ERROR',
      stack:
        'Error: Connection timeout\n    at Database.connect (db.js:45)\n    at async main (index.js:12)'
    },
    {
      code: 'FILE_NOT_FOUND',
      stack:
        'Error: ENOENT: no such file or directory\n    at FileSystem.readFile (fs.js:123)\n    at processFile (handler.js:67)'
    },
    {
      code: 'NETWORK_TIMEOUT',
      stack:
        'Error: Request timeout after 30000ms\n    at HttpClient.request (http.js:234)\n    at API.call (api.js:89)'
    },
    {
      code: 'AUTH_FAILED',
      stack:
        'Error: Invalid credentials\n    at Auth.verify (auth.js:156)\n    at middleware (auth.js:23)'
    }
  ]

  /**
   * 生成单条日志
   */
  static generateSingleLog(level?: LogEntry['level']): LogEntry {
    const levels: LogEntry['level'][] = ['info', 'warn', 'error', 'debug']
    const selectedLevel = level || levels[Math.floor(Math.random() * levels.length)]
    const source = this.logSources[Math.floor(Math.random() * this.logSources.length)]

    let message: string
    let details: any = undefined
    let stack: string | undefined = undefined

    switch (selectedLevel) {
      case 'info':
        message = this.infoMessages[Math.floor(Math.random() * this.infoMessages.length)]
        break
      case 'warn':
        message = this.warnMessages[Math.floor(Math.random() * this.warnMessages.length)]
        details = {
          threshold: Math.floor(Math.random() * 100),
          current: Math.floor(Math.random() * 150),
          suggestion: '建议优化相关配置'
        }
        break
      case 'error':
        message = this.errorMessages[Math.floor(Math.random() * this.errorMessages.length)]
        const errorDetail = this.errorDetails[Math.floor(Math.random() * this.errorDetails.length)]
        details = {
          errorCode: errorDetail.code,
          timestamp: new Date().toISOString(),
          userId: Math.floor(Math.random() * 10000)
        }
        stack = errorDetail.stack
        break
      case 'debug':
        message = this.debugMessages[Math.floor(Math.random() * this.debugMessages.length)]
        details = {
          executionTime: Math.floor(Math.random() * 1000) + 'ms',
          memoryUsage: Math.floor(Math.random() * 100) + 'MB',
          threadId: Math.floor(Math.random() * 16)
        }
        break
    }

    return {
      id: `log_${Date.now()}_${Math.random().toString(36).substr(2)}`,
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000), // 最近24小时内
      level: selectedLevel,
      source,
      message,
      details,
      stack
    }
  }

  /**
   * 生成多条日志
   */
  static generateLogs(count: number): LogEntry[] {
    const logs: LogEntry[] = []
    for (let i = 0; i < count; i++) {
      logs.push(this.generateSingleLog())
    }
    // 按时间排序
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /**
   * 生成指定日期范围的日志
   */
  static generateLogsForDateRange(
    startDate: Date,
    endDate: Date,
    logsPerDay: number = 50
  ): LogEntry[] {
    const logs: LogEntry[] = []
    const current = new Date(startDate)

    while (current <= endDate) {
      const dayLogs = this.generateLogsForDay(new Date(current), logsPerDay)
      logs.push(...dayLogs)
      current.setDate(current.getDate() + 1)
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /**
   * 生成指定日期的日志
   */
  static generateLogsForDay(date: Date, count: number): LogEntry[] {
    const logs: LogEntry[] = []
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    for (let i = 0; i < count; i++) {
      const log = this.generateSingleLog()
      // 设置为指定日期内的随机时间
      const randomTime =
        startOfDay.getTime() + Math.random() * (endOfDay.getTime() - startOfDay.getTime())
      log.timestamp = new Date(randomTime)
      log.id = `log_${randomTime}_${Math.random().toString(36).substr(2)}`
      logs.push(log)
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /**
   * 生成实时日志（模拟实时产生）
   */
  static generateRealtimeLog(): LogEntry {
    // 70% 概率生成 info，20% warn，8% error，2% debug
    const rand = Math.random()
    let level: LogEntry['level']

    if (rand < 0.7) {
      level = 'info'
    } else if (rand < 0.9) {
      level = 'warn'
    } else if (rand < 0.98) {
      level = 'error'
    } else {
      level = 'debug'
    }

    const log = this.generateSingleLog(level)
    log.timestamp = new Date() // 当前时间
    log.id = `log_${Date.now()}_${Math.random().toString(36).substr(2)}`

    return log
  }

  /**
   * 生成批量测试数据
   */
  static generateTestData() {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    return {
      // 最近7天的日志
      recentLogs: this.generateLogsForDateRange(sevenDaysAgo, now, 30),
      // 今天的日志
      todayLogs: this.generateLogsForDay(now, 50),
      // 昨天的日志
      yesterdayLogs: this.generateLogsForDay(new Date(now.getTime() - 24 * 60 * 60 * 1000), 45),
      // 高频错误日志
      errorLogs: Array.from({ length: 20 }, () => this.generateSingleLog('error')),
      // 调试日志
      debugLogs: Array.from({ length: 15 }, () => this.generateSingleLog('debug'))
    }
  }
}

// 导出便捷方法
export const generateMockLogs = (count: number = 100) => MockDataGenerator.generateLogs(count)
export const generateRealtimeLog = () => MockDataGenerator.generateRealtimeLog()
export const generateTestData = () => MockDataGenerator.generateTestData()
