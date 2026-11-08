<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import type { PropType } from 'vue'
import type { ChannelDataInfo } from '@main/type'
import useParamSettingStore from '@renderer/store/paramentSetting'

// Props 定义
const props = defineProps({
  title: {
    type: String,
    default: '示波器'
  },
  color: {
    type: String,
    default: '#00ff00'
  },
  dataInfo: {
    type: Object as PropType<ChannelDataInfo>,
    required: true
  },
  sampleRate: {
    type: Number,
    default: 125000
  }
})

// // 游标相关的响应式数据 - 默认显示
// const cursorPosition = ref(0) // 游标位置
// const isDragging = ref(false) // 是否正在拖拽

// 发射事件，用于向父组件传递游标数据
// const emit = defineEmits<{
//   cursorChange: [position: number, value: number]
//   rangeChange: [range: { start: number, end: number, values: number[] }]
// }>()

// 响应式数据
const chartContainer = ref(null)
const isChartReady = ref(false)
const paramentSettingStore = useParamSettingStore()
const isRealTimeMode = computed(() => {
  return paramentSettingStore.programSettings.realTimeMode
})

let chart: echarts.ECharts | null = null
// 添加窗口大小变化监听
let resizeObserver: ResizeObserver | null = null

// 在 updateChart 函数中添加防抖逻辑
let updateTimer: ReturnType<typeof setTimeout> | null = null
// 防抖的resize函数
let resizeTimer: ReturnType<typeof setTimeout> | null = null

// 图表自适应函数
const resizeChart = () => {
  if (chart && !chart.isDisposed() && isChartReady.value) {
    try {
      chart.resize()
    } catch (error) {
      console.error('图表resize失败:', error)
    }
  }
}

const debouncedResize = () => {
  if (resizeTimer) {
    clearTimeout(resizeTimer)
  }
  resizeTimer = setTimeout(() => {
    resizeChart()
  }, 100)
}

// 计算属性：从 dataInfo 中获取显示数据
const chartData = computed(() => {
  if (props.dataInfo && Array.isArray(props.dataInfo.showData)) {
    return props.dataInfo.showData
  }
  return []
})

// 计算属性：从 dataInfo 中获取 Y 轴范围
const currentYAxisRange = computed(() => {
  if (props.dataInfo && props.dataInfo.yAxisRange) {
    return props.dataInfo.yAxisRange
  }
  return { min: -100, max: 100 }
})

// 计算属性：从 dataInfo 中获取各种数值
const frequency = computed(() => {
  if (props.dataInfo?.isConnect === false || props.dataInfo?.status === '未连接') {
    return 0
  }
  if (props.dataInfo?.frequency && props.dataInfo.frequency > 0) {
    return Math.round(props.dataInfo.frequency)
  }
  if (props.sampleRate && chartData.value.length > 0) {
    return Math.round(props.sampleRate / chartData.value.length)
  }
  return 50
})

const peakVoltage = computed(() => {
  return props.dataInfo?.peakVoltage || 0
})

const dataPoints = computed(() => {
  return chartData.value.length
})

const status = computed(() => {
  return props.dataInfo?.status || '正常'
})

const deviation = computed(() => {
  return props.dataInfo?.deviation || '0'
})

const range = computed(() => {
  return props.dataInfo?.range || '0'
})

// // 游标相关计算属性
// const currentCursorValue = computed(() => {
//   const index = Math.round(cursorPosition.value)
//   if (index >= 0 && index < chartData.value.length) {
//     return chartData.value[index]
//   }
//   return 0
// })

// // 范围选择从游标位置到数据末尾（默认全选）
// const selectedRangeValues = computed(() => {
//   if (chartData.value.length === 0) {
//     return []
//   }

//   const startIndex = Math.round(cursorPosition.value)
//   const endIndex = chartData.value.length - 1

//   if (startIndex >= 0 && startIndex <= endIndex) {
//     return chartData.value.slice(startIndex, endIndex + 1)
//   }
//   return []
// })

// // 计算范围信息
// const rangeInfo = computed(() => {
//   if (selectedRangeValues.value.length === 0) {
//     return { start: 0, end: 0, count: 0 }
//   }

//   const start = Math.round(cursorPosition.value)
//   const end = chartData.value.length - 1
//   const count = selectedRangeValues.value.length

//   return { start, end, count }
// })

