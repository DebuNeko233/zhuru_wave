<template>
  <div class="interactive-wave-chart">
    <!-- 控制工具栏 -->
    <div class="chart-toolbar">
      <div class="toolbar-left">
        <h3>{{ title }}</h3>
        <div class="status-indicator" :class="statusClass">
          <span class="dot"></span>
          {{ currentStatus }}
        </div>
      </div>
      <el-progress
        v-if="isLocalDataLoading"
        :percentage="Math.round(loadingProgress)"
        :format="format"
        class="progress"
      />
      <div class="toolbar-right">
        <button class="control-btn exit-btn" @click="exitAlarmDataMode" v-if="props.isAlarm">
          退出报警数据查看模式
        </button>

        <button class="control-btn export-btn" @click="importData">
          <el-icon class="icon"
            ><svg
              t="1760410712825"
              class="icon"
              viewBox="0 0 1024 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              p-id="6410"
              width="200"
              height="200"
            >
              <path
                d="M881.7 928.7H141c-41.9 0-76.1-34.1-76.1-76.1V164.8c0-41.9 34.1-76.1 76.1-76.1h479c19.3 0 37 11.4 45.1 28.9l59.5 129.8h157.1c41.9 0 76.1 34.1 76.1 76.1v529.1c0 42-34.2 76.1-76.1 76.1zM141 135c-16.4 0-29.8 13.4-29.8 29.8v687.8c0 16.4 13.4 29.8 29.8 29.8h740.7c16.4 0 29.8-13.4 29.8-29.8V323.5c0-16.4-13.4-29.8-29.8-29.8H718.2c-14.2 0-27.2-8.3-33.1-21.2L623 137c-0.5-1.2-1.7-1.9-3-1.9H141z"
                fill="#7D7D7D"
                p-id="6411"
              ></path>
              <path
                d="M511.3 730.1c-12.8 0-23.1-10.4-23.1-23.1V310.1c0-12.8 10.4-23.1 23.1-23.1s23.1 10.4 23.1 23.1v396.8c0.1 12.8-10.3 23.2-23.1 23.2z"
                fill="#7D7D7D"
                p-id="6412"
              ></path>
              <path
                d="M647.6 564.9l-130 139.6c-3.5 3.7-9.1 3.7-12.6 0L375.1 564.9c-5.6-6-1.6-16.4 6.3-16.4h259.9c7.9 0.1 11.9 10.4 6.3 16.4z"
                fill="#CBCBCB"
                p-id="6413"
              ></path>
              <path
                d="M511.3 730.5c-8.8 0-17.2-3.7-23.3-10.2L358.1 580.7c-9-9.6-11.3-23.7-6.1-35.9 5.1-11.8 16.6-19.4 29.3-19.4h259.9c12.7 0 24.2 7.6 29.3 19.4 5.3 12.2 2.9 26.2-6.1 35.9L534.6 720.3c-6 6.4-14.5 10.2-23.3 10.2zM413 571.7l98.3 105.6 98.3-105.6H413z"
                fill="#7D7D7D"
                p-id="6414"
              ></path></svg
          ></el-icon>
          {{ isLocalDataLoading ? '导入中...' : '导入本地数据' }}
        </button>

        <button
          class="control-btn snapshot-btn"
          @click="toggleSnapshot"
          :class="{ active: isSnapshot }"
        >
          <el-icon class="icon"
            ><svg
              t="1760410760059"
              class="icon"
              viewBox="0 0 1024 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              p-id="9369"
              width="200"
              height="200"
            >
              <path
                d="M797.92 295.04h-75.136l-4.064-94.4a33.088 33.088 0 0 0-33.024-31.68H338.24a33.088 33.088 0 0 0-33.024 31.68l-4.064 94.4H224a88 88 0 0 0-88 88v381.888a90.08 90.08 0 0 0 90.08 90.08h571.808a90.112 90.112 0 0 0 90.112-90.112V385.12a90.08 90.08 0 0 0-90.08-90.112z m42.08 469.888a42.08 42.08 0 0 1-42.08 42.08H226.08a42.08 42.08 0 0 1-42.08-42.08V383.008A40 40 0 0 1 224 343.04h91.52a33.088 33.088 0 0 0 33.024-31.68l0.704-16.32 3.36-78.016h318.752l3.36 78.016 0.704 16.352a33.088 33.088 0 0 0 33.056 31.68h89.408a42.24 42.24 0 0 1 42.112 42.112z"
                fill="#3D71FA"
                p-id="9370"
              ></path>
              <path
                d="M24 416a24 24 0 0 0 24-24V88.32A40.384 40.384 0 0 1 88.32 48h303.68a24 24 0 0 0 0-48H88.32A88.448 88.448 0 0 0 0 88.32v303.68a24 24 0 0 0 24 24zM392 976H88.32a40.384 40.384 0 0 1-40.32-40.32v-303.68a24 24 0 0 0-48 0v303.68A88.448 88.448 0 0 0 88.32 1024h303.68a24 24 0 0 0 0-48zM935.68 0h-303.68a24 24 0 0 0 0 48h303.68a40.384 40.384 0 0 1 40.32 40.32v303.68a24 24 0 0 0 48 0V88.32A88.448 88.448 0 0 0 935.68 0zM1000 608a24 24 0 0 0-24 24v303.68a40.384 40.384 0 0 1-40.32 40.32h-303.68a24 24 0 0 0 0 48h303.68A88.448 88.448 0 0 0 1024 935.68v-303.68a24 24 0 0 0-24-24zM696 577.184a184 184 0 1 0-184 184 184.192 184.192 0 0 0 184-184zM512 713.184a136 136 0 1 1 136-136 136.16 136.16 0 0 1-136 136z"
                fill="#272D43"
                p-id="9371"
              ></path></svg
          ></el-icon>
          {{ isSnapshot ? '恢复实时' : '拍摄快照' }}
        </button>

        <button class="control-btn export-btn" @click="exportData" :disabled="!hasData">
          <el-icon class="icon"
            ><svg
              t="1760411216791"
              class="icon"
              viewBox="0 0 1024 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              p-id="14341"
              width="200"
              height="200"
            >
              <path
                d="M128 853.333333a42.666667 42.666667 0 0 0 42.666667 42.666667h682.666666a42.666667 42.666667 0 0 0 42.666667-42.666667V533.333333h-85.333333v277.333334H213.333333V213.333333h277.333334V128H170.666667a42.666667 42.666667 0 0 0-42.666667 42.666667v682.666666z"
                fill="#000000"
                p-id="14342"
              ></path>
              <path
                d="M661.333333 106.666667h-42.666666v85.333333h156.650666L464.149333 503.168 433.984 533.333333l60.352 60.352 30.165333-30.186666L832 256v149.333333h85.333333V149.333333a42.666667 42.666667 0 0 0-42.666666-42.666666H661.333333z"
                fill="#0078FF"
                p-id="14343"
              ></path></svg
          ></el-icon>
          导出数据
        </button>

        <button class="control-btn zoom-btn" @click="resetZoom">
          <el-icon class="icon"
            ><svg
              t="1760411283163"
              class="icon"
              viewBox="0 0 1028 1024"
              version="1.1"
              xmlns="http://www.w3.org/2000/svg"
              p-id="20274"
              width="200"
              height="200"
            >
              <path
                d="M900.48 0h-768a128 128 0 0 0-128 128v627.84C0 772.48 0 808.32 4.48 896a128 128 0 0 0 128 128h768a128 128 0 0 0 128-128V128a128 128 0 0 0-128-128z m64 896a64 64 0 0 1-64 64h-768a66.88 66.88 0 0 1-16.32-2.24l272.32-272.64V832h64v-256h-256v64h146.56l-272 272a67.84 67.84 0 0 1-2.88-18.24c0-16.64-1.92-34.56-2.88-51.52l3.2 2.88V128a64 64 0 0 1 64-64h768a71.68 71.68 0 0 1 16.32 2.24l-272.32 272.64V192h-64v256h256v-64h-146.88l272.32-272.32a54.4 54.4 0 0 1 2.56 16.32z"
                fill="#54C3F1"
                p-id="20275"
              ></path></svg
          ></el-icon>
          重置缩放
        </button>
      </div>
    </div>

    <!-- 波形图区域 -->
    <div class="chart-content" ref="chartContainer"></div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
  defineEmits,
  onBeforeUnmount
} from 'vue'
import * as echarts from 'echarts'

