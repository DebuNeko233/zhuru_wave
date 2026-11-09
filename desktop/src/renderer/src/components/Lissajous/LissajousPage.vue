<template>
  <div class="xy-page">
    <div class="xy-toolbar">
      <strong>XY 李萨如</strong>
      <el-radio-group v-model="source" size="small">
        <el-radio-button value="live">实时通道</el-radio-button>
        <el-radio-button value="file">同步 CSV</el-radio-button>
      </el-radio-group>
      <span class="axis-label">X</span>
      <el-select v-model="xChannel" size="small" class="channel-select">
        <el-option v-for="ch in CHANNEL_LABELS" :key="ch" :label="ch" :value="ch"
                   :disabled="ch === yChannel" />
      </el-select>
      <span class="axis-label">Y</span>
      <el-select v-model="yChannel" size="small" class="channel-select">
        <el-option v-for="ch in CHANNEL_LABELS" :key="ch" :label="ch" :value="ch"
                   :disabled="ch === xChannel" />
      </el-select>
      <el-button size="small" @click="swapAxes">交换 XY</el-button>
      <el-button size="small" type="primary" plain @click="selectFile">导入同步 CSV</el-button>
      <input ref="fileInput" class="hidden-input" type="file" accept=".csv,text/csv" @change="handleFile" />
    </div>

    <div class="xy-layout">
      <div class="xy-plot-panel">
        <div class="xy-canvas-wrap">
          <div ref="chartEl" class="xy-canvas" role="img" aria-label="两个同步通道的 X-Y 李萨如轨迹" />
          <div v-if="plotPoints.length === 0" class="xy-empty">
            {{ emptyMessage }}
          </div>
        </div>
        <div class="axis-note">归一化坐标 · X/Y 同步采样</div>
        <div v-if="source === 'file' && recording" class="scrubber">
          <span>采样 {{ startIndex.toLocaleString() }} / {{ recording.sampleCount.toLocaleString() }}</span>
          <el-slider v-model="startIndex" :min="0" :max="maxStart" :step="64" :show-tooltip="false" />
        </div>
      </div>

      <aside class="xy-side">
        <div class="side-title">
          <strong>{{ xChannel }} / {{ yChannel }}</strong>
          <span v-if="source === 'file'">本地同步记录</span>
          <span v-else>同批次采集</span>
        </div>
        <div v-if="source === 'file' && recording" class="file-name" :title="fileName">{{ fileName }}</div>
        <div class="window-control">
          <span>显示点数</span>
          <el-select v-model="windowSize" size="small" style="width:116px">
            <el-option v-for="n in [1024, 2048, 4096]" :key="n" :value="n" :label="n.toLocaleString()" />
          </el-select>
        </div>
        <div class="metric-grid">
          <div><span>有效点数</span><b>{{ plotPoints.length.toLocaleString() }}</b></div>
          <div><span>轨迹清晰度</span><b>{{ valueOf('clarity_score', 3) }}</b></div>
          <div><span>径向厚度</span><b>{{ valueOf('radial_thickness_ratio', 3) }}</b></div>
          <div><span>内部填充</span><b>{{ valueOf('interior_fill_ratio', 3) }}</b></div>
          <div><span>多边形边数</span><b>{{ valueOf('polygon_side_count', 0) }}</b></div>
          <div><span>相位差</span><b>{{ valueOf('phase_difference_deg', 1) }}{{ phaseUnit }}</b></div>
        </div>
        <div class="analysis-state">
          {{ analysisError || (analysis ? '轨迹已计算 · 合格阈值待现场标定' : '轨迹指标待计算') }}
        </div>
        <div v-if="source === 'file' && recording" class="recording-info">
          <span>文件采样点 {{ recording.sampleCount.toLocaleString() }}</span>
          <span v-if="recording.sampleRateHz">{{ recording.sampleRateHz.toLocaleString() }} Hz</span>
          <span v-if="recording.scenario">{{ recording.scenario }}</span>
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onActivated, onDeactivated, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import * as echarts from 'echarts'
import { useChannelDataStore } from '@renderer/store/channelDataStore'
import { CHANNEL_LABELS, pairedWindow, parseXYCsv } from './xyCsv'
import type { XYChannel, XYRecording } from './xyCsv'

type PairResult = { status: string; metrics?: Record<string, number | null> }
const channelStore = useChannelDataStore()
const source = ref<'live' | 'file'>('live')
const active = ref(true)
const xChannel = ref<XYChannel>('X1')
const yChannel = ref<XYChannel>('Y1')
const recording = shallowRef<XYRecording | null>(null)
const fileName = ref('')
const windowSize = ref(2048)
const startIndex = ref(0)
const analysis = ref<PairResult | null>(null)
const analysisError = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const chartEl = ref<HTMLDivElement | null>(null)
let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let analysisTimer: ReturnType<typeof setTimeout> | null = null
let requestId = 0