// const setCursorPosition = (position: number) => {
//   const maxPosition = chartData.value.length - 1
//   cursorPosition.value = Math.max(0, Math.min(position, maxPosition))

//   // 发射游标变化事件
//   emit('cursorChange', cursorPosition.value, currentCursorValue.value)

//   // 发射范围变化事件
//   emit('rangeChange', {
//     start: rangeInfo.value.start,
//     end: rangeInfo.value.end,
//     values: selectedRangeValues.value
//   })

//   updateChart()
// }

const updateChart = () => {
  if (!chart || chart.isDisposed() || !isChartReady.value) {
    return
  }
  if (updateTimer) {
    clearTimeout(updateTimer)
  }

  updateTimer = setTimeout(() => {
    requestAnimationFrame(() => {
      try {
        const dataLength = chartData.value.length || 1000
        const option = {
          xAxis: {
            min: 0,
            max: dataLength > 0 ? dataLength - 1 : 1000
          },
          yAxis: {
            min: currentYAxisRange.value.min,
            max: currentYAxisRange.value.max
          },
          series: [
            {
              data: chartData.value.map((item, index) => [index, item]),
              animation: false
            }
          ]
        }

        //  // 添加单箭头向下的游标线
        // option.series.push({
        //   type: 'line',
        //   markLine: {
        //     silent: false,
        //     symbol: ['triangle', 'triangle'], // 只在下方显示三角形箭头
        //     symbolSize: [0, 20], // 增大箭头大小，确保可见
        //     symbolRotate: [0, 180], // 箭头向下
        //     symbolOffset: [0, 10], // 向下偏移，确保箭头在图表内
        //     data: [{
        //       xAxis: cursorPosition.value,
        //       lineStyle: {
        //         color: '#1890ff', // 蓝色线条
        //         width: 3, // 增加线条宽度
        //         type: 'solid'
        //       },
        //       symbol: ['triangle', 'triangle'], // 重复设置确保生效
        //       symbolSize: [0, 20],
        //       symbolRotate: [0, 180],
        //       label: {
        //         show: false
        //       }
        //     }]
        //   }
        // })

        // // 添加范围选择区域（从游标到末尾）
        // if (selectedRangeValues.value.length > 0) {
        //   option.series.push({
        //     type: 'line',
        //     markArea: {
        //       silent: false,
        //       data: [[{
        //         xAxis: cursorPosition.value
        //       }, {
        //         xAxis: chartData.value.length - 1
        //       }]],
        //       itemStyle: {
        //         color: 'rgba(24, 144, 255, 0.1)', // 淡蓝色背景，更柔和
        //         borderColor: '#1890ff', // 蓝色边框
        //         borderWidth: 1,
        //         borderType: 'solid'
        //       },
        //       label: {
        //         show: true,
        //         position: 'top',
        //         formatter: `选择范围: ${selectedRangeValues.value.length} 点`,
        //         color: '#1890ff',
        //         fontSize: 11,
        //         fontWeight: '500',
        //         backgroundColor: 'rgba(255, 255, 255, 0.95)',
        //         padding: [3, 8],
        //         borderRadius: 4,
        //         borderColor: '#1890ff',
        //         borderWidth: 1
        //       }
        //     }
        //   })
        // }

        chart?.setOption(option, false, true)
      } catch (error) {
        console.log('更新图表失败', error)
      }
    })
  }, 50)
}

