<template>
  <div class="alarm-notification-overlay" v-if="visible" @click="handleOverlayClick">
    <div class="alarm-notification" @click.stop>
      <div class="alarm-header">
        <div class="alarm-icon">
          <el-icon size="24" color="#f56c6c">
            <Warning />
          </el-icon>
        </div>
        <div class="alarm-title">
          <h3>波形异常报警</h3>
          <span class="alarm-time">{{ formatTime(alarmData.timestamp) }}</span>
        </div>
        <!-- <el-button 
          type="text" 
          @click="close" 
          class="close-btn"
          :icon="Close"
        /> -->
      </div>

      <div class="alarm-content">
        <div class="alarm-info">
          <div class="info-item">
            <span class="label">通道:</span>
            <span class="value channel-badge">通道{{ alarmData.channelId }}</span>
          </div>
          <div class="info-item">
            <span class="label">异常描述:</span>
            <span class="value error-type">{{ alarmData.analysisConclusion }}</span>
          </div>
          <div class="info-item">
            <span class="label">严重程度:</span>
            <el-tag :type="getSeverityType(alarmData.severity)" size="small">
              {{ getSeverityText(alarmData.severity) }}
            </el-tag>
          </div>
        </div>

        <div class="alarm-details" v-if="alarmData.snapshotData">
          <h4>波形统计信息</h4>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-label">峰值电压:</span>
              <span class="stat-value">{{ alarmData.snapshotData.statistics.peakVoltage }}V</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">最小电压:</span>
              <span class="stat-value"
                >{{ alarmData.snapshotData.statistics.minimumVoltage }}V</span
              >
            </div>
            <div class="stat-item">
              <span class="stat-label">平均电压:</span>
              <span class="stat-value"
                >{{ alarmData.snapshotData.statistics.averageVoltage }}V</span
              >
            </div>
            <div class="stat-item">
              <span class="stat-label">电压范围:</span>
              <span class="stat-value">{{ alarmData.snapshotData.statistics.range }}</span>
            </div>
          </div>
        </div>

        <!-- 添加错误图片显示 -->
        <div
          class="error-image-section"
          v-if="
            alarmData.snapshotData.err_pic_path_list &&
            alarmData.snapshotData.err_pic_path_list.length > 0
          "
        >
          <h4>异常波形图像</h4>
          <div class="error-image-container">
            <div v-if="isLoadingImage" class="image-loading">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>加载中...</span>
            </div>
            <div v-else-if="imageLoadError" class="image-error">
              <el-icon><Picture /></el-icon>
              <span>图片加载失败</span>
            </div>
            <img
              v-else
              :src="errorImageUrl"
              alt="异常波形图像"
              class="error-image"
              @error="imageLoadError = true"
              @load="handleImageLoad"
            />
            <div class="image-info">
              <span class="image-label">检测到的异常区域</span>
              <span class="image-count" v-if="alarmData.snapshotData.err_pic_path_list.length > 1">
                共 {{ alarmData.snapshotData.err_pic_path_list.length }} 张图片
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="alarm-actions">
        <el-button @click="pauseAlarm" type="warning" size="small">
          暂停报警
        </el-button>
        <el-button @click="viewDetails" type="primary" size="small"> 查看详情 </el-button>
        <el-button @click="acknowledge" type="success" size="small"> 确认报警 </el-button>
        <el-button @click="close" size="small"> 关闭 </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElButton, ElIcon, ElTag } from 'element-plus'
import { Warning, Picture, Loading } from '@element-plus/icons-vue'
import type { AlarmData } from '@renderer/types/alarmData'
import { useAlarmNotification } from './useAlarmNotification'

interface Props {
  alarmData: Omit<AlarmData, 'id'>
  visible: boolean
  autoClose?: boolean
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  autoClose: true,
  duration: 6000
})

const { pauseAlarm } = useAlarmNotification()

const emit = defineEmits<{
  close: []
  acknowledge: [alarmData: Omit<AlarmData, 'id'>]
  viewDetails: [alarmData: Omit<AlarmData, 'id'>]
}>()

// 自动关闭定时器
let autoCloseTimer: ReturnType<typeof setTimeout> | null = null

if (props.autoClose && props.visible) {
  autoCloseTimer = setTimeout(() => {
    close()
  }, props.duration)
}

const formatTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString()
}

const getSeverityType = (
  severity?: string
): 'primary' | 'success' | 'warning' | 'info' | 'danger' => {
  switch (severity) {
    case 'critical':
      return 'danger'
    case 'warning':
      return 'warning'
    default:
      return 'info'
  }
}

