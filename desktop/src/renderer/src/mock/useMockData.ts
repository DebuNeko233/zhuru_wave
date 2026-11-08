import { MockDataGenerator } from '@renderer/mock/mockData'
import { useLogStore } from '@renderer/store/logStore'

// 在组件中使用模拟数据
export function useMockData() {
  const logStore = useLogStore()

  // 初始化模拟数据
  const initMockData = async () => {
    try {
      // 生成最近7天的模拟数据
      const testData = MockDataGenerator.generateTestData()

      // 批量添加到 store
      for (const log of testData.recentLogs) {
        await logStore.addLog({
          level: log.level,
          message: log.message,
          source: log.source,
          details: log.details,
          stack: log.stack
        })
      }

      console.log('模拟数据初始化完成')
    } catch (error) {
      console.error('模拟数据初始化失败:', error)
    }
  }

  // 启动实时日志模拟
  const startRealtimeSimulation = () => {
    return setInterval(async () => {
      const realtimeLog = MockDataGenerator.generateRealtimeLog()
      await logStore.addLog({
        level: realtimeLog.level,
        message: realtimeLog.message,
        source: realtimeLog.source,
        details: realtimeLog.details,
        stack: realtimeLog.stack
      })
    }, 2000) // 每2秒生成一条新日志
  }

  // 生成特定类型的日志
  const generateSpecificLogs = async (
    level: 'info' | 'warn' | 'error' | 'debug',
    count: number = 10
  ) => {
    for (let i = 0; i < count; i++) {
      const log = MockDataGenerator.generateSingleLog(level)
      await logStore.addLog({
        level: log.level,
        message: log.message,
        source: log.source,
        details: log.details,
        stack: log.stack
      })
    }
  }

  return {
    initMockData,
    startRealtimeSimulation,
    generateSpecificLogs
  }
}
