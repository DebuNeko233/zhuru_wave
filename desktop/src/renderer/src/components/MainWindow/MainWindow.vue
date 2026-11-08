<template>
  <div class="main-window">
    <div class="channels_info">
      <MainWIndowChannelInfo
        @open-energy-config-dialog="showEnergyConfigDialog = true"
      ></MainWIndowChannelInfo>
    </div>
    <div class="channnels_show">
      <template v-for="(item, index) in channelData">
        <OscilloscopeChart
          :title="
            index % 2 == 0
              ? `通道 X${index % 2 == 0 && index < 2 ? '1' : '2'}`
              : `通道 Y${index < 2 ? '1' : '2'}`
          "
          color="#00ff00"
          class="chart-item"
          :dataInfo="item"
          :sample-rate="sampleRate"
          @dblclick="goToSignalChannel(index)"
        />
      </template>
    </div>

    <!-- 能量级别配置对话框 -->
    <el-dialog
      v-model="showEnergyConfigDialog"
      title="能量级别配置"
      width="600px"
      :close-on-click-modal="false"
      :close-on-press-escape="true"
      destroy-on-close
      append-to-body
    >
      <EnergyLevelConfigDialog
        v-if="showEnergyConfigDialog"
        @close="showEnergyConfigDialog = false"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import OscilloscopeChart from '../OscilloscopeChart/OscilloscopeChart.vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useChannelDataStore } from '@renderer/store/channelDataStore'
import { storeToRefs } from 'pinia'
import { useRouter } from 'vue-router'

import MainWIndowChannelInfo from './c-cpns/MainWIndowChannelInfo.vue'

defineOptions({
  name: 'MainWindow'
})

const { channelData, sampleRate } = storeToRefs(useChannelDataStore())
const router = useRouter()
const showEnergyConfigDialog = ref(false)

const goToSignalChannel = (index: number) => {
  router.push({
    path: `/channel/${index + 1}`
  })
}

// 生命周期管理
onMounted(() => {})

onUnmounted(() => {})
</script>

<style scoped lang="less">
.main-window {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  .channels_info {
  }

  .channnels_show {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: min(1.5vh, 12px) min(1.5vw, 16px);
    padding: min(2vh, 5px) min(2vw, 20px);
    box-sizing: border-box;
    overflow: hidden;
    .chart-item {
      min-height: 250px;
      border-radius: 12px;
    }
  }
}
</style>