const getSeverityText = (severity?: string) => {
  switch (severity) {
    case 'critical':
      return '严重'
    case 'warning':
      return '警告'
    default:
      return '一般'
  }
}

const close = () => {
  if (autoCloseTimer) {
    clearTimeout(autoCloseTimer)
    autoCloseTimer = null
  }
  emit('close')
}

const acknowledge = () => {
  emit('acknowledge', props.alarmData)
  close()
}

const viewDetails = () => {
  emit('viewDetails', props.alarmData)
  close()
}

const handleOverlayClick = () => {
  close()
}

// 图片处理相关
const errorImageUrl = ref('')
const isLoadingImage = ref(false)
const imageLoadError = ref(false)

// 直接通过IPC获取图片
const loadErrorImage = async () => {
  if (!props.alarmData.snapshotData?.err_pic_path_list?.length) return

  const imagePath = props.alarmData.snapshotData.err_pic_path_list[0]
  if (!imagePath) return

  try {
    isLoadingImage.value = true
    imageLoadError.value = false
    errorImageUrl.value = ''

    // 直接通过IPC获取图片的data URL
    errorImageUrl.value = await window.electronAPI.invoke('read-image', imagePath)
  } catch (error) {
    console.error('读取图片失败:', error)
    imageLoadError.value = true
  } finally {
    isLoadingImage.value = false
  }
}

// 监听报警数据变化，加载图片
watch(() => props.alarmData.snapshotData?.err_pic_path_list, loadErrorImage, { immediate: true })

const handleImageLoad = () => {
  console.log('图片加载成功')
}
</script>

<style scoped lang="less">
/* 关闭所有弹窗背景模糊 */
.el-overlay,
.el-overlay-dialog,
.el-message-box__wrapper {
  backdrop-filter: none !important;
}

.alarm-notification-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.alarm-notification {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-20px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.alarm-header {
  display: flex;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
  background: linear-gradient(135deg, #fff5f5 0%, #fef2f2 100%);
  border-radius: 12px 12px 0 0;

  .alarm-icon {
    margin-right: 12px;
  }

  .alarm-title {
    flex: 1;

    h3 {
      margin: 0;
      color: #f56c6c;
      font-size: 18px;
      font-weight: 600;
    }

    .alarm-time {
      color: #909399;
      font-size: 12px;
    }
  }

  .close-btn {
    color: #909399;

    &:hover {
      color: #f56c6c;
    }
  }
}

.alarm-content {
  padding: 20px;
}

.alarm-info {
  margin-bottom: 20px;

  .info-item {
    display: flex;
    align-items: center;
    margin-bottom: 12px;

    .label {
      font-weight: 500;
      color: #606266;
      min-width: 80px;
    }

    .value {
      color: #303133;

      &.channel-badge {
        background: #e1f3ff;
        color: #409eff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      &.error-type {
        color: #f56c6c;
        font-weight: 500;
      }
    }
  }
}

.alarm-details {
  h4 {
    margin: 0 0 12px 0;
    color: #303133;
    font-size: 14px;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;

    .stat-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      background: #f8f9fa;
      border-radius: 6px;

      .stat-label {
        font-size: 12px;
        color: #909399;
      }

      .stat-value {
        font-size: 12px;
        color: #303133;
        font-weight: 500;
      }
    }
  }
}

.alarm-actions {
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  background: #fafafa;
  border-radius: 0 0 12px 12px;
}

// 添加错误图片样式
.error-image-section {
  margin-top: 16px;

  h4 {
    margin-bottom: 8px;
    color: #f56c6c;
  }

  .error-image-container {
    border: 1px solid #ebeef5;
    border-radius: 8px;
    overflow: hidden;
    background: #fafafa;

    .error-image {
      width: 100%;
      max-height: 200px;
      object-fit: contain;
      display: block;
      background: white;
    }
    .image-loading,
    .image-error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      width: 100%;
      background-color: #f5f7fa;
      border-radius: 4px;
      color: #909399;
    }

    .image-loading .el-icon,
    .image-error .el-icon {
      font-size: 32px;
      margin-bottom: 8px;
    }

    .image-info {
      padding: 8px 12px;
      background: #f8f9fa;
      border-top: 1px solid #ebeef5;
      display: flex;
      justify-content: space-between;
      align-items: center;

      .image-label {
        font-size: 12px;
        color: #606266;
        font-weight: 500;
      }

      .image-count {
        font-size: 11px;
        color: #909399;
        background: #e1f3ff;
        padding: 2px 6px;
        border-radius: 4px;
      }
    }
  }
}

@media (max-width: 768px) {
  .alarm-notification {
    width: 95%;
    margin: 20px;
  }

  .stats-grid {
    grid-template-columns: 1fr !important;
  }
}
</style>
