import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

import type { ChannelDataInfo, ProcessedDataResponse } from '@main/type'
import useAlarmDataStore from '@renderer/store/alarmDataStore'
import { useLogStore } from './logStore'
import useParamSettingStore from './paramentSetting'
import { useAlarmNotification } from '@renderer/components/AlarmNotification/useAlarmNotification'
import type { AlarmData } from '@renderer/types/alarmData'
import { ElMessage } from 'element-plus'

// 深度克隆函数，确保所有数据都是可序列化的
const deepClone = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (Array.isArray(obj)) return obj.map(deepClone)

  const cloned: any = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key])
    }
  }
  return cloned
}
export const useChannelDataStore = defineStore('channelData', () => {
  // 启动时不预填测试波形；只有真实采集或明确导入后才显示通道数据。
  const createEmptyChannel = (): ChannelDataInfo => ({
    peakVoltage: 0,
    averageVoltage: 0,
    minimumVoltage: 0,
    status: '未连接',
    deviation: '0',
    range: '0',
    showData: [],
    yAxisRange: { min: -100, max: 100 },
    isWarn: false,
    isConnect: false,
    err_pic_path_list: [],
    err_data_list: [],
    defectPoints: [],
    defectCycles: []
  })

  const channelData: ChannelDataInfo[] = reactive(
    Array.from({ length: 4 }, () => createEmptyChannel())
  )

  const alarmDataStore = useAlarmDataStore()
  const logStore = useLogStore()
  const paramentSetting = useParamSettingStore()

  const { showAlarmNotification } = useAlarmNotification()

  // const channelData:ChannelDataInfo[] = reactive([]);
  const sampleRate = ref(125000)

  const actualLength = ref(0)

  const initloading = ref(false)

  const deviceInit = ref(false)
  const reconnectRestarting = ref(false)

  // const startBackgroundCollection = async () => {
  //     try{
  //         console.log("启动后台数据采集....")
  //          const settings = JSON.parse(JSON.stringify(paramentSetting.allSettings))
  //         const result = await window.electronAPI.invoke('data:start-collection',settings)
  //         console.log("后台数据采集启动结果",result)
  //     }catch(error){
  //         console.error("启动后台数据采集失败",error)
  //     }
  // }
  // const stopBackgroundCollection = async () => {
  //     try{
  //         console.log("停止后台数据采集....")
  //         const result = await window.electronAPI.invoke('data:stop-collection')
  //         console.log("后台数据采集停止结果",result)
  //     }catch(error){
  //         console.error("停止后台数据采集失败",error)
  //     }
  // }

  // // 同时修改 initializeAndStart 函数
  // const initializeAndStart = async () => {
  //     try {

  //         console.log('设置参数')
  //         // 使用JSON序列化来移除响应式属性
  //         const deviceSettingsData = JSON.parse(JSON.stringify(paramentSetting.deviceSettings))
  //         await window.electronAPI.invoke('data:setParam', deviceSettingsData)
  //         await logStore.addLog({
  //             level: 'info',
  //             message: `Store: 设置参数...`,
  //             source: '通道数据信息',
  //         })

  //         console.log('初始化设备...')
  //         const initResult = await window.electronAPI.invoke('data:init-device')
  //         console.log('初始化设备结果',initResult)
  //         if(!initResult){
  //             console.error('初始化设备失败')
  //             await logStore.addLog({
  //                 level: 'error',
  //                 message: `Store: 初始化设备失败`,
  //                 source: '通道数据信息',
  //             })
  //             return
  //         }
  //         await logStore.addLog({
  //             level: 'info',
  //             message: `Store: 初始化设备...`,
  //             source: '通道数据信息',
  //         })
  //         const status = await window.electronAPI.invoke('data:get-device-status')
  //         console.log('设备状态:', status)

  //         await logStore.addLog({
  //             level: 'info',
  //             message: `Store: 获取当前设备状态`,
  //             source: '通道数据信息',
  //             details: `当前设备状态: ${JSON.stringify(status)}`
  //         })

  //         if (!status.isInitialized) {
  //             console.log('设备未初始化，将在启动数据采集时自动初始化')

  //             await logStore.addLog({
  //                 level: 'error',
  //                 message: `Store: 设备未初始化，将在启动数据采集时自动初始化`,
  //                 source: '通道数据信息',
  //             })
  //         }else{
  //             console.log('设备已初始化，获取采样率...')

  //             await logStore.addLog({
  //                 level: 'info',
  //                 message: `Store: 设备已初始化，获取采样率...`,
  //                 source: '通道数据信息',
  //             })
  //         try{
  //             const rate = await window.electronAPI.invoke('data:get-sample-rate')
  //             sampleRate.value = rate
  //             console.log('采样率:', rate)

  //             await logStore.addLog({
  //                 level: 'info',
  //                 message: `Store: 获取采样率成功`,
  //                 source: '通道数据信息',
  //                 details: `采样率: ${rate}`,
  //             })
  //         }catch(error:any){
  //             console.warn('获取采样率失败，使用默认值:', error)
  //             await logStore.addLog({
  //                 level: 'error',
  //                 message: `Store: 获取采样率失败，使用默认值:`,
  //                 source: '通道数据信息',
  //                 stack: `${error.stack}`,
  //             })
  //         }

  //         }
  //         // 启动后台数据采集
  //         await startBackgroundCollection()
  //     } catch (error:any) {
  //         console.error('初始化过程中出错:', error)
  //          await logStore.addLog({
  //                 level: 'error',
  //                 message: `Store: 初始化过程中出错`,
  //                 source: '通道数据信息',
  //                 stack: `${error.stack}`,
  //             })
  //     }
  // }

  // 新增：专门的设备初始化方法

  // 计算数据统计信息的辅助函数
  const calculateStatistics = (data: number[]) => {
    if (!data || data.length === 0) {
      return {
        peakVoltage: 0,
        averageVoltage: 0,
        minimumVoltage: 0,
        deviation: '0',
        range: '0V',
        yAxisRange: { min: 0, max: 0 }
      }
    }

    // 峰值电压、最小电压、平均电压、峰峰值均使用绝对值后的数据计算
    const absData = data.map((v) => Math.abs(v))
    const max = Math.max(...absData)
    const min = Math.min(...absData)
    const average = absData.reduce((sum, val) => sum + val, 0) / absData.length

    // 计算标准差（使用原始数据）
    const originalMean = data.reduce((sum, val) => sum + val, 0) / data.length
    const variance = data.reduce((sum, val) => sum + Math.pow(val - originalMean, 2), 0) / data.length
    const standardDeviation = Math.sqrt(variance)

    // 计算Y轴范围（添加一些边距，使用原始数据范围用于显示）
    const rawMax = Math.max(...data)
    const rawMin = Math.min(...data)
    const margin = (rawMax - rawMin) * 0.1 // 10%边距
    const yMin = rawMin - margin
    const yMax = rawMax + margin

    return {
      peakVoltage: parseFloat(max.toFixed(2)),
      averageVoltage: parseFloat(average.toFixed(2)),
      minimumVoltage: parseFloat(min.toFixed(2)),
      deviation: standardDeviation.toFixed(2),
      range: `${(max - min).toFixed(2)}V`,
      yAxisRange: {
        min: parseFloat(yMin.toFixed(2)),
        max: parseFloat(yMax.toFixed(2))
      }
    }
  }

  // 加载默认数据的函数 - 从analyze目录读取4个CSV文件的前10000个数据点
  const loadDefaultData = async () => {
    try {
      console.log('🔄 开始加载默认数据...')
      await logStore.addLog({
        level: 'info',
        message: '开始加载analyze目录下的CSV文件数据',
        source: '通道数据信息'
      })

      const defaultData = await window.electronAPI.invoke('fs:read-analyze-csv-files', 10000)

      // 更新每个通道的showData和相关统计信息
      for (let i = 0; i < Math.min(channelData.length, defaultData.length); i++) {
        if (defaultData[i] && defaultData[i].length > 0) {
          // 更新showData
          channelData[i].showData = defaultData[i]

          // 计算并更新统计信息
          const stats = calculateStatistics(defaultData[i])
          channelData[i].peakVoltage = stats.peakVoltage
          channelData[i].averageVoltage = stats.averageVoltage
          channelData[i].minimumVoltage = stats.minimumVoltage
          channelData[i].deviation = stats.deviation
          channelData[i].range = stats.range
          channelData[i].yAxisRange = stats.yAxisRange

          // 更新状态信息
          channelData[i].status = '正常'
          channelData[i].isWarn = false
          channelData[i].isConnect = true
        } else {
          console.log(`⚠️ 通道${i + 1}没有可用数据`)
          // 重置为默认值
          const emptyStats = calculateStatistics([])
          channelData[i].peakVoltage = emptyStats.peakVoltage
          channelData[i].averageVoltage = emptyStats.averageVoltage
          channelData[i].minimumVoltage = emptyStats.minimumVoltage
          channelData[i].deviation = emptyStats.deviation
          channelData[i].range = emptyStats.range
          channelData[i].yAxisRange = emptyStats.yAxisRange
          channelData[i].status = '无数据'
          channelData[i].isConnect = false
        }
      }

      console.log('✅ 默认数据加载完成')
      await logStore.addLog({
        level: 'info',
        message: '默认数据加载完成，所有统计信息已更新',
        source: '通道数据信息'
      })

      return true
    } catch (error: any) {
      console.error('💥 加载默认数据失败:', error)
      await logStore.addLog({
        level: 'error',
        message: '加载默认数据失败: ' + (error.message || '未知错误'),
        source: '通道数据信息',
        stack: error.stack
      })
      return false
    }
  }

  const initializeDevice = async () => {
    try {
      console.log('🔧 开始初始化设备...')
      await logStore.addLog({
        level: 'debug',
        message: '开始设备初始化流程',
        source: '设备信息'
      })

      // 设置参数并初始化设备
      const allSettings = JSON.parse(JSON.stringify(paramentSetting.allSettings))
      const result = await window.electronAPI.invoke('data:initialize-device', allSettings)

      if (result.success) {
        console.log('✅ 设备初始化成功')
        await logStore.addLog({
          level: 'debug',
          message: result.message,
          source: '设备信息'
        })

        // 获取设备状态和采样率
        const status = await window.electronAPI.invoke('data:get-device-status')
        console.log('设备状态:', status)

        if (status.isInitialized) {
          try {
            const rate = await window.electronAPI.invoke('data:get-sample-rate')
            sampleRate.value = rate
            console.log('采样率:', rate)

            await logStore.addLog({
              level: 'debug',
              message: '获取采样率成功',
              source: '设备信息',
              details: `采样率: ${rate}`
            })
          } catch (error: any) {
            console.warn('获取采样率失败，使用默认值:', error)
            await logStore.addLog({
              level: 'warn',
              message: '获取采样率失败，使用默认值',
              source: '设备信息',
              stack: error.stack
            })
          }
        }

        return true
      } else {
        await logStore.addLog({
          level: 'error',
          message: `设备初始化失败:`,
          details: result.error,
          source: '设备信息'
        })
        return false
      }
    } catch (error: any) {
      console.error('💥 设备初始化过程中出错:', error)
      await logStore.addLog({
        level: 'error',
        message: '设备初始化过程中出错',
        source: '设备信息',
        stack: error.stack
      })
      return false
    }
  }

  // 新增：专门的数据采集启动方法

  const startDataCollection = async () => {
    try {
      console.log('🚀 开始启动数据采集...')
      // await logStore.addLog({
      //     level: 'info',
      //     message: 'Store: 开始启动数据采集',
      //     source: '通道数据信息',
      // })

      // const status = await window.electronAPI.invoke('data:get-device-status')
      // if (!status.isInitialized) {
      //     console.error('❌ 设备未初始化，无法启动数据采集')
      //     await logStore.addLog({
      //         level: 'error',
      //         message: 'Store: 设备未初始化，无法启动数据采集',
      //         source: '通道数据信息',
      //     })
      //     return false
      // }

      // 启动数据采集
      const settings = JSON.parse(JSON.stringify(paramentSetting.allSettings))
      const result = await window.electronAPI.invoke('data:start-collection', settings)

      if (result.success) {
        console.log('数据采集启动成功')
        await logStore.addLog({
          level: 'debug',
          message: '数据采集启动成功',
          source: '设备信息'
        })
        return true
      } else {
        console.error('数据采集启动失败:', result.error)
        await logStore.addLog({
          level: 'error',
          message: `数据采集启动失败: ${result.error}`,
          source: '设备信息'
        })
        return false
      }
    } catch (error: any) {
      console.error('💥 启动数据采集过程中出错:', error)
      await logStore.addLog({
        level: 'error',
        message: '启动数据采集过程中出错',
        source: '设备信息',
        stack: error.stack
      })
      return false
    }
  }

  const startBackgroundCollection = async () => {
    try {
      console.log('启动后台数据采集....')
      const settings = JSON.parse(JSON.stringify(paramentSetting.allSettings))
      const result = await window.electronAPI.invoke('data:start-collection', settings)
      console.log('后台数据采集启动结果', result)
      return result.success
    } catch (error) {
      console.error('启动后台数据采集失败', error)
      return false
    }
  }

  const stopBackgroundCollection = async () => {
    try {
      console.log('停止后台数据采集....')
      const result = await window.electronAPI.invoke('data:stop-collection')
      console.log('后台数据采集停止结果', result)
      return result.success
    } catch (error) {
      console.error('停止后台数据采集失败', error)
      return false
    }
  }

  // 修改后的 initializeAndStart 函数 - 现在分为两个步骤
  const initializeAndStart = async () => {
    initloading.value = true
    try {
      console.log('开始初始化和启动流程...')

      // 步骤1: 初始化设备
      const initSuccess = await initializeDevice()

      if (!initSuccess) {
        console.error('设备初始化失败，终止流程')
        ElMessage.error('设备初始化失败，已进入本地模式')
        // 如果初始化失败，就进入本地模式
        paramentSetting.programSettings.realTimeMode = false

        // 启动设备轮询，检测设备重新连接
        try {
          console.log('启动设备轮询，检测设备重新连接...')
          const allSettings = JSON.parse(JSON.stringify(paramentSetting.allSettings))

          const pollingResult = await window.electronAPI.invoke(
            'data:start-device-polling',
            allSettings
          )
          if (pollingResult.success) {
            await logStore.addLog({
              level: 'debug',
              message: '因设备初始化失败，启动设备轮询',
              details: pollingResult.message,
              source: '设备信息'
            })
          } else {
            await logStore.addLog({
              level: 'error',
              message: '启动轮询失败',
              details: pollingResult.error,
              source: '设备信息'
            })
          }
        } catch (pollingError) {
          console.error('启动设备轮询失败:', pollingError)
          await logStore.addLog({
            level: 'error',
            message: '因设备初始化失败,启动设备轮询发生预料之外从错误',
            source: '设备信息',
            stack: pollingError instanceof Error ? pollingError.stack : undefined
          })
        }

        return false
      }
      paramentSetting.programSettings.realTimeMode = true
      deviceInit.value = true
      // 步骤2: 启动数据采集
      const startSuccess = await startDataCollection()
      if (!startSuccess) {
        console.error('❌ 数据采集启动失败')
        return false
      }

      console.log('✅ 完整的初始化和启动流程完成')
      await logStore.addLog({
        level: 'debug',
        message: '完整的初始化和启动流程完成',
        source: '设备信息'
      })

      return true
    } catch (error: any) {
      console.error('💥 初始化和启动流程中出错:', error)
      await logStore.addLog({
        level: 'error',
        message: 'Store: 初始化和启动流程中出错',
        source: '设备信息',
        stack: error.stack
      })
      return false
    } finally {
      initloading.value = false
    }
  }

  async function updateChannelData(payload: ProcessedDataResponse) {
    console.log('🔄 开始更新数据...')
    try {
      // 创建默认的空通道数据对象
      const createEmptyChannelData = (): ChannelDataInfo => ({
        peakVoltage: 0,
        averageVoltage: 0,
        minimumVoltage: 0,
        status: '禁用',
        deviation: '0',
        range: '0V',
        showData: [],
        yAxisRange: { min: 0, max: 0 },
        isWarn: false,
        isConnect: false,
        err_pic_path_list: [],
        err_data_list: [],
        defectPoints: []
      })

      // 根据通道启用状态来设置数据
      // 将原始长度保留，并对报警点再次校正（以防上游未缩放）
      const assignChannel = (src: ChannelDataInfo | undefined) => {
        if (!src) return createEmptyChannelData()
        const copy = { ...src } as ChannelDataInfo
        // 把originalLength带到响应式数据中
        if (src.originalLength) {
          copy.originalLength = src.originalLength
        }
        // Worker 已将原始索引映射到显示坐标；这里不二次缩放。
        return copy
      }

      channelData[0] = paramentSetting.deviceSettings.channels[0].bCHEnable
        ? assignChannel(payload.ch1)
        : createEmptyChannelData()
      channelData[1] = paramentSetting.deviceSettings.channels[1].bCHEnable
        ? assignChannel(payload.ch2)
        : createEmptyChannelData()
      channelData[2] = paramentSetting.deviceSettings.channels[2].bCHEnable
        ? assignChannel(payload.ch3)
        : createEmptyChannelData()
      channelData[3] = paramentSetting.deviceSettings.channels[3].bCHEnable
        ? assignChannel(payload.ch4)
        : createEmptyChannelData()

      // 处理报警数据
      for (let i = 0; i < channelData.length; i++) {
        // 只处理启用的通道
        if (!paramentSetting.deviceSettings.channels[i].bCHEnable) {
          continue
        }
        if (channelData[i].isWarn) {
          // 创建纯数据对象，避免包含不可序列化的属性
          const alarmData: Omit<AlarmData, 'id'> = {
            channelId: i + 1,
            timestamp: new Date().getTime(),
            analysisConclusion: `当前波形不是三角波`,
            severity: 'critical',
            snapshotData: {
              waveformData: Array.isArray(channelData[i].showData)
                ? [...channelData[i].showData]
                : [],
              statistics: {
                peakVoltage: Number(channelData[i].peakVoltage) || 0,
                minimumVoltage: Number(channelData[i].minimumVoltage) || 0,
                averageVoltage: Number(channelData[i].averageVoltage) || 0,
                range: String(channelData[i].range) || '',
                deviation: String(channelData[i].deviation) || '',
                status: String(channelData[i].status) || ''
              },
              yAxisRange: {
                min: Number(channelData[i].yAxisRange?.min) || 0,
                max: Number(channelData[i].yAxisRange?.max) || 100
              },
              err_pic_path_list: Array.isArray(channelData[i].err_pic_path_list)
                ? deepClone(channelData[i].err_pic_path_list)
                : [],
              err_data_list: Array.isArray(channelData[i].err_data_list)
                ? deepClone(channelData[i].err_data_list)
                : [],
              defectPoints: Array.isArray(channelData[i].defectPoints)
                ? deepClone(channelData[i].defectPoints)
                : [],
              metricResults: channelData[i].metricResults
                ? deepClone(channelData[i].metricResults)
                : undefined
            }
          }

          await alarmDataStore.addAlarm(i + 1, alarmData)

          // 添加报警信息 TODO
          await logStore.addLog({
            level: 'warn',
            message: `通道信息报警`,
            source: '通道数据信息',
            details: `当前通道${i + 1}当前波形不是三角波,已加入到报警队列中~`
          })
          showAlarmNotification(alarmData)
        }
      }
      actualLength.value = payload.actualLength || 0
    } catch (error: any) {
      console.error('❌ 数据更新失败:', error)
      console.error('错误详情:', error.stack)
      await logStore.addLog({
        level: 'error',
        message: `数据更新失败`,
        source: '通道数据信息',
        details: `❌ 数据更新失败,${error.message}`,
        stack: error.stack
      })
    }
  }
  // 设置IPC监听器
  const setupIpcListeners = () => {
    console.log('Store: 设置IPC监听器...')
    logStore.addLog({
      level: 'debug',
      message: `Store: 设置IPC监听器...`,
      source: '程序监听信息'
    })
    window.electron.ipcRenderer.on('data:update', (_, data: ProcessedDataResponse) => {
      updateChannelData(data)
    })

    window.electron.ipcRenderer.on('data:error', (_, error) => {
      // A native SDK crash is not a waveform fault. Keep the UI in offline mode.
      if (typeof error === 'string' && error.includes('采集进程异常退出')) {
        deviceInit.value = false
        paramentSetting.programSettings.realTimeMode = false
      }
      ElMessage({
        message: `进程数据错误,${error}`,
        type: 'error'
      })
      logStore.addLog({
        level: 'error',
        message: `收到进程数据错误`,
        details: `收到进程数据错误,${error}`,
        source: '程序监听信息'
      })
    })

    // 监听设备断开事件
    window.electron.ipcRenderer.on('device:disconnected', async (_, message) => {
      console.log('❌ Store: 设备断开连接', message)
      ElMessage({
        message: '设备断开连接，已取消数据采集.等待设备重新接入',
        type: 'warning'
      })
      await logStore.addLog({
        level: 'debug',
        message: '设备断开连接，已取消数据采集',
        source: '设备信息'
      })

      paramentSetting.programSettings.realTimeMode = false
      deviceInit.value = false
    })

    // 监听设备重新连接事件
    window.electron.ipcRenderer.on('device:reconnected', async (_, message) => {
      if (reconnectRestarting.value) {
        console.log('设备重连恢复正在进行，忽略重复触发')
        return
      }
      reconnectRestarting.value = true
      console.log('设备重新连接成功', message)
      await logStore.addLog({
        level: 'debug',
        message: '设备重新连接成功，尝试重新启动数据采集',
        source: '设备信息'
      })

      // 设备重新连接后，切换回实时模式并重新启动数据采集
      try {
        paramentSetting.programSettings.realTimeMode = true
        deviceInit.value = true

        // 重新启动数据采集
        const startSuccess = await startDataCollection()

        if (startSuccess) {
          console.log('设备重新连接后数据采集启动成功')
          ElMessage({
            message: '设备重新连接后数据采集启动成功',
            type: 'success'
          })
          await logStore.addLog({
            level: 'debug',
            message: '设备重新连接后数据采集启动成功',
            source: '设备信息'
          })
        } else {
          console.error('❌ 设备重新连接后数据采集启动失败')
          ElMessage({
            type: 'error',
            message: '设备重新连接后数据采集启动失败'
          })
          await logStore.addLog({
            level: 'error',
            message: '设备重新连接后数据采集启动失败',
            source: '设备信息'
          })
        }
      } catch (error) {
        ElMessage({
          type: 'error',
          message: `设备重新连接后重启采集出现未知错误${error}`
        })
        await logStore.addLog({
          level: 'error',
          message: '设备重新连接后处理失败',
          source: '设备信息',
          stack: error instanceof Error ? error.stack : undefined
        })
      } finally {
        reconnectRestarting.value = false
      }
    })

    // 监听设备轮询状态事件
    window.electron.ipcRenderer.on('device:polling-started', async (_, message) => {
      console.log('🔍 Store: 设备轮询已启动', message)
      await logStore.addLog({
        level: 'debug',
        message: '设备轮询已启动，等待设备重新连接',
        source: '设备信息'
      })
    })

    window.electron.ipcRenderer.on('device:polling-stopped', async (_, message) => {
      console.log('🛑 Store: 设备轮询已停止', message)
      await logStore.addLog({
        level: 'info',
        message: '设备轮询已停止',
        source: '设备信息'
      })
    })

    window.electron.ipcRenderer.on('device-polling-stop-error', async (_, error) => {
      console.error('💥 Store: 设备轮询错误', error)
      await logStore.addLog({
        level: 'error',
        message: '停止设备轮询错误',
        source: '设备信息',
        details: error
      })
    })
  }

  // 移除IPC监听器
  const removeIpcListeners = () => {
    console.log('移除IPC监听器...')

    logStore.addLog({
      level: 'info',
      message: `移除IPC监听器...`,
      source: '通道数据信息'
    })

    window.electron.ipcRenderer.removeAllListeners('data:update')
    window.electron.ipcRenderer.removeAllListeners('data:error')
    window.electron.ipcRenderer.removeAllListeners('device:reconnected')
    window.electron.ipcRenderer.removeAllListeners('device:disconnected')
    window.electron.ipcRenderer.removeAllListeners('device:polling-started')
    window.electron.ipcRenderer.removeAllListeners('device:polling-stopped')
    window.electron.ipcRenderer.removeAllListeners('device-polling-stop-error')
  }
  return {
    channelData,
    sampleRate,
    actualLength,
    deviceInit,
    startBackgroundCollection,
    startDataCollection,
    initializeDevice,
    stopBackgroundCollection,
    initializeAndStart,
    updateChannelData,
    setupIpcListeners,
    removeIpcListeners,
    loadDefaultData
  }
})
