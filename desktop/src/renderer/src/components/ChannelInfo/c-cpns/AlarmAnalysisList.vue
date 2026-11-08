<template>
  <div class="alarm-analysis-list">
    <!-- 头部 -->
    <div class="list-header">
      <div class="title">报警信息分析</div>
    </div>

    <!-- 报警列表 -->
    <div class="alarm-list-container">
      <div v-if="alarmList.length === 0" class="empty-state">
        <div class="empty-icon"><AlarmIcon /></div>
        <p>暂无报警信息</p>
      </div>

      <div v-else class="alarm-list">
        <div
          v-for="alarm in alarmList"
          :key="alarm?.id"
          class="alarm-item"
          :class="{
            selected: selectedAlarmId === alarm.id,
            [`severity-${alarm.severity}`]: true
          }"
          @dblclick="selectAlarm(alarm)"
        >
          <!-- 报警快照图片 -->
          <div class="alarm-snapshot">
            <div class="snapshot-image-container">
              <!-- <div v-if="imageLoadingStates[alarm.id]" class="image-loading">
                <div class="loading-spinner"></div>
                <span>加载中...</span>
              </div>
              <div v-else-if="imageErrorStates[alarm.id]" class="image-error">
                <span class="error-icon">🖼️</span>
                <span>图片加载失败</span>
              </div>
              <img 
                v-else-if="imageUrls[alarm.id]"
                :src="imageUrls[alarm.id]" 
                :alt="`报警${alarm.id}快照图片`"
                class="snapshot-image"
                @error="handleImageError(alarm.id)"
                @load="handleImageLoad(alarm.id)"
              />
              <div v-else class="no-image">
                <span class="no-image-icon">📷</span>
                <span>暂无图片</span>
              </div> -->
              <canvas
                :ref="(el) => setCanvasRef(alarm.id, el)"
                class="waveform-canvas"
                :width="750"
                :height="400"
                @click="selectAlarm(alarm)"
              ></canvas>
            </div>

            <div class="snapshot-overlay">
              <div class="alarm-info">
                <div class="alarm-title">
                  <span class="severity-indicator" :class="`severity-${alarm.severity}`"></span>
                  <span class="alarm-type">{{ alarm.id }}:</span>
                </div>
                <div class="alarm-time">{{ formatTime(alarm.timestamp) }}</div>
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="alarm-actions">
            <button class="action-btn small" @click.stop="deleteAlarm(alarm.id)">
              <span class="icon">❌</span>
              删除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import AlarmIcon from '@renderer/assets/iconComponents/AlarmIcon.vue'
import type { AlarmFileData } from '@renderer/types/alarmData'
import type { ComponentPublicInstance } from 'vue'
import useAlarmDataStore from '@renderer/store/alarmDataStore'
import { ElMessage, ElMessageBox } from 'element-plus'