function swapAxes() {
  const x = xChannel.value
  xChannel.value = yChannel.value
  yChannel.value = x
}

const liveChannels = computed(() => channelStore.channelData)
const currentX = computed(() => source.value === 'file'
  ? recording.value?.channels[xChannel.value]
  : liveChannels.value[CHANNEL_LABELS.indexOf(xChannel.value)]?.xySamples)
const currentY = computed(() => source.value === 'file'
  ? recording.value?.channels[yChannel.value]
  : liveChannels.value[CHANNEL_LABELS.indexOf(yChannel.value)]?.xySamples)
const maxStart = computed(() => Math.max(0, (recording.value?.sampleCount || 0) - windowSize.value))
const plotPoints = computed(() => {
  if (xChannel.value === yChannel.value || !currentX.value || !currentY.value) return []
  const x = currentX.value
  const y = currentY.value
  if (source.value === 'live') {
    // Both arrays originate from a single hardware acquisition; they use identical indices.
    const a = liveChannels.value[CHANNEL_LABELS.indexOf(xChannel.value)]
    const b = liveChannels.value[CHANNEL_LABELS.indexOf(yChannel.value)]
    if (!a?.isConnect || !b?.isConnect || !a.originalLength || a.originalLength !== b.originalLength) return []
    return pairedWindow(x, y, Math.max(0, x.length - windowSize.value), windowSize.value)
  }
  return pairedWindow(x, y, Math.min(startIndex.value, maxStart.value), windowSize.value)
})
const emptyMessage = computed(() => {
  if (source.value === 'file' && !recording.value) return '导入包含至少两个同步通道的 CSV'
  if (!currentX.value || !currentY.value) return `当前 ${xChannel.value} / ${yChannel.value} 无同步数据`
  return '通道数据长度不同，或有效采样点不足'
})
const phaseUnit = computed(() => typeof analysis.value?.metrics?.phase_difference_deg === 'number' ? '°' : '')
function valueOf(key: string, decimals: number): string {
  const val = analysis.value?.metrics?.[key]
  return typeof val === 'number' && Number.isFinite(val) ? val.toFixed(decimals) : '—'
}

function normalize(points: number[][]): number[][] {
  if (!points.length) return []
  // Visual-only symmetric normalization; backend always sees original raw values.
  const x = points.map(p => p[0]).sort((a, b) => a - b)
  const y = points.map(p => p[1]).sort((a, b) => a - b)
  const q = (arr: number[], t: number) => arr[Math.floor((arr.length - 1) * t)]
  const cx = (q(x, .99) + q(x, .01)) / 2
  const cy = (q(y, .99) + q(y, .01)) / 2
  const sx = Math.max(1e-9, (q(x, .99) - q(x, .01)) / 2)
  const sy = Math.max(1e-9, (q(y, .99) - q(y, .01)) / 2)
  return points.map(p => [(p[0] - cx) / sx, (p[1] - cy) / sy])
}

function render() {
  if (!chart) return
  const pts = normalize(plotPoints.value)
  chart.setOption({
    animation: false,
    backgroundColor: 'transparent',
    grid: { left: 48, right: 20, top: 24, bottom: 45, containLabel: false },
    tooltip: { trigger: 'item', formatter: (p: any) => `X: ${p.value[0].toFixed(3)}  Y: ${p.value[1].toFixed(3)}` },
    xAxis: { type: 'value', min: -1.3, max: 1.3, name: xChannel.value,
      axisLine: { lineStyle: { color: '#9ba8b5' } }, splitLine: { lineStyle: { opacity: .12 } } },
    yAxis: { type: 'value', min: -1.3, max: 1.3, name: yChannel.value,
      axisLine: { lineStyle: { color: '#9ba8b5' } }, splitLine: { lineStyle: { opacity: .12 } } },
    // 纯散点：各个同步采样对 (X[i], Y[i]) 独立显示，不连线。
    series: [{ name: 'XY 采样点', type: 'scatter', data: pts,
      symbol: 'circle', symbolSize: 2.5, animation: false,
      itemStyle: { color: '#00a4df', opacity: .82 },
      silent: true, progressive: 2000, progressiveThreshold: 3000 }]
  }, true)
}

function scheduleAnalysis() {
  if (analysisTimer !== null) clearTimeout(analysisTimer)
  if (!active.value) return
  analysis.value = null
  analysisError.value = ''
  const token = ++requestId
  const points = plotPoints.value
  if (points.length < 256) return
  analysisTimer = setTimeout(async () => {
    try {
      const result = await window.electronAPI.invoke('data:lissajous', {
        wave_x: points.map(p => p[0]), wave_y: points.map(p => p[1]), synchronized: true
      })
      if (requestId !== token) return
      if (result?.success && result.data) analysis.value = result.data
      else analysisError.value = result?.error ? '指标不可用（检测服务未就绪）' : '指标计算失败'
    } catch (_error) {
      if (requestId === token) analysisError.value = '指标不可用（检测服务未就绪）'
    }
  }, source.value === 'live' ? 400 : 350)
}

