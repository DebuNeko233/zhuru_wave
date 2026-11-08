<template>
  <div class="channel-info-panel">
    <div class="info-row">
      <InfoCard
        label="电压采集设备运行状态"
        :value="`${deviceInitStatus}`"
        :status="`${channelDataStore.deviceInit ? '正常运行' : '请检查设备运行状态'}`"
        :status-type="channelDataStore.deviceInit ? 'normal' : 'warning'"
        :icon="OverloadIcon"
      />

      <EnergyLevelControl @open-config-dialog="handleOpenConfigDialog"> </EnergyLevelControl>

      
      <DualInfoCard
        label="报警统计"
        left-label="当天"
        :left-value="todayAlarmCount"
        middle-label="当月"
        :middle-value="monthAlarmCount"
        right-label="总计"
        :right-value="historyAlarmCount"
        :status="alarmStatus"
        :status-type="
          alarmStatus === '正常'
            ? 'normal'
            : alarmStatus === '轻微'
              ? 'low'
              : alarmStatus === '中等'
                ? 'warning'
                : 'negative'
        "
        :icon="WarningIcon"
        @dblclick="goToAlramListPage"
      />
      <InfoCard
        label="缺陷频率(今日/月)"
        :value="monthlyDefectFrequency"
        :icon="FrequencyIcon"
      />

      <InfoCard
        label="程序运行时间"
        :value="runTime"
        status="运行中"
        status-type="normal"
        :icon="RuntimeIcon"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'

import InfoCard from './InfoCard.vue'
import RuntimeIcon from '@renderer/assets/iconComponents/RuntimeIcon.vue'
import OverloadIcon from '@renderer/assets/iconComponents/OverloadIcon.vue'
import WarningIcon from '@renderer/assets/iconComponents/WarningIcon.vue'
import FrequencyIcon from '@renderer/assets/iconComponents/FrequencyIcon.vue'
import useAlarmDataStore from '@renderer/store/alarmDataStore'
import { useChannelDataStore } from '@renderer/store/channelDataStore'
import EnergyLevelControl from './EnergyLevelControl.vue'
import DualInfoCard from './DualInfoCard.vue'

const channelDataStore = useChannelDataStore()
const alarmDataStore = useAlarmDataStore()

// 响应式数据
const runTime = ref('0天 0小时 0分钟')
const router = useRouter()

// 定义事件
const emit = defineEmits<{
  openEnergyConfigDialog: []
}>()

const handleOpenConfigDialog = () => {
  emit('openEnergyConfigDialog')
}

// 程序启动时间
const startTime = ref(Date.now())
let timer: number | NodeJS.Timeout | null = null

const goToAlramListPage = () => {
  router.push({
    path: '/record'
  })
}

// 计算当天报警数
const todayAlarmCount = computed(() => {
  try {
    let todayAlarms = 0

    // 遍历所有通道，直接使用store中的todayCount字段
    for (let channel = 1; channel <= 4; channel++) {
      const channelState = alarmDataStore.getChannelState(channel)
      if (channelState) {
        todayAlarms += channelState.todayCount || 0
      }
    }

    return todayAlarms.toString()
  } catch (error) {
    console.warn('获取当天报警数失败:', error)
    return '0'
  }
})

// 计算历史报警数（使用totalCount - 当天报警数）
const historyAlarmCount = computed(() => {
  try {
    let totalAlarms = 0

    for (let channel = 1; channel <= 4; channel++) {
      const channelState = alarmDataStore.getChannelState(channel)
      if (channelState) {
        totalAlarms += channelState.totalCount || 0
      }
    }

    return totalAlarms.toString()
  } catch (error) {
    console.warn('获取历史报警数失败:', error)
    return '0'
  }
})

// 计算当月报警数
const monthAlarmCount = computed(() => {
  try {
    let monthAlarms = 0

    for (let channel = 1; channel <= 4; channel++) {
      const channelState = alarmDataStore.getChannelState(channel)
      if (channelState) {
        monthAlarms += channelState.MonthCount || 0
      }
    }

    return monthAlarms.toString()
  } catch (error) {
    console.warn('获取当月报警数失败:', error)
    return '0'
  }
})

// 报警状态
const alarmStatus = computed(() => {
  const todayCount = parseInt(todayAlarmCount.value)
  if (todayCount === 0) return '正常'
  if (todayCount <= 5) return '轻微'
  if (todayCount <= 20) return '中等'
  return '严重'
})

// 月缺陷频率 - 今日缺陷次数 / 月缺陷次数 的百分比
const monthlyDefectFrequency = computed(() => {
  if (!alarmDataStore) {
    return '0.0%'
  }

  try {
    let todayAlarms = 0
    let monthlyAlarms = 0

    for (let channel = 1; channel <= 4; channel++) {
      const channelState = alarmDataStore.getChannelState(channel)
      if (channelState) {
        todayAlarms += channelState.todayCount || 0
        monthlyAlarms += channelState.MonthCount || 0
      }
    }

    if (monthlyAlarms === 0) return '0.0%'
    const pct = (todayAlarms / monthlyAlarms) * 100
    return `${pct.toFixed(1)}%`
  } catch (error) {
    console.warn('获取月度报警数据失败:', error)
    return '0.0%'
  }
})

// 设备覆盖率状态
const deviceInitStatus = computed(() => {
  if (channelDataStore.deviceInit) {
    return '正常运行'
  }
  return '异常'
})

// 更新运行时间
const updateRunTime = () => {
  const now = Date.now()
  const diff = now - startTime.value

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  runTime.value = `${days}天 ${hours}小时 ${minutes}分钟`
}

// 生命周期
onMounted(() => {
  updateRunTime()
  timer = setInterval(updateRunTime, 60000) // 每分钟更新一次
})

onUnmounted(() => {
  if (timer) {
    clearInterval(timer)
  }
})
</script>

<style scoped lang="less">
.channel-info-panel {
  padding: 15px 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.info-row {
  display: flex;
  gap: 15px;
}
</style>
