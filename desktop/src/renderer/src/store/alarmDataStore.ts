import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'
import type {
  AlarmData,
  AlarmDataReturnType,
  AlarmFileData,
  ChannelAlarmState
} from '@renderer/types/alarmData'
import { useLogStore } from './logStore'
import useParamSettingStore from './paramentSetting'
import { useUserStore } from '@renderer/store/user'
import { storeToRefs } from 'pinia'

const createDefaultChannelState = (): ChannelAlarmState => ({
  alarmList: [],
  currentPage: 1,
  pageSize: 5,
  totalCount: 0,
  totalPages: 0,
  hasNext: false,
  hasPrevious: false,
  loading: false,
  error: null,
  MonthCount: 0, // 新增：当前月份报警计数
  todayCount: 0 // 新增：当日报警计数
})

const useAlarmDataStore = defineStore('alarmData', () => {
  const channels = reactive<Record<number, ChannelAlarmState>>({
    1: createDefaultChannelState(),
    2: createDefaultChannelState(),
    3: createDefaultChannelState(),
    4: createDefaultChannelState()
  })

  const logStore = useLogStore()
  const userStore = useUserStore()
  const paramentSettingStore = useParamSettingStore()
  const { userInfo } = storeToRefs(userStore)
  const lastAlarmTime = ref()

  const getAlarmDataPath = (channel: number = 1) => {
    const folderPath = paramentSettingStore.programSettings.storageDir.alarmDataPath
    return `${folderPath}/channel${channel}/`
  }

  // 获取指定通道的状态
  const getChannelState = (channel: number): ChannelAlarmState => {
    if (!channels[channel]) {
      channels[channel] = createDefaultChannelState()
    }
    return channels[channel]
  }

  // 加载指定通道的报警数据(分页)
  const loadAlarmsData = async (channel: number, page: number = 1, pageSize: number = 5) => {
    const state = getChannelState(channel)

    try {
      state.loading = true
      state.error = null

      const folderPath = getAlarmDataPath(channel)

      const result: AlarmDataReturnType = await window.electronAPI.invoke(
        'fs:read-alarm-files',
        folderPath,
        page,
        pageSize
      )

      if (result.success && result.data) {
        // 更新该通道的状态
        state.alarmList = result.data
        state.currentPage = result.pagination.currentPage
        state.pageSize = result.pagination.pageSize
        state.totalCount = result.pagination.totalCount
        state.totalPages = result.pagination.totalPages
        state.hasNext = result.pagination.hasNext
        state.hasPrevious = result.pagination.hasPrevious
        state.todayCount = result.pagination.todayCount
        // 统计当前月份的报警数量
        state.MonthCount = result.pagination.MonthCount

        logStore.addLog({
          level: 'info',
          message: `${userInfo.value?.id === 'null' ? '' : userInfo.value?.username}加载了通道${channel}的报警数据`,
          source: `报警数据信息`,
          details: `加载了${state.totalCount}条报警数据,当前第${state.currentPage}页,每页${state.pageSize}条,当天报警数量:${state.todayCount}`
        })

        return {
          success: true,
          data: result.data,
          pagination: result.pagination
        }
      } else {
        state.error = result.error || '加载报警数据失败'

        return {
          success: false,
          error: state.error
        }
      }
    } catch (err) {
      state.error = err instanceof Error ? err.message : '未知错误'

      logStore.addLog({
        level: 'error',
        message: `${userInfo.value?.id === 'null' ? '' : userInfo.value?.username}加载通道${channel}的报警数据失败`,
        source: `报警数据信息`,
        stack: `${state.error}`
      })

      return {
        success: false,
        error: state.error
      }
    } finally {
      state.loading = false
    }
  }

  // 加载下一页
  const loadNextPage = async (channel: number) => {
    const state = getChannelState(channel)
    if (state.hasNext) {
      return await loadAlarmsData(channel, state.currentPage + 1, state.pageSize)
    }
    return { success: false, error: '没有下一页' }
  }

  // 加载上一页
  const loadPreviousPage = async (channel: number) => {
    const state = getChannelState(channel)
    if (state.hasPrevious) {
      return await loadAlarmsData(channel, state.currentPage - 1, state.pageSize)
    }
    return { success: false, error: '没有上一页' }
  }

  // 跳转到指定页
  const goToPage = async (channel: number, page: number) => {
    const state = getChannelState(channel)
    if (page >= 1 && page <= state.totalPages) {
      return await loadAlarmsData(channel, page, state.pageSize)
    }
    return {
      success: false,
      error: '页码超出范围了'
    }
  }

  // 设置页面的大小
  const setPageSize = async (channel: number, size: number) => {
    const state = getChannelState(channel)
    state.pageSize = size
    logStore.addLog({
      level: 'info',
      message: `设置页面的大小`,
      source: '报警数据信息',
      details: `设置通道${channel}的页面大小为${size}`
    })
    return await loadAlarmsData(channel, 1, size) //重置回到第一页
  }
  // 刷新当前页面的数据
  const refreshCurrentPage = async (channel: number) => {
    const state = getChannelState(channel)
    logStore.addLog({
      level: 'info',
      message: `刷新当前页面的数据`,
      source: '报警数据信息',
      details: `${userInfo.value?.id === 'null' ? '' : userInfo.value?.username}刷新了通道${channel}的页面数据`
    })
    return await loadAlarmsData(channel, state.currentPage, state.pageSize)
  }

  // 添加新报警
  const addAlarm = async (channel: number, alramData: Omit<AlarmData, 'id'>) => {
    try {
      const newAlarm: AlarmData = {
        ...alramData,
        id: `alarm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      // 保存到文件
      const folderPath = getAlarmDataPath(channel)
      const fileName = `${newAlarm.id}.json`

      lastAlarmTime.value = Date.now()

      try {
        const result = await window.electronAPI.invoke(
          'fs:save-alarm-file',
          folderPath,
          fileName,
          newAlarm
        )
        console.log('文件保存结果:', result)

        if (result.success) {
          console.log('✅ 文件保存成功，路径:', result.filePath)

          // 更新当天报警计数
          const state = getChannelState(channel)

          state.todayCount += 1
          state.MonthCount += 1
          state.totalCount += 1

          // 刷新当前页面数据
          return await refreshCurrentPage(channel)
        } else {
          console.error('❌ 文件保存失败:', result.error)
          const state = getChannelState(channel)
          state.error = result.error || '文件保存失败'
          return { success: false, error: state.error }
        }
      } catch (ipcError) {
        console.error('❌ IPC调用失败:', ipcError)
        const state = getChannelState(channel)
        state.error = `IPC调用失败: ${ipcError instanceof Error ? ipcError.message : '未知错误'}`
        return { success: false, error: state.error }
      }
    } catch (err) {
      console.error('❌ addAlarm 函数执行失败:', err)
      const state = getChannelState(channel)
      state.error = err instanceof Error ? err.message : '保存报警数据失败'
      return { success: false, error: state.error }
    }
  }

  // 获取指定通道的当天报警数量
  const getTodayAlarmCount = (channel: number): number => {
    const state = getChannelState(channel)
    return state.todayCount
  }

  // 刷新所有通道的当天报警计数（可用于跨日期时重置计数）
  const refreshTodayCount = async () => {
    const promises = [1, 2, 3, 4].map(async (channel) => {
      const state = getChannelState(channel)
      return state.todayCount
    })
    await Promise.all(promises)
  }

  // 清空指定通道的报警列表(仅清空内存中的数据)
  const clearAlarms = (channel: number) => {
    const state = getChannelState(channel)
    state.alarmList = []
    state.currentPage = 1
    state.totalCount = 0
    state.totalPages = 0
    state.hasNext = false
    state.hasPrevious = false
    state.error = null
  }

  const clearAllChannelsAlarms = () => {
    ;[1, 2, 3, 4].forEach((channel) => clearAlarms(channel))
  }

  // 获取指定通道的分页信息
  const getPaginationInfo = (channel: number) => {
    const state = getChannelState(channel)
    return {
      currentPage: state.currentPage,
      pageSize: state.pageSize,
      totalCount: state.totalCount,
      totalPages: state.totalPages,
      hasNext: state.hasNext,
      hasPrevious: state.hasPrevious
    }
  }

  // 获取指定通道的报警列表
  const getAlarmList = (channel: number): AlarmFileData[] => {
    return getChannelState(channel).alarmList
  }

  // 获取指定通道的加载状态
  const getLoadingState = (channel: number) => {
    const state = getChannelState(channel)
    return {
      loading: state.loading,
      error: state.error
    }
  }

  // 初始化所有通道数据
  const initializeAllChannels = async () => {
    const promises = [1, 2, 3, 4].map((channel) => loadAlarmsData(channel, 1, 5))
    return await Promise.allSettled(promises)
  }

  return {
    // 状态
    channels,
    lastAlarmTime,
    // 方法
    loadAlarmsData,
    loadNextPage,
    loadPreviousPage,
    goToPage,
    setPageSize,
    refreshCurrentPage,
    addAlarm,
    clearAlarms,
    clearAllChannelsAlarms,
    getPaginationInfo,
    getAlarmList,
    getLoadingState,
    getChannelState,
    initializeAllChannels,
    refreshTodayCount,
    getTodayAlarmCount
  }
})

export default useAlarmDataStore