import type { ChannelDataInfo } from '@main/type'
import { OfflinePeakCounter } from './offlineMetrics'
import type { AlarmFileData, AlarmData } from '@renderer/types/alarmData'
import { useLogStore } from '@renderer/store/logStore'
import useAlarmDataStore from '@renderer/store/alarmDataStore'
import { useAlarmNotification } from '@renderer/components/AlarmNotification/useAlarmNotification'
import useParamSettingStore from '@renderer/store/paramentSetting'

// Props 定义
const props = defineProps({
  channelId: {
    type: Number,
    required: true
  },
  title: {
    type: String,
    default: '波形图'
  },
  isLocal: {
    type: Boolean
  },
  isAlarm: {
    type: Boolean
  },
  channelData: {
    type: Object as () => ChannelDataInfo
  }
})

// 发送emits
const emit = defineEmits(['changeLocalMode', 'exitAlarm'])

// 数据和状态
const chartContainer = ref(null)
const isChartReady = ref(false)
const isSnapshot = ref(false)
const snapshotData = ref<ChannelDataInfo | null>(null)
const snapshotTime = ref('')
const isLocalDataLoading = ref(false)
const loadingProgress = ref(0)
const currentStreamReader = ref<CSVStreamReader | null>(null) // 新增：当前读取器实例
const logStore = useLogStore()
const alarmDataStore = useAlarmDataStore()

const paramentSettingStore = useParamSettingStore()
const { showAlarmNotification } = useAlarmNotification()

const pauseTimeoutId = ref<NodeJS.Timeout | null>(null) // 用于跟踪暂停计时器
const isDestroyed = ref(false) // 添加销毁状态标记

// 游标索引（唯一游标）
const cursorIndex = ref<number>(0)

let dragRafId: number | null = null
let dragPendingX: number | null = null

let cursorGraphicsInitialized = false
let repositionRafId: number | null = null

const repositionCursorGraphics = () => {
  if (!chart || !hasData.value) return
  const { topPx, bottomPx } = getGridPx()
  const pxX = chart!.convertToPixel({ xAxisIndex: 0 }, cursorIndex.value)

  chart!.setOption({
    graphic: {
      elements: [
        {
          $action: 'merge',
          id: 'cursorLine',
          shape: { x1: pxX, y1: topPx, x2: pxX, y2: bottomPx }
        },
        {
          $action: 'merge',
          id: 'cursorHandle',
          x: pxX,
          y: topPx - 25
        },
        {
          $action: 'merge',
          id: 'cursorLabel',
          x: pxX + 20,
          y: topPx - 45
        }
      ]
    }
  })
}

const scheduleCursorReposition = () => {
  if (repositionRafId !== null) return
  repositionRafId = requestAnimationFrame(() => {
    repositionCursorGraphics()
    repositionRafId = null
  })
}

const ensureCursorGraphics = (forceInit = false) => {
  if (!chart || !hasData.value) return
  if (forceInit || !cursorGraphicsInitialized) {
    attachCursorGraphics()
    cursorGraphicsInitialized = true
  } else {
    scheduleCursorReposition()
  }
}

const scheduleDrag = (offsetX: number) => {
  dragPendingX = offsetX
  if (dragRafId !== null) return
  dragRafId = requestAnimationFrame(() => {
    const x = dragPendingX!
    dragPendingX = null
    dragRafId = null
    handleDrag(x)
  })
}

// handleDrag 只负责计算与图形位置更新；用 merge 更新避免重绑事件
const handleDrag = (offsetX: number) => {
  const { topPx, bottomPx, minX, maxX } = getGridPx()
  const x = Math.max(minX, Math.min(maxX, offsetX))

  const coord = chart!.convertFromPixel('grid', [x, topPx])
  if (!coord || coord[0] == null || isNaN(coord[0])) {
    return
  }

  const total = displayData.value!.showData.length
  const newIdx = Math.round(Math.max(0, Math.min(total - 1, coord[0])))
  cursorIndex.value = newIdx

  const newPixelX = chart!.convertToPixel({ xAxisIndex: 0 }, newIdx)

  chart!.setOption({
    graphic: {
      elements: [
        {
          $action: 'merge',
          id: 'cursorLine',
          shape: { x1: newPixelX, y1: topPx, x2: newPixelX, y2: bottomPx },
          style: {
            stroke: '#00aaff',
            lineWidth: 3,
            lineDash: [8, 4],
            shadowBlur: 8,
            shadowColor: 'rgba(0, 170, 255, 0.4)',
            opacity: 0.8
          }
        },
        {
          $action: 'merge',
          id: 'cursorHandle',
          x: newPixelX,
          y: topPx - 25
        },
        {
          $action: 'merge',
          id: 'cursorLabel',
          x: newPixelX + 20,
          y: topPx - 45,
          style: { text: `索引: ${cursorIndex.value}` }
        }
      ]
    }
  })

  updateSelectionArea()
}

const getGridPx = () => {
  if (!chart) return { leftPx: 0, rightPx: 0, topPx: 0, bottomPx: 0, minX: 0, maxX: 0 }
  const w = chart.getWidth()
  const h = chart.getHeight()
  const gridOpt = (chart as any).getModel().getComponent('grid', 0)?.option || {}

  const left = gridOpt.left ?? '3%'
  const right = gridOpt.right ?? '3%'
  const top = gridOpt.top ?? '3%'
  const bottom = gridOpt.bottom ?? '3%'

  const toPx = (val: number | string, total: number) =>
    typeof val === 'string' ? (parseFloat(val) / 100) * total : val

  const leftPx = toPx(left, w)
  const rightPx = toPx(right, w)
  const topPx = toPx(top, h)

  // 关键修复：grid.bottom 是“距离底部的偏移”，因此底边 Y = 总高度 - bottomOffset
  const bottomOffsetPx = toPx(bottom, h)
  const bottomPx = h - bottomOffsetPx

  return {
    leftPx,
    rightPx,
    topPx,
    bottomPx,
    minX: leftPx,
    maxX: w - rightPx
  }
}

