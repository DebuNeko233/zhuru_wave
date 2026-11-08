<template>
  <div class="channelInfo">
    <div class="channelInfo_left">
      <InteractiveWaveChart
        ref="waveChartRef"
        :channel-id="currentChannel"
        :title="`通道 ${currentChannel} 波形图`"
        :channel-data="currentChannelData"
        :isLocal="isLocal"
        :isAlarm="isAlarm"
        @changeLocalMode="handleLocalData"
        @exitAlarm="handleExitAlarm"
      />
    </div>
    <div class="channelInfo_right">
      <div class="right_fullDesc">
        <FullDesc
          :channel-id="currentChannel"
          :channel-data="currentChannelData"
          :is-connect="currentChannelData?.isConnect ?? false"
        ></FullDesc>
      </div>
      <div class="right_defectImages">
        <DefectImageDisplay :image-paths="currentChannelData?.err_pic_path_list || []" />
      </div>
      <div class="right_alarmList">
        <AlarmAnalysisList :channel-id="currentChannel" @alarm-selected="handleAlarmSelected" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import FullDesc from './c-cpns/FullDesc.vue'
import InteractiveWaveChart from './c-cpns/InteractiveWaveChart.vue'
import AlarmAnalysisList from './c-cpns/AlarmAnalysisList.vue'
import DefectImageDisplay from './c-cpns/DefectImageDisplay.vue'

import { useChannelDataStore } from '@renderer/store/channelDataStore'
import type { AlarmFileData } from '@renderer/types/alarmData'
import type { ChannelDataInfo } from '@main/type'

defineOptions({
  name: 'ChannelInfo'
})

const route = useRoute()
const waveChartRef = ref()
const channelDataStore = useChannelDataStore()
const isLocal = ref(false)
const currentLocalChannelData = ref()
const isAlarm = ref(false)
const currentAlarmData = ref<AlarmFileData>()

const currentChannel = computed(() => {
  return parseInt(route.params.channelId as string)
})

const handleLocalData = (data: ChannelDataInfo, options) => {
  if (!isLocal.value) {
    isLocal.value = true
  }
  currentLocalChannelData.value = data
  // 结束
  if (options.isComplete) {
    isLocal.value = false
  }
}

const handleExitAlarm = () => {
  isAlarm.value = false
  currentAlarmData.value = undefined
}

// 解析路由中的报警数据
const routeAlarmData = computed(() => {
  try {
    if (route.query.alarm && typeof route.query.alarm === 'string') {
      return JSON.parse(route.query.alarm)
    }
    return null
  } catch (error) {
    console.warn('解析报警数据失败:', error)
    return null
  }
})

// 监听路由变化，设置报警状态
watch(
  routeAlarmData,
  (newAlarmData) => {
    if (newAlarmData) {
      isAlarm.value = true
      currentAlarmData.value = newAlarmData
    } else {
      // 如果没有路由报警数据且当前不是从报警列表选择的，则退出报警模式
      if (!currentAlarmData.value || !isAlarm.value) {
        isAlarm.value = false
        currentAlarmData.value = undefined
      }
    }
  },
  { immediate: true }
)

// 报警ID
// const alarmSelectedId = computed(() => {
//     return routeAlarmData.value?.id || null
// })

// 处理报警选择事件（从报警列表中选择）
const handleAlarmSelected = (alarmData: AlarmFileData) => {
  currentAlarmData.value = alarmData
  isAlarm.value = true
}

// 修改 currentChannelData 计算属性
const currentChannelData = computed(() => {
  // 优先级1: 报警数据模式
  if (isAlarm.value && currentAlarmData.value) {
    const alarmData = currentAlarmData.value
    const currentData = {
      ...alarmData.snapshotData.statistics,
      yAxisRange: alarmData.snapshotData.yAxisRange,
      isWarn: true,
      showData: alarmData.snapshotData.waveformData,
      err_data_list: alarmData.snapshotData.err_data_list,
      err_pic_path_list: alarmData.snapshotData.err_pic_path_list,
      defectPoints: alarmData.snapshotData.defectPoints,
      isConnect: true // 报警数据默认为已连接状态
    } as ChannelDataInfo
    return currentData
  }
  if (isLocal.value) {
    return currentLocalChannelData.value
  }
  return channelDataStore.channelData[currentChannel.value - 1] || null
})
</script>

<style scoped lang="less">
@import '@renderer/assets/mixins.less';
.channelInfo {
  padding: 15px 10px;
  height: 100%;
  width: 100%;
  display: flex;
  gap: 20px;
  .channelInfo_left {
    flex: 5;
  }
  .channelInfo_right {
    flex: 2;
    display: flex;
    flex-direction: column;
    gap: 15px;
    .right_fullDesc {
      .card-style-hover();
      flex-shrink: 0;
    }
    .right_defectImages {
      flex: 3;
    }

    .right_alarmList {
      flex: 8;
      min-height: 0;
    }
  }
}

@media screen and (max-width: 1920px) {
  .channelInfo {
    padding: 15px 10px;
    height: 100%;
    width: 100%;
    display: flex;
    .channelInfo_left {
      flex: 9;
    }
    .channelInfo_right {
      flex: 3;
      display: flex;
      flex-direction: column;
      gap: 8px;
      .right_fullDesc {
        .card-style-hover();
        flex-shrink: 0;
      }
      .right_defectImages {
        flex: 3;
      }

      .right_alarmList {
        flex: 6;
        min-height: 0;
      }
    }
  }
}
</style>
