import { ref, reactive } from 'vue'
import type { Ref } from 'vue'
import type { AlarmData } from '@renderer/types/alarmData'
import { useRouter, useRoute } from 'vue-router'

interface AlarmNotificationState {
  visible: boolean
  alarmData: Omit<AlarmData, 'id'> | null
}

const alarmState = reactive<AlarmNotificationState>({
  visible: false,
  alarmData: null
})

export const alarmFlag: Ref<boolean> = ref(true)

export const useAlarmNotification = () => {
  const showAlarmNotification = (alarmData: Omit<AlarmData, 'id'>) => {
    alarmState.alarmData = alarmData
    if (alarmFlag.value) {
      alarmState.visible = true
    }
  }
  const router = useRouter()
  const route = useRoute()

  const hideAlarmNotification = () => {
    alarmState.visible = false
    alarmState.alarmData = null
  }

  const acknowledgeAlarm = (alarmData: Omit<AlarmData, 'id'>) => {
    console.log('报警已确认:', alarmData)
    // 这里可以添加确认报警的逻辑，比如更新数据库状态
    hideAlarmNotification()
  }

  const viewAlarmDetails = (alarmData: Omit<AlarmData, 'id'>) => {
    console.log('查看报警详情:', alarmData)
    // 这里可以添加查看详情的逻辑

    // 检查当前是否已经在目标页面
    const targetPath = `/channel/${alarmData.channelId}`

    // 判断当前路由是否已经是目标页面
    const isCurrentPage = route.path === targetPath

    if (!isCurrentPage) {
      // 不在目标页面，进行跳转并传递快照参数
      console.log('现在的页面', route.path)
      console.log('跳转目标页面:', targetPath)
      router.push({
        path: targetPath,
        query: {
          snapshot: 'true'
        }
      })
      window.dispatchEvent(new CustomEvent('loadAlarmSnapshot'))
    } else {
      window.dispatchEvent(new CustomEvent('loadAlarmSnapshot'))
    }
  }

  const pauseAlarm = () => {
    alarmFlag.value = false
    hideAlarmNotification()
  }

  const resumeAlarm = () => {
    alarmFlag.value = true
  }

  return {
    alarmState,
    showAlarmNotification,
    hideAlarmNotification,
    acknowledgeAlarm,
    viewAlarmDetails,
    pauseAlarm,
    resumeAlarm
  }
}