// 用异常周期的半透明背景逐周期标注；选中区域与异常区间共用 markArea，
// 避免游标拖动时覆盖掉异常标记。
const getWaveMarkAreas = (total: number) => {
  const marked: any[] = [
    [
      {
        name: '选中区域',
        xAxis: cursorIndex.value,
        itemStyle: {
          color: 'rgba(66, 133, 244, 0.08)',
          borderColor: 'rgba(66, 133, 244, 0.25)',
          borderWidth: 1
        }
      },
      { xAxis: total - 1 }
    ]
  ]

  for (const period of displayData.value?.peakStableSpans || []) {
    const start = Math.max(0, Math.floor(period.start_index))
    const end = Math.min(total, Math.ceil(period.end_index_exclusive))
    if (Number.isFinite(start) && Number.isFinite(end) && start < end) {
      marked.push([{ xAxis: start, itemStyle: {
        color: 'rgba(35, 166, 112, 0.12)', borderColor: 'rgba(35, 166, 112, 0.28)'
      } }, { xAxis: end - 1 }])
    }
  }
  // 候选回折仅以琥珀色提示，不直接代表已确认报警。
  for (const period of displayData.value?.suspectCycles || []) {
    const start = Math.max(0, Math.floor(period.start_index))
    const end = Math.min(total, Math.ceil(period.end_index_exclusive))
    if (Number.isFinite(start) && Number.isFinite(end) && start < end) {
      marked.push([{ xAxis: start, itemStyle: {
        color: 'rgba(234, 164, 46, 0.12)', borderColor: 'rgba(234, 164, 46, 0.28)'
      } }, { xAxis: end - 1 }])
    }
  }
  for (const period of displayData.value?.defectCycles || []) {
    if (!Number.isFinite(period.start_index) || !Number.isFinite(period.end_index_exclusive)) {
      continue
    }
    const start = Math.max(0, Math.floor(period.start_index))
    const end = Math.min(total, Math.ceil(period.end_index_exclusive))
    if (start >= end) continue
    marked.push([
      {
        xAxis: start,
        itemStyle: {
          color: 'rgba(255, 68, 68, 0.14)',
          borderColor: 'rgba(255, 68, 68, 0.35)',
          borderWidth: 1
        }
      },
      { xAxis: end - 1 }
    ])
  }
  return marked
}

const updateSelectionArea = () => {
  if (!chart || !hasData.value) return
  chart.setOption({
    series: [
      {
        name: '波形数据',
        markArea: { silent: true, data: getWaveMarkAreas(displayData.value!.showData.length) }
      }
    ]
  })
}

// 渲染或更新“唯一游标”（线、手柄、标签），并绑定水平拖拽
const attachCursorGraphics = () => {
  if (!chart || !hasData.value) return

  const total = displayData.value!.showData.length
  cursorIndex.value = Math.max(0, Math.min(total - 1, cursorIndex.value))

  const { leftPx, rightPx, topPx, bottomPx, minX, maxX } = getGridPx()

  let pxX = chart!.convertToPixel({ xAxisIndex: 0 }, cursorIndex.value)

  // 如果坐标转换失败，使用默认位置
  if (!pxX || isNaN(pxX)) {
    console.warn('convertToPixel failed, using default position')
    pxX = leftPx + (cursorIndex.value / (displayData.value!.showData.length - 1)) * (maxX - minX)
  }

  // 初次渲染也改为 elements 写法
  chart!.setOption({
    graphic: {
      elements: [
        {
          id: 'cursorTrack',
          type: 'line',
          draggable: false,
          shape: { x1: leftPx, y1: topPx - 25, x2: chart!.getWidth() - rightPx, y2: topPx - 25 },
          style: { stroke: '#00aaff', lineWidth: 3, opacity: 0.3, lineDash: [5, 5] },
          silent: true
        },
        {
          id: 'cursorLine',
          type: 'line',
          draggable: false,
          shape: { x1: pxX, y1: topPx, x2: pxX, y2: bottomPx },
          style: {
            stroke: '#00aaff',
            lineWidth: 3,
            lineDash: [8, 4],
            shadowBlur: 8,
            shadowColor: 'rgba(0, 170, 255, 0.4)',
            opacity: 0.8
          }
        },
        {
          id: 'cursorHandle',
          draggable: true,
          cursor: 'ew-resize',
          type: 'polygon',
          x: pxX,
          y: topPx - 25,
          shape: {
            points: [
              [0, 0], // 顶点
              [-10, -14], // 左上圆角
              [-6, -22],
              [0, -26], // 下尖
              [6, -22],
              [10, -14], // 右上圆角
              [0, 0]
            ]
          },
          style: {
            fill: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#38bdf8' },
              { offset: 1, color: '#0ea5e9' }
            ]),
            stroke: '#ffffff',
            lineWidth: 1.5,
            shadowColor: 'rgba(56,189,248,0.8)',
            shadowBlur: 12
          },
          ondrag: function (event: any) {
            if (event?.target) {
              event.target.y = topPx - 25
            }

            const dragX = event.target.x || event.offsetX || event.event?.offsetX
            scheduleDrag(dragX)
          },
          ondragend: function (event: any) {
            const dragX = event?.target?.x || event?.offsetX || event?.event?.offsetX
            if (typeof dragX === 'number') {
              if (dragPendingX !== null) {
                handleDrag(dragPendingX)
                dragPendingX = null
              }
              if (dragRafId !== null) {
                cancelAnimationFrame(dragRafId)
                dragRafId = null
              }
            }
          }
        },
        {
          id: 'cursorLabel',
          type: 'text',
          x: pxX + 20,
          y: topPx - 45,
          style: {
            text: `索引: ${cursorIndex.value}`
          },
          silent: true
        }
      ]
    }
  })

  updateSelectionArea()
  cursorGraphicsInitialized = true
}

const currentStatus = computed(() => {
  if (props.isAlarm) {
    return '报警数据查看模式'
  }
  if (props.isLocal) {
    return '本地数据加载模式'
  }
  if (isSnapshot.value) {
    return '快照模式'
  }
  if (paramentSettingStore.programSettings.realTimeMode) {
    return '实时模式'
  }
  return '本地模式'
})

// 新增：状态样式类计算属性
const statusClass = computed(() => {
  if (props.isAlarm) {
    return 'alarm-mode'
  }
  if (props.isLocal) {
    return 'local-mode'
  }
  if (isSnapshot.value) {
    return 'snapshot'
  }
  if (paramentSettingStore.programSettings.realTimeMode) {
    return 'live'
  }
  return 'offline-mode'
})

let chart: echarts.ECharts | null = null
let resizeObserver: ResizeObserver | null = null
let updateTimer: ReturnType<typeof setTimeout> | null = null
let resizeTimer: ReturnType<typeof setTimeout> | null = null

// 数据存储和API

const format = (percentage) => (percentage === 100 ? 'Full' : `${percentage}%`)

const exitAlarmDataMode = () => {
  emit('exitAlarm', false)
}

// 计算属性：获取当前显示的数据
const displayData = computed(() => {
  if (isSnapshot.value && snapshotData.value) {
    return snapshotData.value
  }

  return props.channelData
})

// 计算属性：是否有数据
const hasData = computed(() => {
  return displayData.value && displayData.value.showData && displayData.value.showData.length > 0
})

// 计算属性：图表数据
const chartData = computed(() => {
  if (!hasData.value) return []
  return displayData.value!.showData.map((value, index) => [index, value])
})