// Props
const props = defineProps({
  channelId: {
    type: Number,
    required: true
  },
  alarmSelectedId: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits<{
  alarmSelected: [alarmData: AlarmFileData]
}>()

// 响应式数据
const { getAlarmList, loadAlarmsData } = useAlarmDataStore()

const alarmList = computed(() => {
  return getAlarmList(props.channelId)
})

const selectedAlarmId = ref<string | null>(null)

// 图片相关状态
const imageUrls = ref<Record<string, string>>({})
const imageLoadingStates = ref<Record<string, boolean>>({})
const imageErrorStates = ref<Record<string, boolean>>({})

// Canvas引用管理
const canvasRefs = ref<Record<string, HTMLCanvasElement>>({})

const setCanvasRef = (alarmId: string, el: Element | ComponentPublicInstance | null) => {
  if (el && el instanceof HTMLCanvasElement) {
    canvasRefs.value[alarmId] = el
    // 当Canvas元素准备好后，绘制波形
    nextTick(() => {
      const alarm = alarmList.value.find((a) => a.id === alarmId)
      if (alarm) {
        drawWaveform(alarmId, alarm)
      }
    })
  }
}

// 绘制波形图
// 绘制波形图
const drawWaveform = (alarmId: string, alarm: AlarmFileData) => {
  const canvas = canvasRefs.value[alarmId]
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  const originalWaveformData = alarm.snapshotData?.waveformData || []
  const defectPoints = alarm.snapshotData?.defectPoints || []

  // 限制数据点数量为300个
  let waveformData = originalWaveformData
  if (originalWaveformData.length > 300) {
    const step = Math.floor(originalWaveformData.length / 300)
    waveformData = originalWaveformData.filter((_, index) => index % step === 0).slice(0, 300)
  }

  // 清空画布
  ctx.clearRect(0, 0, width, height)

  // 设置高质量渲染
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // 创建高端渐变背景
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height)
  bgGradient.addColorStop(0, '#ffffff')
  bgGradient.addColorStop(0.5, '#fafbfc')
  bgGradient.addColorStop(1, '#f5f7fa')
  ctx.fillStyle = bgGradient
  ctx.fillRect(0, 0, width, height)

  // 添加微妙边框
  ctx.strokeStyle = '#e1e5e9'
  ctx.lineWidth = 0.5
  ctx.strokeRect(0, 0, width, height)

  if (waveformData.length === 0) {
    // 优雅的无数据提示
    ctx.fillStyle = '#8b9dc3'
    ctx.font =
      '14px "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('No Data Available', width / 2, height / 2)
    return
  }

  // 计算绘制参数
  const padding = 60
  const chartWidth = width - 2 * padding
  const chartHeight = height - 2 * padding

  // 计算数据范围
  const minValue = Math.min(...waveformData)
  const maxValue = Math.max(...waveformData)
  const valueRange = maxValue - minValue || 1

  // 绘制极简网格线
  ctx.strokeStyle = '#f0f2f5'
  ctx.lineWidth = 0.5

  // 水平网格线（减少数量）
  for (let i = 1; i < 4; i++) {
    const y = padding + (chartHeight / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding, y)
    ctx.lineTo(width - padding, y)
    ctx.stroke()
  }

  // 垂直网格线（减少数量）
  for (let i = 1; i < 5; i++) {
    const x = padding + (chartWidth / 5) * i
    ctx.beginPath()
    ctx.moveTo(x, padding)
    ctx.lineTo(x, height - padding)
    ctx.stroke()
  }

  // 绘制现代化坐标轴
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1.5

  // Y轴
  ctx.beginPath()
  ctx.moveTo(padding, padding)
  ctx.lineTo(padding, height - padding)
  ctx.stroke()

  // X轴
  ctx.beginPath()
  ctx.moveTo(padding, height - padding)
  ctx.lineTo(width - padding, height - padding)
  ctx.stroke()

  // 绘制精致的Y轴标签
  ctx.fillStyle = '#6b7280'
  ctx.font = '11px "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = 'right'

  for (let i = 0; i <= 4; i++) {
    const value = minValue + (valueRange / 4) * (4 - i)
    const y = padding + (chartHeight / 4) * i
    ctx.fillText(value.toFixed(1), padding - 12, y + 4)
  }

  // 绘制精致的X轴标签
  ctx.textAlign = 'center'
  for (let i = 0; i <= 5; i++) {
    const x = padding + (chartWidth / 5) * i
    const label = Math.round((originalWaveformData.length / 5) * i)
    ctx.fillText(label.toString(), x, height - padding + 20)
  }

  // 创建缺陷点索引集合
  const defectIndexSet = new Set()

  if (Array.isArray(defectPoints) && defectPoints.length > 0) {
    // console.log('Processing defect points:', defectPoints)
    defectPoints.forEach((point, _) => {
      let actualIndex: number | null = null

      // 处理 Point 对象格式 {x: number, y: number}
      if (point && typeof point === 'object' && 'x' in point) {
        actualIndex = point.x
      }

      if (actualIndex !== null && !isNaN(actualIndex) && actualIndex >= 0) {
        if (originalWaveformData.length > 300) {
          const step = Math.floor(originalWaveformData.length / 300)
          const mappedIndex = Math.floor(actualIndex / step)

          if (mappedIndex < 300 && mappedIndex >= 0) {
            defectIndexSet.add(mappedIndex)
          }
        } else {
          if (actualIndex < waveformData.length) {
            defectIndexSet.add(actualIndex)
          }
        }
      } else {
        console.warn(`Invalid defect point index:`, actualIndex, 'from point:', point)
      }
    })
  }

  // 绘制高端波形数据
  if (waveformData.length > 1) {
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 创建高端渐变色
    const waveGradient = ctx.createLinearGradient(0, padding, 0, height - padding)
    waveGradient.addColorStop(0, '#667eea')
    waveGradient.addColorStop(1, '#764ba2')

    // 绘制正常波形段
    ctx.strokeStyle = waveGradient
    ctx.shadowColor = 'rgba(102, 126, 234, 0.25)'
    ctx.shadowBlur = 6
    ctx.shadowOffsetY = 3

    let currentPath = new Path2D()
    let isFirstPoint = true

    for (let i = 0; i < waveformData.length; i++) {
      const x = padding + (i / (waveformData.length - 1)) * chartWidth
      const y = height - padding - ((waveformData[i] - minValue) / valueRange) * chartHeight

      if (!defectIndexSet.has(i)) {
        // 正常点
        if (isFirstPoint) {
          currentPath.moveTo(x, y)
          isFirstPoint = false
        } else {
          currentPath.lineTo(x, y)
        }
      } else {
        // 遇到缺陷点，先绘制当前正常路径
        if (!isFirstPoint) {
          ctx.stroke(currentPath)
        }

        // 绘制缺陷点段（高端红色渐变）
        const errorGradient = ctx.createLinearGradient(0, padding, 0, height - padding)
        errorGradient.addColorStop(0, '#ff6b6b')
        errorGradient.addColorStop(1, '#ee5a52')

        ctx.strokeStyle = errorGradient
        ctx.shadowColor = 'rgba(255, 107, 107, 0.4)'
        ctx.shadowBlur = 8

        const defectPath = new Path2D()

        // 连接到缺陷点
        if (i > 0) {
          const prevX = padding + ((i - 1) / (waveformData.length - 1)) * chartWidth
          const prevY =
            height - padding - ((waveformData[i - 1] - minValue) / valueRange) * chartHeight
          defectPath.moveTo(prevX, prevY)
        } else {
          defectPath.moveTo(x, y)
        }

        defectPath.lineTo(x, y)

        // 连接到下一个点
        if (i < waveformData.length - 1) {
          const nextX = padding + ((i + 1) / (waveformData.length - 1)) * chartWidth
          const nextY =
            height - padding - ((waveformData[i + 1] - minValue) / valueRange) * chartHeight
          defectPath.lineTo(nextX, nextY)
        }

        ctx.stroke(defectPath)

        // 重置为正常颜色，开始新路径
        ctx.strokeStyle = waveGradient
        ctx.shadowColor = 'rgba(102, 126, 234, 0.25)'
        ctx.shadowBlur = 6
        currentPath = new Path2D()
        isFirstPoint = true
      }
    }

    // 绘制最后的正常路径
    if (!isFirstPoint) {
      ctx.stroke(currentPath)
    }

    // 重置阴影
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetY = 0

    // 绘制优雅的填充区域
    ctx.globalAlpha = 0.06
    const fillGradient = ctx.createLinearGradient(0, padding, 0, height - padding)
    fillGradient.addColorStop(0, '#667eea')
    fillGradient.addColorStop(1, 'rgba(102, 126, 234, 0)')
    ctx.fillStyle = fillGradient

    ctx.beginPath()
    ctx.moveTo(padding, height - padding)
    waveformData.forEach((value, index) => {
      const x = padding + (index / (waveformData.length - 1)) * chartWidth
      const y = height - padding - ((value - minValue) / valueRange) * chartHeight
      ctx.lineTo(x, y)
    })
    ctx.lineTo(width - padding, height - padding)
    ctx.closePath()
    ctx.fill()

    ctx.globalAlpha = 1
  }

  // 绘制缺陷点 - 改进版本
  if (defectIndexSet.size > 0) {
    defectIndexSet.forEach((index: unknown) => {
      const numIndex = Number(index)
      if (
        typeof numIndex === 'number' &&
        !isNaN(numIndex) &&
        numIndex < waveformData.length &&
        numIndex >= 0
      ) {
        const x = padding + (numIndex / (waveformData.length - 1)) * chartWidth
        const y =
          height - padding - ((waveformData[numIndex] - minValue) / valueRange) * chartHeight

        // 绘制更明显的缺陷点标记
        ctx.save()

        // 外圈 - 红色
        ctx.fillStyle = '#ff4757'
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, 2 * Math.PI)
        ctx.fill()

        // 内圈 - 白色
        ctx.fillStyle = '#ffffff'
        ctx.beginPath()
        ctx.arc(x, y, 3, 0, 2 * Math.PI)
        ctx.fill()

        // 边框
        ctx.strokeStyle = '#ff4757'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(x, y, 6, 0, 2 * Math.PI)
        ctx.stroke()

        ctx.restore()
      }
    })
  } else {
    console.log('No defect points to draw')
  }

  // 添加高端标题区域
  if (defectIndexSet.size > 0) {
    // 绘制状态指示器
    const statusX = width - 80
    const statusY = 20

    // 缺陷状态
    ctx.fillStyle = '#ff6b6b'
    ctx.beginPath()
    ctx.arc(statusX, statusY, 4, 0, 2 * Math.PI)
    ctx.fill()

    ctx.fillStyle = '#374151'
    ctx.font =
      '11px "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(`${defectIndexSet.size} Defects`, statusX + 12, statusY + 4)
  }
}