function selectFile() { fileInput.value?.click() }
async function handleFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > 25 * 1024 * 1024) {
    analysisError.value = '文件超过 25 MB'
    return
  }
  try {
    const parsed = parseXYCsv(await file.text())
    recording.value = parsed
    fileName.value = file.name
    const keys = CHANNEL_LABELS.filter(name => parsed.channels[name]?.length)
    if (!keys[0] || !keys[1]) throw new Error('CSV 没有两个可关联的通道')
    xChannel.value = keys[0]
    yChannel.value = keys[1]
    startIndex.value = 0
    source.value = 'file'
    await nextTick()
    render()
  } catch (err) {
    analysisError.value = err instanceof Error ? err.message : String(err)
  }
}

watch([plotPoints, xChannel, yChannel], () => {
  if (active.value) { render(); scheduleAnalysis() }
})
watch(windowSize, () => { if (startIndex.value > maxStart.value) startIndex.value = maxStart.value })
onMounted(() => {
  if (chartEl.value) {
    chart = echarts.init(chartEl.value, undefined, { renderer: 'canvas', useDirtyRect: true })
    resizeObserver = new ResizeObserver(() => chart?.resize())
    resizeObserver.observe(chartEl.value)
    render()
    scheduleAnalysis()
  }
})
onActivated(() => {
  active.value = true
  nextTick(() => { chart?.resize(); render(); scheduleAnalysis() })
})
onDeactivated(() => {
  active.value = false
  requestId++
  if (analysisTimer !== null) clearTimeout(analysisTimer)
})
onBeforeUnmount(() => {
  requestId++
  if (analysisTimer !== null) clearTimeout(analysisTimer)
  resizeObserver?.disconnect()
  chart?.dispose()
  chart = null
})
</script>

<style scoped lang="less">
.xy-page { display:flex; flex-direction:column; width:100%;height:100%; padding:16px; box-sizing:border-box; gap:12px; overflow:hidden; }
.xy-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.xy-toolbar strong { margin-right:8px; font-size:17px; }
.channel-select { width:80px; }
.axis-label { font-weight:600; color:var(--text-color-secondary,#606977); }
.hidden-input { display:none; }
.xy-layout { flex:1; min-height:0; display:grid; grid-template-columns:minmax(0,1fr) 260px; gap:14px; }
.xy-plot-panel { min-height:0; min-width:0; display:flex; flex-direction:column; align-items:center; justify-content:center; border:1px solid var(--border-color,#d9dce2); border-radius:10px; padding:12px; }
.xy-canvas-wrap { flex:1; position:relative; min-height:0; width:100%; display:flex; justify-content:center; align-items:center; }
.xy-canvas { width:min(100%, 65vh); height:min(100%, 65vh); aspect-ratio:1; flex-shrink:0; }
.xy-empty { position:absolute; inset:0; display:grid;place-items:center;pointer-events:none; color:#8995a5; font-size:13px; }
.axis-note { color:#9aa4ad; font-size:11px; text-align:center; padding-bottom:2px; }
.scrubber { display:flex;align-items:center;gap:20px; width:100%; font-size:12px;color:#748294; padding:0 14px; box-sizing:border-box; }
.scrubber :deep(.el-slider) { flex:1; min-width:0; }
.xy-side { border:1px solid var(--border-color,#d9dce2); border-radius:10px; padding:17px; display:flex; flex-direction:column; gap:14px; min-width:0; overflow:auto; }
.side-title { display:flex;justify-content:space-between;align-items:center;gap:8px; }
.side-title span,.file-name,.recording-info,.analysis-state { font-size:12px;color:#7d8996; }
.file-name { overflow-wrap:anywhere; }
.window-control { display:flex;justify-content:space-between;align-items:center; font-size:13px; }
.metric-grid { display:grid; grid-template-columns:1fr; gap:0; }
.metric-grid>div { display:flex;align-items:center;justify-content:space-between; padding:12px 0; border-bottom:1px solid var(--border-color,#e5e7eb); font-size:13px; }
.metric-grid b { font-variant-numeric:tabular-nums; font-size:16px; }
.analysis-state { margin-top:auto; }
.recording-info { display:flex; flex-direction:column; gap:5px; }
@media(max-width:930px) { .xy-layout { grid-template-columns:minmax(0,1fr) 190px; } .xy-side { padding:12px; } }
</style>