// 获取图表配置
const getChartOption = () => {
  const dataLength = chartData.value.length || 1000

  return {
    backgroundColor: 'transparent',
    animation: false,
    grid: {
      left: '5%',
      right: '5%',
      top: '10%',
      bottom: '10%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      min: 0,
      max: dataLength > 0 ? dataLength - 1 : 1000,
      axisLine: {
        show: true,
        lineStyle: {
          color: '#ddd'
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: '#ddd'
        }
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
      min: currentYAxisRange.value.min,
      max: currentYAxisRange.value.max,
      axisLine: {
        show: true,
        lineStyle: {
          color: '#ddd'
        }
      },
      axisTick: {
        show: true,
        lineStyle: {
          color: '#ddd'
        }
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
    series: [
      {
        type: 'line',
        data: chartData.value.map((value, index) => [index, value]),
        lineStyle: {
          color: '#4285f4',
          width: 2
        },
        symbol: 'none', // 不显示数据点符号，避免干扰游标
        animation: false,
        large: true,
        largeThreshold: 1000,
        progressive: 500,
        progressiveThreshold: 1000
      }
    ]
  }
}

// 初始化图表
const initChart = async () => {
  if (!chartContainer.value) return

  try {
    chart = echarts.init(chartContainer.value, null, {
      renderer: 'canvas',
      useDirtyRect: true
    })

    // 设置图表配置
    chart.setOption(getChartOption())

    // // 初始化游标位置（设置为数据中间位置）
    // cursorPosition.value = 0;
    // // 添加鼠标事件监听 - 修复拖拽问题
    // chart.on('click', (params) => {
    //   // 获取点击位置的 X 坐标对应的数据索引
    //   const pixelPoint = [params.event.offsetX, params.event.offsetY]
    //   const dataPoint = chart.convertFromPixel('grid', pixelPoint)
    //   if (dataPoint && dataPoint[0] !== undefined) {
    //     const clickedIndex = Math.round(dataPoint[0])
    //     setCursorPosition(clickedIndex)
    //   }
    // })

    // // 修复鼠标移动事件 - 使用全局鼠标移动
    // chart.getZr().on('mousemove', (params) => {
    //   if (isDragging.value) {
    //     // 获取鼠标位置对应的数据坐标
    //     const pixelPoint = [params.offsetX, params.offsetY]
    //     const dataPoint = chart.convertFromPixel('grid', pixelPoint)
    //     if (dataPoint && dataPoint[0] !== undefined) {
    //       const mouseIndex = Math.round(dataPoint[0])
    //       // 确保索引在有效范围内
    //       if (mouseIndex >= 0 && mouseIndex < chartData.value.length) {
    //         setCursorPosition(mouseIndex)
    //       }
    //     }
    //   }
    // })

    // // 添加鼠标按下事件
    // chart.getZr().on('mousedown', (params) => {
    //   isDragging.value = true
    //   // 立即设置游标位置
    //   const pixelPoint = [params.offsetX, params.offsetY]
    //   const dataPoint = chart.convertFromPixel('grid', pixelPoint)
    //   if (dataPoint && dataPoint[0] !== undefined) {
    //     const mouseIndex = Math.round(dataPoint[0])
    //     if (mouseIndex >= 0 && mouseIndex < chartData.value.length) {
    //       setCursorPosition(mouseIndex)
    //     }
    //   }
    // })

    // // 添加鼠标松开事件
    // chart.getZr().on('mouseup', () => {
    //   isDragging.value = false
    // })

    // // 添加鼠标离开事件
    // chart.getZr().on('globalout', () => {
    //   isDragging.value = false
    // })

    isChartReady.value = true

    // 初始更新图表以显示游标
    updateChart()

    // 设置 ResizeObserver
    if (chartContainer.value) {
      resizeObserver = new ResizeObserver(debouncedResize)
      resizeObserver.observe(chartContainer.value)
    }

    // 监听窗口大小变化
    window.addEventListener('resize', debouncedResize)
  } catch (error) {
    console.error('初始化图表失败:', error)
  }
}

// 销毁图表
const destroyChart = () => {
  if (updateTimer) {
    clearTimeout(updateTimer)
    updateTimer = null
  }

  if (resizeTimer) {
    clearTimeout(resizeTimer)
    resizeTimer = null
  }

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }

  window.removeEventListener('resize', debouncedResize)

  if (chart && !chart.isDisposed()) {
    chart.dispose()
    chart = null
  }

  isChartReady.value = false
}

// 监听数据变化
watch(
  [chartData, currentYAxisRange],
  () => {
    updateChart()
  },
  { deep: true }
)

// 组件挂载
onMounted(async () => {
  await nextTick()
  await initChart()
})

onUnmounted(() => {
  destroyChart()
})
</script>

<template>
  <div class="oscilloscope-container">
    <!-- 标题栏 -->
    <div class="chart-header">
      <div class="split">
        <h3>{{ title }}</h3>
        <div class="status-indicator" :class="{ live: isRealTimeMode, snapshot: !isRealTimeMode }">
          <span class="dot"></span>
          {{ isRealTimeMode ? '实时模式' : '本地模式' }}
        </div>
      </div>

      <div class="pointer">
        <span class="red"></span>
        <span class="yellow"></span>
        <span class="green"></span>
      </div>
    </div>

    <!-- 游标信息显示区域
    <div class="cursor-info-panel">
      <div class="info-row">
        <span class="info-label">游标位置:</span>
        <span class="info-value">{{ cursorPosition.toFixed(0) }}</span>
        <span class="info-label">当前值:</span>
        <span class="info-value">{{ currentCursorValue.toFixed(2) }}V</span>
        <span class="info-label">选择范围:</span>
        <span class="info-value">{{ rangeInfo.start }} - {{ rangeInfo.end }}</span>
        <span class="info-label">数据点数:</span>
        <span class="info-value">{{ rangeInfo.count }}</span>
      </div>

    </div> -->

    <!-- 图表区域 -->
    <div ref="chartContainer" class="chart-content"></div>

    <!-- 参数信息区域 -->
    <div class="chart-footer">
      <div class="info-grid">
        <div class="info-item">
          <span class="label">峰值电压</span>
          <span class="value">{{ Number(peakVoltage).toFixed(2) }}V</span>
        </div>
        <div class="info-item">
          <span class="label">频率</span>
          <span class="value">{{ frequency }}Hz</span>
        </div>
        <div class="info-item">
          <span class="label">数据数量</span>
          <span class="value">{{ dataPoints }}</span>
        </div>
        <div class="info-item">
          <span class="label">状态</span>
          <span
            class="value"
            :class="{
              'status-normal': !props.dataInfo.isWarn && props.dataInfo.isConnect,
              'status-warning': props.dataInfo.isWarn && props.dataInfo.isConnect,
              'status-disconnect': !props.dataInfo.isConnect
            }"
            >{{ status }}</span
          >
        </div>
        <div class="info-item">
          <span class="label">偏差值</span>
          <span
            class="value"
            :class="{
              'status-primary': !props.dataInfo.isWarn && props.dataInfo.isConnect,
              'status-warning': props.dataInfo.isWarn && props.dataInfo.isConnect,
              'status-disconnect': !props.dataInfo.isConnect
            }"
            >{{ deviation }}</span
          >
        </div>
        <div class="info-item">
          <span class="label">区间值</span>
          <span
            class="value"
            :class="{
              'status-primary': !props.dataInfo.isWarn && props.dataInfo.isConnect,
              'status-warning': props.dataInfo.isWarn && props.dataInfo.isConnect,
              'status-disconnect': !props.dataInfo.isConnect
            }"
            >{{ range }}</span
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
@import '@renderer/assets/mixins.less';