// 监听报警列表变化，重新绘制Canvas
watch(
  alarmList,
  (newAlarmList) => {
    nextTick(() => {
      newAlarmList.forEach((alarm) => {
        if (canvasRefs.value[alarm.id]) {
          drawWaveform(alarm.id, alarm)
        }
      })
    })
  },
  { immediate: true }
)

// // 加载报警图片
// const loadAlarmImage = async (alarm: AlarmFileData) => {
//   const alarmId = alarm.id

//   // 检查是否有图片路径
//   if (!alarm.snapshotData?.err_pic_path_list?.length) {
//     return
//   }

//   const imagePath = alarm.snapshotData.err_pic_path_list[0] // 获取第一张图片
//   if (!imagePath) {
//     return
//   }

//   try {
//     imageLoadingStates.value[alarmId] = true
//     imageErrorStates.value[alarmId] = false

//     // 通过IPC获取图片的data URL
//     const imageUrl = await window.electronAPI.invoke('read-image', imagePath)
//     imageUrls.value[alarmId] = imageUrl

//   } catch (error) {
//     console.error(`加载报警${alarmId}图片失败:`, error)
//     imageErrorStates.value[alarmId] = true
//   } finally {
//     imageLoadingStates.value[alarmId] = false
//   }
// }

// // 处理图片加载成功
// const handleImageLoad = (alarmId: string) => {
//   console.log(`报警${alarmId}图片加载成功`)
//   imageLoadingStates.value[alarmId] = false
//   imageErrorStates.value[alarmId] = false
// }

