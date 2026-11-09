<template>
  <div class="wave-metrics">
    <div class="wave-metrics-title">通道{{ channelId }} · 波形检测</div>
    <div class="metric-grid">
      <div v-for="item in metricCards" :key="item.label"
           class="metric-card" :class="{ 'metric-alert': item.status === 'ALERT' }">
        <div class="metric-label">{{ item.label }}</div>
        <div class="metric-main">
          <span class="metric-value">{{ item.value }}</span>
          <span class="metric-unit">{{ item.unit }}</span>
        </div>
        <div v-if="item.status === 'ALERT'" class="metric-warning">检测到异常</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ChannelDataInfo, WaveMetricStatus } from '@main/type'

const props = defineProps<{
  channelId: number
  channelData: ChannelDataInfo | null
  isConnect: boolean
}>()

const format = (value: number | null | undefined, digits = 2): string =>
  typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '—'

const metricCards = computed(() => {
  const data = props.channelData?.metricResults
  const blank: WaveMetricStatus = 'DATA_INSUFFICIENT'
  return [
    { label: '峰峰值', value: format(data?.peak_to_peak.value), unit: 'raw', status: data?.peak_to_peak.status ?? blank },
    { label: '频率', value: format(data?.frequency.value), unit: 'Hz', status: data?.frequency.status ?? blank },
    { label: '斜率', value: data?.slope
        ? `↑ ${format(data.slope.rise_value)} / ↓ ${format(data.slope.fall_value)}` : '—',
      unit: 'raw/点', status: data?.slope.status ?? blank },
    { label: '峰值稳定周期', value: data?.peak_stable_cycles
        ? String(data.peak_stable_cycles.value ?? '—') : '—',
      unit: '周期', status: data?.peak_stable_cycles.status ?? blank }
  ]
})
</script>

<style scoped lang="less">
.wave-metrics-title {
  font-weight: 600;
  margin-bottom: 10px;
}
.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.metric-card {
  min-width: 0;
  border: 1px solid var(--border-color, #d9dce2);
  border-radius: 8px;
  padding: 12px;
  background: var(--bg-color-light-gray, transparent);
}
.metric-alert { border-color: #e05858; }
.metric-label { color: var(--text-color-secondary, #777); font-size: 12px; }
.metric-main { display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px; padding-top: 7px; }
.metric-value { font-size: 20px; font-variant-numeric: tabular-nums; font-weight: 600; overflow-wrap: anywhere; }
.metric-unit { font-size: 11px; opacity: .65; }
.metric-warning { color: #d64e4e; font-size: 11px; margin-top: 4px; }
@media (max-width: 1100px) { .metric-value { font-size: 16px; } }
</style>