// 计算属性：Y轴范围
const yAxisRange = computed(() => {
  if (!displayData.value?.yAxisRange) {
    return { min: -100, max: 100 }
  }
  return displayData.value.yAxisRange
})

// 快照功能
const toggleSnapshot = () => {
  if (pauseTimeoutId.value) {
    clearTimeout(pauseTimeoutId.value)
    pauseTimeoutId.value = null
    console.log('取消了暂停计时器')
  }
  if (isSnapshot.value) {
    // 恢复实时模式
    isSnapshot.value = false
    snapshotData.value = null
    if (props.isAlarm) {
      emit('exitAlarm', false)
    }
    snapshotTime.value = ''
    if (isLocalDataLoading.value) {
      currentStreamReader.value?.resume()
    }
  } else {
    // 拍摄快照
    if (displayData.value) {
      snapshotData.value = JSON.parse(JSON.stringify(displayData.value))
      snapshotTime.value = new Date().toLocaleString()
      isSnapshot.value = true
    }
    if (isLocalDataLoading.value) {
      currentStreamReader.value?.pause()
    }
  }
}

// 离线导入顺序等待 Python 返回；实时设备采样仍保留 Worker 异步策略。
interface StreamCSVOptions {
  batchSize: number
  chunkSize: number
  channelId: number
  onBatchReady: (data: number[], batchIndex: number, progress: number, currentChannel: number, metadata: Record<string, string>) => Promise<void>
  onComplete: (totalCount: number) => void
  onError: (error: Error) => void
}

class CSVStreamReader {
  private file: File
  private options: StreamCSVOptions
  private isReading = false
  private isPaused = false
  private cancelled = false
  private position = 0
  private batchIndex = 0
  private sampleCount = 0
  private currentBatch: number[] = []
  private metadata: Record<string, string> = {}
  private format: 'unknown' | 'zhuru' | 'drc' | 'indexed' | 'scalar' = 'unknown'
  private columns: string[] = []
  private dataColumn = 0
  private wake: (() => void) | null = null

  constructor(file: File, options: StreamCSVOptions) {
    this.file = file
    this.options = options
  }

  start() {
    if (this.isReading) return
    this.isReading = true
    this.cancelled = false
    isLocalDataLoading.value = true
    void this.pump()
  }

  stop() {
    this.cancelled = true
    this.isReading = false
    this.isPaused = false
    this.wake?.()
    this.wake = null
    isLocalDataLoading.value = false
  }

  pause() { this.isPaused = true }
  resume() {
    this.isPaused = false
    this.wake?.()
    this.wake = null
  }
  getStatus() {
    return {isReading: this.isReading, isPaused: this.isPaused,
      progress: 100 * this.position / Math.max(1, this.file.size), currentBatch: this.batchIndex}
  }

  private async waitReady() {
    while (this.isPaused && !this.cancelled) {
      await new Promise<void>(resolve => { this.wake = resolve })
    }
  }

  private parseLine(line: string): number | null {
    const text = line.trim()
    if (!text) return null
    if (this.format === 'unknown') {
      if (text.startsWith('DRC_File:') || text.startsWith('Channels_qnty:') || /^CH\s+Index\s+Value/i.test(text)) {
        this.format = 'drc'
      } else if (text.startsWith('meta_key,meta_value,sample_index')) {
        this.format = 'zhuru'
        this.columns = text.split(',').map(x => x.trim())
        const requested = this.options.channelId
        const selected = this.columns.findIndex(x =>
          x.toLowerCase() === `ch${requested}_raw` ||
          x.toLowerCase() === (requested === 1 ? 'x_raw' : 'y_raw'))
        if (selected < 3 && this.columns.length > 4) {
          throw new Error(`CSV 未包含通道 ${requested} 的原始采样列`)
        }
        this.dataColumn = selected >= 3 ? selected : 3
        return null
      } else if (/^(index|sample_index),/i.test(text)) {
        this.format = 'indexed'
        return null
      } else {
        this.format = 'scalar'
      }
    }
    if (this.format === 'drc') {
      const cells = text.split(/\s+/)
      if (cells.length !== 3 || !/^\d+$/.test(cells[0]) || !/^\d+$/.test(cells[1])) return null
      const v = Number(cells[2])
      return Number.isFinite(v) ? v : null
    }
    if (this.format === 'zhuru') {
      const cells = text.split(',')
      if (cells[0] && cells[1] !== undefined && cells[2] === '') {
        this.metadata[cells[0].trim()] = cells[1].trim()
        return null
      }
      if (cells.length <= this.dataColumn || !/^\d+$/.test((cells[2] || '').trim())) return null
      const v = Number(cells[this.dataColumn])
      return Number.isFinite(v) ? v : null
    }
    if (this.format === 'indexed') {
      const cells = text.split(',')
      const v = Number(cells[1])
      return cells.length >= 2 && Number.isFinite(v) ? v : null
    }
    // Compatibility: old exported CSV contains one raw value per row.
    const v = Number(text)
    return Number.isFinite(v) ? v : null
  }

  private async pushLine(line: string) {
    const value = this.parseLine(line)
    if (value === null) return
    this.currentBatch.push(value)
    this.sampleCount++
    if (this.currentBatch.length >= this.options.batchSize) await this.flush()
  }

  private async flush() {
    if (!this.currentBatch.length || this.cancelled) return
    const values = this.currentBatch
    this.currentBatch = []
    await this.options.onBatchReady(values, this.batchIndex++,
      Math.min(100, 100 * this.position / Math.max(1, this.file.size)),
      this.options.channelId, this.metadata)
  }

  private async pump() {
    const reader = this.file.stream().getReader()
    const decoder = new TextDecoder('utf-8')
    let rest = ''
    try {
      while (!this.cancelled) {
        await this.waitReady()
        if (this.cancelled) break
        const {value, done} = await reader.read()
        if (done) break
        this.position += value.byteLength
        const lines = (rest + decoder.decode(value, {stream: true})).split(/\r?\n/)
        rest = lines.pop() || ''
        for (const line of lines) {
          await this.waitReady()
          if (this.cancelled) break
          await this.pushLine(line)
        }
        loadingProgress.value = Math.min(100, 100 * this.position / Math.max(1, this.file.size))
      }
      if (!this.cancelled) {
        await this.pushLine(rest + decoder.decode())
        await this.flush()
        if (!this.cancelled) this.options.onComplete(this.sampleCount)
      }
    } catch (error) {
      if (!this.cancelled) this.options.onError(error instanceof Error ? error : new Error(String(error)))
    } finally {
      try { await reader.cancel() } catch { /* already closed */ }
      this.isReading = false
      isLocalDataLoading.value = false
      loadingProgress.value = 100
    }
  }
}