// // 处理图片加载失败
// const handleImageError = (alarmId: string) => {
//   console.error(`报警${alarmId}图片加载失败`)
//   imageLoadingStates.value[alarmId] = false
//   imageErrorStates.value[alarmId] = true
// }

// // 监听报警列表变化，加载图片
// watch(alarmList, (newAlarmList) => {
//   newAlarmList.forEach(alarm => {
//     if (!imageUrls.value[alarm.id] && !imageLoadingStates.value[alarm.id]) {
//       loadAlarmImage(alarm)
//     }
//   })
// }, { immediate: true })

// 选择报警
const selectAlarm = (alarm: AlarmFileData) => {
  selectedAlarmId.value = alarm.id
  console.log('Selected alarm:', alarm)
  emit('alarmSelected', alarm)
}

// 删除报警
const deleteAlarm = async (alarmId: string) => {
  try {
    await ElMessageBox.confirm('确定要删除这条报警记录吗？', '删除确认', {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    })

    const alarm = alarmList.value.find((a) => a.id === alarmId)
    if (alarm) {
      // 删除文件
      await window.electronAPI.invoke('fs:delete-alarm-file', alarm.filePath)

      // 清理图片状态
      delete imageUrls.value[alarmId]
      delete imageLoadingStates.value[alarmId]
      delete imageErrorStates.value[alarmId]

      ElMessage({
        message: '报警记录已删除',
        type: 'success'
      })

      // 重新加载数据
      await loadAlarmsData(props.channelId, 1, 5)
    }
  } catch {
    // 用户取消操作
  }
}

