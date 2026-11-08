import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ProgramSettings, DeviceSettings, AppSettings } from '@main/type'
import { ElMessage } from 'element-plus'

// 定义enerageLevelMap的类型
export interface EnerageLevelConfig {
  epsilon: number
  rate: number
  step1: number //斜率步长
  step2: number //斜率差步长
}

export interface EnerageLevelMap {
  [key: number]: EnerageLevelConfig
}

// 默认的enerageLevelMap配置
const defaultEnerageLevelMap: EnerageLevelMap = {
  60: {
    epsilon: 6000,
    step1: 2,
    step2: 2,
    rate: 0.9
  },
  80: {
    epsilon: 6000,
    step1: 2,
    step2: 2,
    rate: 0.9
  },
  120: {
    epsilon: 6000,
    step1: 2,
    step2: 2,
    rate: 0.9
  },
  150: {
    epsilon: 10000,
    step1: 2,
    step2: 2,
    rate: 0.8
  }
}

const useParamSettingStore = defineStore('paramSetting', () => {
  // 将enerageLevelMap改为响应式状态
  const enerageLevelMap = ref<EnerageLevelMap>({})

  const isEnerageLevelMapLoading = ref(false)
  // 默认程序设置
  const defaultProgramSettings: ProgramSettings = {
    interval: 500,
    maxLen: 10000,
    targetLength: 5000,
    loggingEnabled: true,
    realTimeMode: true,
    autoSaveEnabled: false,
    storageDir: {
      alarmDataPath: '',
      logPath: ''
    },
    enableDebug: false,
    debugStorage: {
      debugImgPath: '',
      epsilon: 6000,
      debug_total: false,
      debug_single: false,
      enerageLevel: 60,
      period_step: 2,
      step1: 2,
      step2: 2,
      rate: 0.9
    }
  }

  // 默认设备设置
  const defaultDeviceSettings: DeviceSettings = {
    channels: [
      { id: 1, bCHEnable: true, nCHVoltDIV: 7, bCHBWLimit: 0, coupling: 0 },
      { id: 2, bCHEnable: true, nCHVoltDIV: 7, bCHBWLimit: 0, coupling: 0 },
      { id: 3, bCHEnable: true, nCHVoltDIV: 7, bCHBWLimit: 0, coupling: 0 },
      { id: 4, bCHEnable: true, nCHVoltDIV: 7, bCHBWLimit: 0, coupling: 0 }
    ],
    timeBaseIndex: 15,
    trigger: {
      mode: 0,
      source: 0,
      level: 100,
      slope: 0
    },
    sampling: {
      bufferLength: 20000
    }
  }

  // 响应式状态
  const programSettings = ref<ProgramSettings>({ ...defaultProgramSettings })
  const deviceSettings = ref<DeviceSettings>({ ...defaultDeviceSettings })

  const allSettings = computed(() => ({
    program: programSettings.value,
    device: deviceSettings.value
  }))

  const isLoading = ref(false)

  // 加载设置
  const loadSettings = async () => {
    try {
      isLoading.value = true

      await loadEnerageLevelMap()

      // 使用新的IPC调用获取用户设置
      const settings = await window.electronAPI.invoke('user:get-user-setting')
      if (settings && Object.keys(settings).length > 0) {
        // 合并设置，确保新增字段有默认值
        programSettings.value = { ...defaultProgramSettings, ...settings.program }
        deviceSettings.value = { ...defaultDeviceSettings, ...settings.device }

        console.log('Loaded settings:', settings)
      } else {
        // 首次运行或设置为空，使用默认设置并保存
        programSettings.value = { ...defaultProgramSettings }
        deviceSettings.value = { ...defaultDeviceSettings }
        ElMessage.warning('未找到到用户设置文件，已生成默认文件')
        await saveSettings()
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      // 加载失败时使用默认设置
      programSettings.value = { ...defaultProgramSettings }
      deviceSettings.value = { ...defaultDeviceSettings }
    } finally {
      isLoading.value = false
    }
  }

  // // 保存设置
  // const saveSettings = async () => {
  //   try {
  //     // 使用JSON序列化彻底清除所有响应式属性
  //     const settings: AppSettings = JSON.parse(JSON.stringify({
  //       program: programSettings.value,
  //       device: deviceSettings.value
  //     }));

  //     // 使用新的IPC调用保存用户设置
  //     const result = await window.electronAPI.invoke('user:set-user-setting', settings);

  //     if (result.success) {
  //       console.log('Settings saved successfully to:', result.path);
  //     }
  //   } catch (error) {
  //     console.error('Failed to save settings:', error);
  //   }
  // };

  // 保存设置
  const saveSettings = async (shouldRestart: boolean = false, shouldReInit: boolean = true) => {
    try {
      // 使用JSON序列化彻底清除所有响应式属性
      const settings: AppSettings = JSON.parse(
        JSON.stringify({
          program: programSettings.value,
          device: deviceSettings.value
        })
      )

      // 使用新的IPC调用保存用户设置
      const result = await window.electronAPI.invoke('user:set-user-setting', settings)

      if (result.success) {
        console.log('Settings saved successfully to:', result.path)

        // 如果需要重启
        if (shouldRestart) {
          await resetDeviceInit(shouldReInit)
        }
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    }
  }

  // 更新程序设置
  const updateProgramSettings = async (updates: Partial<ProgramSettings>) => {
    programSettings.value = { ...programSettings.value, ...updates }
    // await resetDeviceInit();
    await saveSettings(true, false)
  }

  // 更新设备设置（仅保存，不重启设备）
  const updateDeviceSettings = async (updates: Partial<DeviceSettings>) => {
    deviceSettings.value = { ...deviceSettings.value, ...updates }
    await saveSettings()
  }

  const resetDeviceInit = async (shouldReInit: boolean = true) => {
    try {
      console.log('开始重启数据采集...')

      // 1. 停止当前的数据采集
      try {
        await window.electronAPI.invoke('data:stop-collection')
        console.log('已停止数据采集')
      } catch (error) {
        console.warn('停止数据采集时出错（可能未在运行）:', error)
      }

      if (shouldReInit) {
        // 2. 初始化设备
        console.log('初始化设备...')
        const initResult = await window.electronAPI.invoke(
          'data:initialize-device',
          JSON.parse(JSON.stringify(allSettings.value))
        )

        if (!initResult.success) {
          throw new Error(`初始化设备失败: ${initResult.message || initResult.error}`)
        }

        console.log('设备初始化成功')
      }

      // 4. 启动数据采集
      console.log('启动数据采集...')
      const startResult = await window.electronAPI.invoke(
        'data:start-collection',
        JSON.parse(JSON.stringify(allSettings.value))
      )

      if (!startResult.success) {
        throw new Error(`启动数据采集失败: ${startResult.message || startResult.error}`)
      }

      console.log('数据采集重启成功')
      return { success: true, message: '设备重新初始化并启动采集成功' }
    } catch (error: any) {
      console.error('重启失败:', error)
      return { success: false, message: `重启失败: ${error.message}` }
    }
  }

  const resetToDefaults = async () => {
    programSettings.value = { ...defaultProgramSettings }
    deviceSettings.value = { ...defaultDeviceSettings }
    await saveSettings()
    // await resetDeviceInit();
  }

  // 重置deviceSettings为默认设置（仅保存，不重启设备）
  const resetDeviceSettings = async () => {
    deviceSettings.value = { ...defaultDeviceSettings }
    await saveSettings()
  }

  //重置programSettings为默认设置
  const resetProgramSettings = async () => {
    programSettings.value = { ...defaultProgramSettings }
    await saveSettings(true, false)
    // await resetDeviceInit();
  }

  // 加载enerageLevelMap配置
  const loadEnerageLevelMap = async () => {
    try {
      isEnerageLevelMapLoading.value = true

      const config = await window.electronAPI.invoke('config:get-enerage-level-map')
      if (config && Object.keys(config).length > 0) {
        // 合并配置，确保新增字段有默认值
        enerageLevelMap.value = { ...config }
        console.log('Loaded enerageLevelMap:', config)
      } else {
        // 首次运行或配置为空，使用默认配置并保存
        enerageLevelMap.value = { ...defaultEnerageLevelMap }
        ElMessage.warning('未找到能量等级映射文件，已生成默认文件')
        await saveEnerageLevelMap()
      }
    } catch (error) {
      console.error('Failed to load enerageLevelMap:', error)
      // 加载失败时使用默认配置
      enerageLevelMap.value = { ...defaultEnerageLevelMap }
    } finally {
      isEnerageLevelMapLoading.value = false
    }
  }

  // 保存enerageLevelMap配置
  const saveEnerageLevelMap = async () => {
    try {
      // 使用JSON序列化彻底清除所有响应式属性
      const configData = JSON.parse(JSON.stringify(enerageLevelMap.value))

      const result = await window.electronAPI.invoke('config:set-enerage-level-map', configData)

      if (result.success) {
        console.log('EnerageLevelMap saved successfully to:', result.path)
        return { success: true, message: '能量等级配置保存成功' }
      }
      return { success: false, message: '能量等级配置保存失败' }
    } catch (error) {
      console.error('Failed to save enerageLevelMap:', error)
      return { success: false, message: '能量等级配置保存失败' }
    }
  }

  // 更新enerageLevelMap中的特定配置
  const updateEnerageLevelConfig = async (level: number, config: EnerageLevelConfig) => {
    try {
      enerageLevelMap.value[level] = { ...config }
      const result = await saveEnerageLevelMap()
      return result
    } catch (error) {
      console.error('Failed to update enerageLevelConfig:', error)
      return { success: false, message: '更新能量等级配置失败' }
    }
  }

  // 重置enerageLevelMap为默认配置
  const resetEnerageLevelMap = async () => {
    try {
      enerageLevelMap.value = { ...defaultEnerageLevelMap }
      const result = await saveEnerageLevelMap()
      return result
    } catch (error) {
      console.error('Failed to reset enerageLevelMap:', error)
      return { success: false, message: '重置能量等级配置失败' }
    }
  }

  // 获取特定等级的配置
  const getEnerageLevelConfig = (level: number): EnerageLevelConfig | null => {
    return enerageLevelMap.value[level] || null
  }

  // 改变当前程序中的能量等级
  const changeEnerageLevelConfig = async (level: number, config: EnerageLevelConfig) => {
    if (programSettings.value) {
      programSettings.value.debugStorage.enerageLevel = level
      programSettings.value.debugStorage.epsilon = config.epsilon
      programSettings.value.debugStorage.rate = config.rate

      console.log(`成功变换当前能量等级,当前能量等级${level},配置:${config}`)

      const plainConfig = JSON.parse(JSON.stringify(config))

      // 通知主进程更新配置
      const result = await window.electronAPI.invoke('config:changeEnerageLevelConfig', {
        level,
        plainConfig
      })
      if (result.success) {
        console.log('配置更新成功', result.msg)
      } else {
        console.error('配置更新失败:', result.error)
      }
    }
  }

  return {
    // 状态
    programSettings,
    deviceSettings,
    allSettings,
    isLoading,
    enerageLevelMap,
    isEnerageLevelMapLoading,
    // 方法
    loadSettings,
    saveSettings,
    updateProgramSettings,
    updateDeviceSettings,
    resetToDefaults,
    resetDeviceSettings,
    resetProgramSettings,
    saveEnerageLevelMap,
    updateEnerageLevelConfig,
    resetEnerageLevelMap,
    getEnerageLevelConfig,
    changeEnerageLevelConfig
  }
})

export default useParamSettingStore