// 导入数据功能
// 修改后的 importData 函数
const importData = async () => {
  // 检查是否已经有数据正在导入
  if (isLocalDataLoading.value) {
    alert('数据正在导入中，请等待当前导入完成后再试')
    return
  }

  // 如果有正在进行的读取器，先停止它
  if (currentStreamReader.value) {
    currentStreamReader.value.stop()
    currentStreamReader.value = null
  }

  // 选取文件后再停硬件，取消对话框不影响实时采集。
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.csv'
  input.style.display = 'none'

  input.onchange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]

    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('请选择 CSV 格式的文件')
      return
    }

    // 回放时必须真正连接算法后端，否则只画波形却不报警会误导用户。
    let detectorHealth
    try {
      detectorHealth = await window.electronAPI.invoke('data:detector-health')
    } catch (error) {
      detectorHealth = { success: false, error: String(error) }
    }
    if (!detectorHealth?.success) {
      alert(`检测服务未运行或不可用，请先在 backend 目录启动 python f6.py。\n127.0.0.1:5001/health\n${detectorHealth?.error || ''}`)
      return
    }

    const stopResult = await window.electronAPI.invoke('data:stop-collection')
    if (!stopResult.success) { alert('无法停止实时采集'); return }
    let previousBatchWarn = false
    const peakCounter = new OfflinePeakCounter()

    // 创建流式读取器
    const streamReader = new CSVStreamReader(file, {
      batchSize: 2000, // 约40个采样周期；优先避免把短异常稀释
      chunkSize: 64 * 1024, // 每次读取 64 KiB
      channelId: props.channelId,
      onBatchReady: async (
        data: number[],
        batchIndex: number,
        progress: number,
        currentChannel: number,
        metadata: Record<string, string>
      ) => {
        console.log(
          `处理第 ${batchIndex + 1} 批数据: ${data.length} 个点, 进度: ${progress.toFixed(1)}%`
        )
        // console.log('data', data)
        let isWarn, status, err_pic_path_list, err_data_list, defectPoints, defectCycles
        // 进行判断

        let isTriangleResult = await window.electronAPI.invoke('data:isTriangle', {
          wave: data,
          epsilon: 6000,
          save_path: paramentSettingStore.programSettings.debugStorage.debugImgPath,
          debug_total: false,
          debug_single: false,
          period_step: 2,
          rate: paramentSettingStore.programSettings.debugStorage.rate,
          step1: paramentSettingStore.programSettings.debugStorage.step1,
          step2: paramentSettingStore.programSettings.debugStorage.step2,
          sample_rate_hz: Number(metadata.sample_rate_hz) > 0 ? Number(metadata.sample_rate_hz) : undefined
        })

        console.log('收到返回的数据', isTriangleResult)

        if (isTriangleResult.success && isTriangleResult.isTriangle) {
          status = '正常'
          isWarn = false
          err_pic_path_list = []
          err_data_list = []
          defectPoints = []
          defectCycles = []
        } else if (isTriangleResult.success && !isTriangleResult.isTriangle) {
          status = '警告'
          isWarn = true
          err_pic_path_list = isTriangleResult.err_pic_path_list
          err_data_list = isTriangleResult.err_data_list
          defectPoints = (isTriangleResult.defectPoints || []).map((pt: {x: number, y: number}) => ({
            x: pt.x, y: data[pt.x] ?? pt.y
          }))
          defectCycles = (isTriangleResult.defectCycles || []).filter(
            (cycle: { start_index: number; end_index_exclusive: number }) =>
              Number.isFinite(cycle.start_index) && Number.isFinite(cycle.end_index_exclusive) &&
              cycle.start_index >= 0 && cycle.end_index_exclusive <= data.length &&
              cycle.start_index < cycle.end_index_exclusive
          )
        } else {
          status = '检测服务错误'
          isWarn = false
          err_pic_path_list = []
          err_data_list = []
          defectPoints = []
          defectCycles = []
          console.error('离线检测服务异常', isTriangleResult.error)
          throw new Error(`第 ${batchIndex + 1} 批检测失败：${isTriangleResult.error || '服务无响应'}`)
        }

        const metricResults = isTriangleResult.metricResults
        const peakHistory = peakCounter.addBatch(
          data.length,
          isTriangleResult.cycleMetrics || []
        )
        if (metricResults?.peak_stable_cycles) {
          metricResults.peak_stable_cycles.value = peakHistory.count
          metricResults.peak_stable_cycles.reference_peak_to_peak_raw =
            peakHistory.reference ?? undefined
        }
        const peakStableSpans = peakHistory.currentBatchSpans
        const suspectCycles = isTriangleResult.suspectCycles || []

        // 原始采样幅值：不假定已换算成物理电压。
        const batchDataInfo: ChannelDataInfo = {
          peakVoltage: Math.max(...data),
          minimumVoltage: Math.min(...data),
          averageVoltage: data.reduce((sum, val) => sum + val, 0) / data.length,
          status: status,
          deviation: `${calculateDeviation(data)}`,
          range: `${Math.max(...data) - Math.min(...data)}` ,
          showData: data,
          yAxisRange: { min: Math.min(...data), max: Math.max(...data) },
          isWarn: isWarn,
          isConnect: true,
          err_pic_path_list: err_pic_path_list,
          err_data_list: err_data_list,
          defectPoints: defectPoints,
          defectCycles: defectCycles,
          metricResults,
          peakStableSpans,
          suspectCycles,
          sampleRateHz: Number(metadata.sample_rate_hz) > 0 ? Number(metadata.sample_rate_hz) : undefined
        }

        if (isWarn && !previousBatchWarn) {
          // 同一段连续异常只生成一条报警记录，避免包含不可序列化的属性
          const alarmData = {
            channelId: currentChannel,
            timestamp: new Date().getTime(),
            analysisConclusion: `扫描波形检测异常：${(isTriangleResult.defectTypes || []).join('、') || '波形局部失真'}`,
            severity: 'critical' as const,
            snapshotData: {
              waveformData: Array.isArray(batchDataInfo.showData)
                ? [...batchDataInfo.showData]
                : [],
              statistics: {
                peakVoltage: Number(batchDataInfo.peakVoltage) || 0,
                minimumVoltage: Number(batchDataInfo.minimumVoltage) || 0,
                averageVoltage: Number(batchDataInfo.averageVoltage) || 0,
                range: String(batchDataInfo.range) || '',
                deviation: String(batchDataInfo.deviation) || '',
                status: String(batchDataInfo.status) || ''
              },
              yAxisRange: {
                min: Number(batchDataInfo.yAxisRange?.min) || 0,
                max: Number(batchDataInfo.yAxisRange?.max) || 100
              },
              err_data_list: err_data_list,
              err_pic_path_list: err_pic_path_list,
              defectPoints: defectPoints,
              defectCycles: defectCycles,
              metricResults,
              peakStableSpans
            }
          }

          await alarmDataStore.addAlarm(props.channelId, alarmData)

          // 添加报警信息 TODO
          await logStore.addLog({
            level: 'warn',
            message: `当前通道触发报警`,
            source: `通道${currentChannel}信息`,
            details: `通道${props.channelId}离线波形检测出异常，已保存报警快照`
          })
          showAlarmNotification(alarmData)
        }

        previousBatchWarn = isWarn

        // 传递给上层组件
        emit('changeLocalMode', batchDataInfo, {
          batchIndex,
          progress,
          isStreaming: true,
          isComplete: false
        })

        if (isWarn) {
          // 只短暂停留以便用户看到异常，不再等待 5 秒。检测仍然逐批执行。
          if (currentStreamReader.value) {
            console.log('检测到缺陷，短暂停留后继续读取')
            currentStreamReader.value.pause()

            if (pauseTimeoutId.value) {
              clearTimeout(pauseTimeoutId.value)
              pauseTimeoutId.value = null
            }

            pauseTimeoutId.value = setTimeout(() => {
              console.log('暂停结束，恢复数据读取')
              // 如果 streamReader 仍然存在且处于暂停状态，则恢复
              if (currentStreamReader.value && currentStreamReader.value.getStatus().isPaused) {
                currentStreamReader.value.resume()
              }
              pauseTimeoutId.value = null // 清除计时器ID
            }, 250)
          }
        }
      },

      onComplete: async (totalCount: number) => {
        console.log(`CSV文件加载完成，总数据点: ${totalCount}`)
        currentStreamReader.value = null
        // 可以发送完成信号
        emit('changeLocalMode', null, {
          isComplete: true,
          totalCount
        })

        // 离线回放结束后停留在最后一帧，不自动启动硬件。
      },

      onError: (error: Error) => {
        console.error('CSV读取错误:', error)
        alert(`离线数据处理已中断：${error.message}`)
        currentStreamReader.value = null
      }
    })

    // 保存读取器实例
    currentStreamReader.value = streamReader

    // 开始流式读取
    streamReader.start()

    // 清理
    document.body.removeChild(input)
  }

  document.body.appendChild(input)
  input.click()
}