// 清空所有报警
// const clearAllAlarms = async () => {
//   if (alarmList.value.length === 0) return

//   try {
//     await ElMessageBox.confirm(
//       `确定要清空通道${props.channelId}的所有报警记录吗？此操作不可恢复。`,
//       '清空确认',
//       {
//         confirmButtonText: '确定清空',
//         cancelButtonText: '取消',
//         type: 'warning'
//       }
//     )

//     // 清空当前通道的报警数据（仅清空内存中的数据）
//     clearAlarms(props.channelId)

//     // 清理所有图片状态
//     imageUrls.value = {}
//     imageLoadingStates.value = {}
//     imageErrorStates.value = {}

//     ElMessage({
//       message: '报警记录已清空',
//       type: 'success'
//     })
//   } catch {
//     // 用户取消操作
//   }
// }

// // 导出报警数据
// const exportAlarms = async () => {
//   if (alarmList.value.length === 0) return

//   try {
//     // 准备导出数据
//     const exportData = {
//       channelId: props.channelId,
//       exportTime: new Date().toISOString(),
//       totalCount: alarmList.value.length,
//       alarms: alarmList.value.map(alarm => ({
//         id: alarm.id,
//         timestamp: alarm.timestamp,
//         severity: alarm.severity,
//         triggerValue: alarm.triggerValue,
//         threshold: alarm.threshold,
//         unit: alarm.unit,
//         duration: alarm.duration,
//         analysisConclusion: alarm.analysisConclusion,
//         statistics: alarm.snapshotData.statistics,
//         yAxisRange: alarm.snapshotData.yAxisRange,
//         err_pic_path_list: alarm.snapshotData.err_pic_path_list,
//         fileName: alarm.fileName,
//         filePath: alarm.filePath,
//         fileModified: alarm.fileModified
//       }))
//     }

//     // 生成文件名
//     const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
//     const fileName = `channel_${props.channelId}_alarms_${timestamp}.json`

//     // 创建下载链接
//     const blob = new Blob([JSON.stringify(exportData, null, 2)], {
//       type: 'application/json'
//     })
//     const url = URL.createObjectURL(blob)
//     const a = document.createElement('a')
//     a.href = url
//     a.download = fileName
//     a.click()
//     URL.revokeObjectURL(url)

//     ElMessage({
//       message: `报警数据已导出: ${fileName}`,
//       type: 'success'
//     })
//   } catch (error) {
//     console.error('导出报警数据失败:', error)
//     ElMessage({
//       message: '导出失败，请重试',
//       type: 'error'
//     })
//   }
// }

// 格式化时间
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString()
}

// 添加 onMounted 钩子确保数据加载
onMounted(async () => {
  try {
    await loadAlarmsData(props.channelId, 1, 5)
  } catch (error) {
    console.error('加载报警数据失败:', error)
  }
})
</script>

<style scoped lang="less">
@import '@renderer/assets/mixins.less';