.oscilloscope-container {
  height: 100%;
  width: 100%;
  &:hover {
    cursor: pointer;
  }
  .card-style-hover();

  .chart-header {
    margin-bottom: 12px;
    display: flex;
    justify-content: space-between;
    .split {
      display: flex;
      gap: 10px;

      h3 {
        color: #333;
        margin: 0;
        font-size: 16px;
        font-weight: 500;
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

        &.snapshot {
          background: #fff3e0;
          color: #f57c00;

          .dot {
            background: #ff9800;
            animation: pulse 1s infinite;
          }
        }
      }
    }

    .pointer {
      display: flex;
      gap: 8px;
      span {
        display: inline-block;
        width: 10px;
        height: 10px;
        background: red;
        border-radius: 50%;
      }
      .red {
        background: @danger-color;
      }
      .yellow {
        background: @warning-color;
      }
      .green {
        background: @success-color;
      }
    }
  }

  // 游标信息显示区域样式
  .cursor-info-panel {
    margin-bottom: 12px;
    padding: 12px;
    background: #f8f9fa;
    border: 1px solid #e0e0e0;
    border-radius: 4px;

    .info-row {
      display: flex;
      gap: 16px;
      font-size: 12px;

      .info-label {
        color: #666;
        font-weight: 500;
      }

      .info-value {
        color: #333;
        font-weight: 600;
      }
    }
  }

  .chart-content {
    flex: 1;
    min-height: 0;
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    background: #fafafa;
    margin-bottom: 12px;
    cursor: crosshair;
  }

  .chart-footer {
    background: @bg-color-light-gray;
    border: 1px solid @border-color;
    border-radius: 4px;
    padding: 12px;
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px 24px;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .label {
        color: #666;
        font-size: 13px;
        font-weight: 400;
      }

      .value {
        color: #333;
        font-size: 13px;
        font-weight: 500;

        &.status-normal {
          color: @success-color;
        }
        &.status-warning {
          color: @warning-color;
        }
        &.status-disconnect {
          color: @info-color;
        }
        &:status-primary {
          color: var(--primary-color);
        }
        &:status-green {
          color: var(--font-color-apple-green);
        }
      }
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
</style>