const calculateDeviation = (data: number[]): number => {
  if (data.length === 0) return 0
  const mean = data.reduce((sum, val) => sum + val, 0) / data.length
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length
  return Math.sqrt(variance)
}

// 导出数据功能
const exportData = () => {
  if (!hasData.value) return

  const data = displayData.value!
  const header = [
    'meta_key,meta_value,sample_index,X_raw',
    'format,zhuru-wave-v1,,',
    'sample_rate_hz,,,',
    'channel_count,1,,',
    `channel_names,CH${props.channelId},,`,
    'amplitude_unit,raw,,',
    'mode,export,,',
  ]
  const csvContent = header.join('\n') + '\n' +
    data.showData.map((value, index) => `,,${index},${value}`).join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `channel_${props.channelId}_${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// 重置缩放
const resetZoom = () => {
  if (chart && !chart.isDisposed()) {
    chart.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100
    })
  }
}

// 图表配置
const getChartOption = () => {
  const dataLength = chartData.value.length || 1000

  return {
    backgroundColor: 'transparent',
    animation: false,
    grid: {
      left: '3%',
      right: '3%',
      top: '5%',
      bottom: '12%',
      containLabel: true
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        crossStyle: {
          color: '#999'
        }
      },
      formatter: (params: any) => {
        if (!params || params.length === 0) return ''

        let result = '<div style="padding: 8px;">'

        params.forEach((param: any) => {
          if (param.seriesName === '波形数据') {
            result += `
              <div>采样点: ${param.data[0]}</div>
              <div>原始幅值: ${param.data[1].toFixed(4)}</div>
              ${getSampleTimeHtml(param.data[0])}
            `
          } else if (param.seriesName === '报警点') {
            result += `
              <div style="color: #FF4444; font-weight: bold; margin-top: 8px;">⚠️ 报警点</div>
              <div>采样点: ${param.data[0]}</div>
              <div>原始幅值: ${param.data[1].toFixed(4)}</div>
              ${getSampleTimeHtml(param.data[0])}
            `
          }
        })

        result += '</div>'
        return result
      }
    },
    dataZoom: [
      {
        type: 'inside',
        xAxisIndex: 0,
        start: 0,
        end: 100,
        zoomOnMouseWheel: true,
        moveOnMouseMove: false,
        moveOnMouseWheel: false
      },
      {
        type: 'slider',
        xAxisIndex: 0,
        start: 0,
        end: 100,
        height: 20,
        bottom: 40,
        handleIcon:
          'path://M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23.1h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        handleSize: '80%',
        handleStyle: {
          color: '#fff',
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.6)',
          shadowOffsetX: 2,
          shadowOffsetY: 2
        }
      }
    ],
    legend: (() => {
      const hasDefectPoints = !!(
        displayData.value?.defectPoints &&
        displayData.value.defectPoints.some(
          (p) => p != null && p.x != null && Math.floor(p.x) >= cursorIndex.value
        )
      )
      return {
        data: [
          '波形数据',
          {
            name: hasDefectPoints ? '缺陷点' : '无缺陷点',
            itemStyle: {
              color: hasDefectPoints ? '#FF4444' : '#bbb'
            }
          }
        ],
        // 无缺陷点时禁止图例点击
        selectedMode: hasDefectPoints ? true : false,
        top: 10,
        right: 20,
        textStyle: {
          fontSize: 12,
          color: '#666'
        },
        itemWidth: 14,
        itemHeight: 14,
        formatter: (name: string) => name,
        inactiveColor: '#bbb'
      }
    })(),
    xAxis: {
      type: 'value',
      min: 0,
      max: dataLength > 0 ? dataLength - 1 : 1000,
      name: '采样点',
      nameLocation: 'middle',
      nameGap: 25,
      axisLine: {
        show: true,
        lineStyle: { color: '#ddd' }
      },
      axisTick: {
        show: true,
        lineStyle: { color: '#ddd' }
      },
      axisLabel: {
        color: '#666',
        fontSize: 11
      },
      splitLine: {
        show: true,
        lineStyle: {
          color: '#e0e0e0',
          type: 'dashed',
          opacity: 0.8
        }
      }
    },
    yAxis: {
      type: 'value',
      min: yAxisRange.value.min,
      max: yAxisRange.value.max,
      name: '原始幅值',
      nameLocation: 'middle',
      nameGap: 40,
      axisLine: {
        show: true,
        lineStyle: { color: '#ddd' }
      },
      axisTick: {
        show: true,
        lineStyle: { color: '#ddd' }
      },
      axisLabel: {
        color: '#666',
        fontSize: 11,
        formatter: '{value}'
      },
      splitLine: {
        show: true,
        lineStyle: {
          // 0点横线：虚线且加粗
          color: '#666',
          type: 'dashed',
          width: 1.5,
          opacity: 0.6
        }
      }
    },
    series: (() => {
      // 每次都重新构建完整的series数组
      const series = [
        {
          name: '波形数据',
          type: 'line',
          data: chartData.value,
          lineStyle: {
            color: isSnapshot.value ? '#FF9500' : '#007AFF',
            width: 2
          },
          symbol: 'none', // line类型只需要这个，不需要symbolSize
          animation: false,
          large: true,
          largeThreshold: 1000,
          progressive: 500,
          progressiveThreshold: 1000,
          markLine: {
            silent: false,
            data: []
          },
          markArea: {
            silent: true,
            data: getWaveMarkAreas(dataLength)
          }
        }
      ]

      // 处理缺陷点数据
      // defectPoints 来自 tubiandian_list：只使用 x(字典 key) 定位，忽略其 y 值
      if (displayData.value?.defectPoints && displayData.value.defectPoints.length > 0) {
        let processedAlarmData: number[][] = []

        try {
          // 将 Point[] 转换为 ECharts 需要的 [x, y][]，y 使用当前波形在 x 位置的值
          // 显示所有异常周期的代表点，不随游标位置隐藏。
          processedAlarmData = displayData.value.defectPoints
            .filter(
              (point) =>
                point != null && point.x != null
            )
            .map((point) => {
              if (point == null || point.x == null || isNaN(point.x)) {
                console.warn('遇到非法报警点', point)
                return null
              }
              let x = Math.floor(point.x)
              if (x < 0 || x > dataLength - 1) {
                console.warn('报警点坐标超出范围', point, '显示范围0~', dataLength - 1)
                x = Math.max(0, Math.min(dataLength - 1, x))
              }
              const y = displayData.value?.showData?.[x]
              if (typeof y !== 'number' || Number.isNaN(y)) {
                console.warn('报警点无法从波形数据映射纵坐标', point, 'x=', x)
                return null
              }
              return [x, y]
            })
            .filter((v) => v !== null) as number[][]

          if (processedAlarmData.length > 0) {
            series.push({
              name: '缺陷点',
              type: 'scatter',
              data: processedAlarmData,
              symbol: 'circle',
              symbolSize: 7,
              itemStyle: {
                color: '#FF4444',
                borderColor: '#fff',
                borderWidth: 1
              },
              emphasis: {
                itemStyle: {
                  color: '#FF2222',
                  borderColor: '#fff',
                  borderWidth: 1
                },
                symbolSize: 9
              },
              tooltip: {
                formatter: (params: any) => {
                  return `
                    <div style="padding: 8px;">
                      <div style="color: #FF4444; font-weight: bold;">⚠️ 缺陷点</div>
                      <div>采样点: ${params.data[0]}</div>
                      <div>原始幅值: ${params.data[1].toFixed(4)}</div>
                      ${getSampleTimeHtml(params.data[0])}
                    </div>
                  `
                }
              },
              z: 100 // 确保报警点在最上层
            } as any)
          } else {
            console.warn('没有有效的报警点数据')
          }
        } catch (error) {
          console.error('处理报警点数据时出错:', error)
        }
      } else {
        // 无缺陷点时追加空占位系列（名称"无缺陷点"），使图例色块显示为灰色
        series.push({
          name: '无缺陷点',
          type: 'scatter',
          data: [],
          symbol: 'circle',
          symbolSize: 7,
          itemStyle: {
            color: '#bbb',
            borderColor: '#fff',
            borderWidth: 1
          },
          silent: true // 禁止鼠标交互（hover/click）
        } as any)
        console.log('没有报警点数据需要处理')
      }


      // 仅候选的局部回折使用琥珀色标记，不作为确认报警红点。
      const suspectPoints = (displayData.value?.suspectCycles || [])
        .filter((c) => c.peak_index != null && Number.isFinite(c.peak_index))
        .map((c) => {
          const x = Math.floor(c.peak_index!)
          const y = displayData.value?.showData?.[x]
          return x >= 0 && x < dataLength && typeof y === 'number'
            ? [x, y] : null
        })
        .filter((p) => p !== null) as number[][]
      if (suspectPoints.length) {
        series.push({
          name: '斜率回折候选',
          type: 'scatter',
          data: suspectPoints,
          symbol: 'circle',
          symbolSize: 5,
          itemStyle: { color: '#E49B2A' },
          tooltip: { formatter: (params: any) =>
            `候选回折 · 采样点 ${params.data[0]}` },
          z: 95
        } as any)
      }

      return series
    })()
  }
}

// 只有 CSV 元数据提供了真实采样率，才展示相对采样时间。
const getSampleTimeHtml = (index: number): string => {
  const rate = displayData.value?.sampleRateHz
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0
    ? `<div>时间: ${((index / rate) * 1000).toFixed(3)}ms</div>`
    : ''
}

// 更新图表
const updateChart = () => {
  if (isDestroyed.value || !chart || chart.isDisposed() || !isChartReady.value) return

  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }

  updateTimer = setTimeout(() => {
    if (isDestroyed.value) return
    requestAnimationFrame(() => {
      if (isDestroyed.value || !chart || chart.isDisposed()) return
      try {
        chart.setOption(getChartOption(), true, true)

        // 图表更新后重新定位游标
        if (hasData.value) {
          ensureCursorGraphics(true)
        }
      } catch (error) {
        console.error('更新图表失败:', error)
      }
    })
  }, 16)
}

// 图表自适应
const resizeChart = () => {
  if (isDestroyed.value || !chart || chart.isDisposed() || !isChartReady.value) {
    return
  }

  if (chart && hasData.value) {
    scheduleCursorReposition()
  }

  try {
    chart.resize()
  } catch (error) {
    console.error('图表resize失败:', error)
  }
}

const debouncedResize = () => {
  if (isDestroyed.value) return

  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }
  resizeTimer = setTimeout(() => {
    if (!isDestroyed.value) {
      resizeChart()
    }
  }, 100)
}

// 初始化图表
const initChart = async () => {
  if (isDestroyed.value || !chartContainer.value) return

  try {
    chart = echarts.init(chartContainer.value, null, {
      renderer: 'canvas',
      useDirtyRect: true
    })

    chart.setOption(getChartOption())
    isChartReady.value = true

    if (window.ResizeObserver && chartContainer.value) {
      resizeObserver = new ResizeObserver(debouncedResize)
      resizeObserver.observe(chartContainer.value)
    }
    chart.on('dataZoom', () => {
      if (chart && hasData.value && !isDestroyed.value) {
        setTimeout(() => {
          scheduleCursorReposition()
        }, 0)
      }
    })

    window.addEventListener('resize', debouncedResize)

    console.log(`交互式波形图 ${props.title} 初始化完成`)
  } catch (error) {
    console.error('图表初始化失败:', error)
  }
}

// 销毁图表
const destroyChart = () => {
  isDestroyed.value = true

  // 清理定时器
  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }

  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }

  if (pauseTimeoutId.value) {
    clearTimeout(pauseTimeoutId.value)
    pauseTimeoutId.value = null
  }

  // 停止数据流读取器
  if (currentStreamReader.value) {
    currentStreamReader.value.stop()
    currentStreamReader.value = null
  }

  // 清理观察器
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  // 移除事件监听器
  window.removeEventListener('resize', debouncedResize)

  window.removeEventListener('loadAlarmSnapshot', handleAlarmSnapshot)

  // 销毁图表
  if (chart && !chart.isDisposed()) {
    try {
      chart.dispose()
    } catch (error) {
      console.error('图表销毁失败:', error)
    }
    chart = null
  }

  isChartReady.value = false
}

// 监听数据变化（仅在非快照模式下）
watch(
  () => displayData.value,
  (newData) => {
    if (isDestroyed.value || !newData || !isChartReady.value || isSnapshot.value) return
    updateChart()
  },
  { immediate: false }
)

// 当数据长度变化时，确保游标和选中区域跟随更新
watch(
  () => displayData.value?.showData?.length,
  () => {
    if (chart && hasData.value) {
      ensureCursorGraphics(false)
    }
  }
)

watch(
  () => props.isAlarm,
  (newIsAlarm) => {
    if (isDestroyed.value) return

    // 进入报警查看模式：仅在存在流式读取器时，先暂停再拍快照
    if (newIsAlarm) {
      if (currentStreamReader.value) {
        console.log('进入报警查看模式（暂停导入并拍摄快照）')
        currentStreamReader.value.pause()
        handleAlarmSnapshot()
      }
    }
    // 退出报警查看模式：如果之前在导入，恢复导入
    else if (!newIsAlarm && isLocalDataLoading.value && currentStreamReader.value) {
      console.log('退出报警查看模式，恢复数据导入')
      isSnapshot.value = false
      currentStreamReader.value.resume()
    }
  }
)

// 监听快照状态变化
watch(
  () => isSnapshot.value,
  () => {
    if (isDestroyed.value) return

    if (isChartReady.value) {
      updateChart()
    }
  }
)

const handleAlarmSnapshot = () => {
  if (isDestroyed.value || isSnapshot.value) {
    return
  }

  try {
    // 保险：进入报警快照前，如果在本地导入且存在读取器，先暂停
    if (isLocalDataLoading.value && currentStreamReader.value) {
      currentStreamReader.value.pause()
    }

    if (pauseTimeoutId.value) {
      clearTimeout(pauseTimeoutId.value)
      pauseTimeoutId.value = null
      console.log('取消了暂停计时器')
    }

    if (displayData.value) {
      snapshotData.value = JSON.parse(JSON.stringify(displayData.value))
      snapshotTime.value = new Date().toLocaleString()
      isSnapshot.value = true
    }
  } catch (error) {
    console.error('处理报警快照失败:', error)
  }
}

// 生命周期管理
onMounted(async () => {
  try {
    await nextTick()
    if (!isDestroyed.value) {
      await initChart()

      window.addEventListener('loadAlarmSnapshot', handleAlarmSnapshot)

      nextTick(() => {
        if (chart && hasData.value) {
          ensureCursorGraphics(false)
        }
      })

      // 点击图表快速定位游标（水平定位）
      if (chart) {
        chart.on('click', (params: any) => {
          if (!hasData.value || !chart) return
          const offsetX = params?.event?.offsetX
          if (typeof offsetX !== 'number') return
          const { minX, maxX } = getGridPx()
          const x = Math.max(minX, Math.min(maxX, offsetX))
          const coord = chart.convertFromPixel({ xAxisIndex: 0 }, [x, 0])
          if (coord && coord[0] != null) {
            const total = displayData.value!.showData.length
            cursorIndex.value = Math.round(Math.max(0, Math.min(total - 1, coord[0])))
            scheduleCursorReposition()
                    }
        })
      }
    }
  } catch (error) {
    console.error('组件挂载失败:', error)
  }
})

onBeforeUnmount(() => {
  isDestroyed.value = true
  if (repositionRafId !== null) {
    cancelAnimationFrame(repositionRafId)
    repositionRafId = null
  }
})

onUnmounted(() => {
  destroyChart()
  window.removeEventListener('loadAlarmSnapshot', handleAlarmSnapshot)
})

// 加载快照数据方法
const loadSnapshotData = (alarmData: AlarmFileData | Omit<AlarmData, 'id'>) => {
  if (isDestroyed.value) return

  try {
    if (alarmData && alarmData.snapshotData) {
      const currentSnapInfo = alarmData.snapshotData

      const currentDataInfo: ChannelDataInfo = {
        peakVoltage: currentSnapInfo.statistics.peakVoltage,
        averageVoltage: currentSnapInfo.statistics.averageVoltage,
        minimumVoltage: currentSnapInfo.statistics.minimumVoltage,
        status: currentSnapInfo.statistics.status,
        deviation: currentSnapInfo.statistics.deviation,
        range: currentSnapInfo.statistics.range,
        showData: currentSnapInfo.waveformData,
        yAxisRange: currentSnapInfo.yAxisRange,
        isWarn: true,
        isConnect: true,
        err_data_list: currentSnapInfo.err_data_list,
        err_pic_path_list: currentSnapInfo.err_pic_path_list,
        defectPoints: currentSnapInfo.defectPoints,
        defectCycles: currentSnapInfo.defectCycles
      }
      snapshotData.value = currentDataInfo
      snapshotTime.value = alarmData.timestamp.toLocaleString() || new Date().toLocaleString()
      isSnapshot.value = true

      // 更新图表显示
      if (!isDestroyed.value) {
        updateChart()
      }
    }
  } catch (error) {
    console.error('加载快照数据失败:', error)
  }
}

// 暴露方法给父组件
defineExpose({
  loadSnapshotData
})
</script>

<style scoped lang="less">
@import '@renderer/assets/mixins.less';
@import '@renderer/assets/variables.less';
.interactive-wave-chart {
  height: 100%;
  width: 100%;
  .card-style();
  display: flex;
  flex-direction: column;

  .chart-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid #e0e0e0;
    background: #f8f9fa;
    border-radius: 4px;
    border: 1px solid @border-color;
    .toolbar-left {
      display: flex;
      align-items: center;
      gap: 16px;

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 500;
        color: #333;
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

        // 实时模式 - 绿色
        &.live {
          background: #e8f5e8;
          color: #2e7d32;

          .dot {
            background: #4caf50;
          }
        }

        // 快照模式 - 橙色
        &.snapshot {
          background: #fff3e0;
          color: #f57c00;

          .dot {
            background: #ff9800;
            animation: none;
          }
        }

        // 报警数据查看模式 - 红色
        &.alarm-mode {
          background: #ffebee;
          color: #c62828;

          .dot {
            background: #f44336;
            animation: blink 1s infinite;
          }
        }

        // 本地数据加载模式 - 蓝色
        &.local-mode {
          background: #e3f2fd;
          color: #1565c0;

          .dot {
            background: #2196f3;
            animation: loading 1.5s infinite;
          }
        }

        // 离线/本地模式 - 灰色
        &.offline-mode {
          background: #fff3e0;
          color: #f57c00;

          .dot {
            background: #f57c00;
            animation: none;
          }
        }
      }
    }
    .progress {
      flex: 1;
      margin: 0 50px;
    }
    .toolbar-right {
      display: flex;
      gap: 8px;

      .control-btn {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        background: white;
        color: #666;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;

        .icon {
          font-size: 14px;
        }

        &:hover:not(:disabled) {
          border-color: #4285f4;
          color: #4285f4;
        }

        &:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &.active {
          background: #4285f4;
          color: white;
          border-color: #4285f4;
        }
      }
      .exit-btn {
        background: #ffc107;
        &:hover {
          background: #e0a800;
          color: #333333;
        }
      }
    }
  }
  .cursor-range-bar {
    padding: 8px 16px;
    background: #f5f5f5;
    border-bottom: 1px solid #e0e0e0;
    font-size: 12px;
    color: #666;

    .range-text {
      font-weight: 500;
      .drag-hint {
        color: #4285f4;
        font-weight: bold;
        animation: pulse 1s infinite;
      }
    }
  }

  .chart-content {
    flex: 1;
    min-height: 0;
    padding: 8px;
    // 图表容器样式
    .chart-container {
      position: relative;
      width: 100%;
      height: 100%;
      user-select: none; // 防止拖拽时选中文本

      // 拖拽状态下的样式
      &.dragging {
        cursor: grabbing !important;
      }

      // 悬停状态下的样式
      &:hover {
        .cursor-hint {
          opacity: 1;
        }
      }
    }

    // 游标提示
    .cursor-hint {
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      color: #666;
      opacity: 0;
      transition: opacity 0.3s ease;
      pointer-events: none;
      z-index: 10;
    }
  }
}

@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}

// 拖拽相关的动画
@keyframes dragPulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