.alarm-analysis-list {
  height: 100%;
  .card-style();

  .list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .title {
      font-weight: 500;
    }
    .header-actions {
      display: flex;
      gap: 8px;
    }
  }

  .alarm-list-container {
    flex: 1;
    overflow-y: auto;

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: #999;

      .empty-icon {
        font-size: 48px;
        margin-bottom: 12px;
      }
    }

    .alarm-list {
      padding: 8px;
    }
  }

  .alarm-item {
    margin-bottom: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    overflow: hidden;

    &:hover {
      border-color: #ff9500;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.15);
    }

    &.selected {
      border-color: #ff3b30;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.2);
    }
  }

  .alarm-snapshot {
    position: relative;

    // .snapshot-image-container {
    //   width: 100%;
    //   height: 160px;
    //   display: flex;
    //   align-items: center;
    //   justify-content: center;
    //   background: #f8f9fa;
    //   border-radius: 8px 8px 0 0;
    //   overflow: hidden;

    //   .snapshot-image {
    //     width: 100%;
    //     height: 100%;
    //     object-fit: cover;
    //     display: block;
    //   }

    //   .image-loading {
    //     display: flex;
    //     flex-direction: column;
    //     align-items: center;
    //     gap: 8px;
    //     color: #666;
    //     font-size: 12px;

    //     .loading-spinner {
    //       width: 24px;
    //       height: 24px;
    //       border: 2px solid #e0e0e0;
    //       border-top: 2px solid #4285f4;
    //       border-radius: 50%;
    //       animation: spin 1s linear infinite;
    //     }

    //     @keyframes spin {
    //       0% { transform: rotate(0deg); }
    //       100% { transform: rotate(360deg); }
    //     }
    //   }

    //   .image-error {
    //     display: flex;
    //     flex-direction: column;
    //     align-items: center;
    //     gap: 8px;
    //     color: #999;
    //     font-size: 12px;

    //     .error-icon {
    //       font-size: 24px;
    //     }
    //   }

    //   .no-image {
    //     display: flex;
    //     flex-direction: column;
    //     align-items: center;
    //     gap: 8px;
    //     color: #999;
    //     font-size: 12px;

    //     .no-image-icon {
    //       font-size: 24px;
    //     }
    //   }
    // }

    .snapshot-image-container {
      position: relative;
      width: 100%;
      height: 240px;
      border-radius: 4px;
      overflow: hidden;
      background: #ffffff;

      .waveform-canvas {
        width: 100%;
        height: 240px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        background: #ffffff;
        border: none;
        box-shadow:
          0 1px 3px rgba(0, 0, 0, 0.1),
          0 1px 2px rgba(0, 0, 0, 0.06);

        &:hover {
          box-shadow:
            0 4px 6px rgba(0, 0, 0, 0.07),
            0 10px 15px rgba(0, 0, 0, 0.1);
          transform: translateY(-1px);
        }
      }
    }

    .snapshot-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.7) 0%,
        transparent 30%,
        transparent 70%,
        rgba(0, 0, 0, 0.7) 100%
      );
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 4px 12px;
      color: white;

      .alarm-info {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;

        .alarm-title {
          display: flex;
          align-items: center;
          gap: 6px;

          .severity-indicator {
            width: 10px;
            height: 10px;
            border-radius: 50%;

            &.severity-critical {
              background: #d32f2f;
            }

            &.severity-warning {
              background: #f57c00;
            }
          }

          .alarm-type {
            font-weight: 500;
            font-size: 12px;
          }
        }

        .alarm-time {
          font-size: 12px;
          opacity: 0.9;
        }
      }

      .alarm-values {
        display: flex;
        gap: 16px;

        .value-item {
          .label {
            font-size: 12px;
            opacity: 0.8;
            margin-right: 4px;
          }

          .value {
            font-size: 11px;
            font-weight: 500;
          }
        }
      }
    }
  }

  .alarm-actions {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    padding: 8px 12px;
    background: #f8f9fa;
    border-top: 1px solid #e0e0e0;
  }

  .action-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    color: #666;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s;

    .icon {
      font-size: 12px;
    }

    &:hover:not(:disabled) {
      border-color: #4285f4;
      color: #4285f4;
    }

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &.small {
      padding: 2px 6px;
      font-size: 10px;

      .icon {
        font-size: 10px;
      }
    }
  }
}

@media screen and (max-width: 1920px) {
  .alarm-analysis-list {
    .list-header {
      .title {
        font-size: 0.8rem;
      }
    }
  }

  .alarm-list-container {
    .alarm-list {
      .alarm-snapshot {
        .snapshot-image-container {
          height: 150px;
        }
      }
    }
  }
}
</style>
