<template>
  <div class="left_fullDesc_title">
    <div class="title">通道{{ channelId }}: 详细信息</div>
    <div class="status-indicator" :class="{ live: isConnect, disconnect: !isConnect }">
      <span class="dot"></span>
      {{ isConnect ? '已连接' : '断开' }}
    </div>
  </div>
  <div class="info-grid">
    <div class="info-item">
      <span class="label">峰值电压</span>
      <span class="value">{{ channelData?.peakVoltage != null ? Number(channelData.peakVoltage).toFixed(2) : '0.00' }}V</span>
    </div>
    <div class="info-item">
      <span class="label">最小电压</span>
      <span class="value">{{ channelData?.minimumVoltage != null ? Number(channelData.minimumVoltage).toFixed(2) : '0.00' }}V</span>
    </div>
    <div class="info-item">
      <span class="label">平均电压</span>
      <span class="value">{{ channelData?.averageVoltage != null ? Number(channelData.averageVoltage).toFixed(2) : '0.00' }}V</span>
    </div>
    <div class="info-item">
      <span class="label">状态</span>
      <span class="value" :class="getStatusClass(channelData?.status)">{{
        channelData?.status || '未知'
      }}</span>
    </div>
    <!-- <div class="info-item">
      <span class="label">频率</span>
      <span class="value">125Hz</span>
    </div> -->
    <div class="info-item">
      <span class="label">数据数量</span>
      <span class="value">{{ channelData?.showData?.length || 0 }}</span>
    </div>
    <!-- <div class="info-item">
      <span class="label">偏差值</span>
      <span class="value status-warning">{{ channelData?.deviation != null ? Number(channelData.deviation).toFixed(2) : '0.00' }}</span>
    </div>
    <div class="info-item">
      <span class="label">标准差</span>
      <span class="value">{{ calculateStandardDeviation() }}</span>
    </div> -->
    <div class="info-item">
      <span class="label">峰峰值</span>
      <span class="value status-danger">{{ channelData?.range != null ? parseFloat(channelData.range).toFixed(2) : '0.00' }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChannelDataInfo } from '@main/type'

interface Props {
  channelId: number
  channelData: ChannelDataInfo | null
  isConnect: boolean
}

withDefaults(defineProps<Props>(), {
  isConnect: true
})

// 获取状态样式类
const getStatusClass = (status: string | undefined) => {
  if (!status) return ''
  switch (status) {
    case '正常':
      return 'status-normal'
    case '警告':
      return 'status-warning'
    case '异常':
      return 'status-danger'
    default:
      return ''
  }
}

</script>

<style scoped lang="less">
.left_fullDesc_title {
  display: flex;
  justify-content: space-between;
  padding-bottom: 5px;
  .title {
    font-weight: 500px;
  }
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 12px;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    &.live {
      background: #e8f5e8;
      color: #2e7d32;

      .dot {
        background: #4caf50;
      }
    }

    &.disconnect {
      background: #fff3e0;
      color: #f57c00;

      .dot {
        background: #ff9800;
        animation: none;
      }
    }
  }
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px 24px;
  background: @bg-color-light-gray;
  border: 1px solid @border-color;
  border-radius: 4px;
  padding: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .label {
    color: #666;
    font-size: 0.8rem;
    font-weight: 400;
  }

  .value {
    color: #333;
    font-size: 0.8rem;
    font-weight: 500;

    &.status-normal {
      color: @success-color;
    }
    &.status-warning {
      color: @warning-color;
    }
    &.status-danger {
      color: @danger-color;
    }
  }
}

// 修复媒体查询 - 使用正确的语法
@media screen and (max-width: 1920px) {
  .left_fullDesc_title {
    .title {
      font-size: 0.8rem;
    }
  }
  .info-item {
    .label {
      font-size: 0.55rem !important; // 增加字体大小
    }
    .value {
      font-size: 0.55rem !important; // 增加字体大小
    }
  }
}
</style>
