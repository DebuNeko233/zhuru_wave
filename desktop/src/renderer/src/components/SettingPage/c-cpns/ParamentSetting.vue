<template>
  <div class="parameter-setting" v-if="localDeviceSettings">
    <div class="setting-header">
      <h2 class="title">参数设置</h2>
      <p class="subtitle">HT6004BX系列示波器参数配置</p>
    </div>

    <div class="setting-content">
      <!-- 通道设置 -->
      <div class="setting-section">
        <div class="section-header">
          <h3 class="section-title">通道设置</h3>
        </div>
        <div class="channel-grid">
          <div
            v-for="(channel, index) in localDeviceSettings.channels"
            :key="index"
            class="channel-card"
          >
            <div class="channel-header">
              <span class="channel-label">CH{{ index + 1 }}</span>
              <div
                class="toggle-switch"
                :class="{ active: channel.bCHEnable }"
                @click="toggleChannel(index)"
              >
                <div class="toggle-slider"></div>
              </div>
            </div>
            <div class="channel-controls" v-if="channel.bCHEnable">
              <div class="control-group">
                <label class="control-label">电压档位</label>
                <select v-model.number="channel.nCHVoltDIV" class="control-select">
                  <option value="0">2mV/div</option>
                  <option value="1">5mV/div</option>
                  <option value="2">10mV/div</option>
                  <option value="3">20mV/div</option>
                  <option value="4">50mV/div</option>
                  <option value="5">100mV/div</option>
                  <option value="6">200mV/div</option>
                  <option value="7">500mV/div</option>
                  <option value="8">1V/div</option>
                  <option value="9">2V/div</option>
                  <option value="10">5V/div</option>
                  <option value="11">10V/div</option>
                </select>
              </div>
              <div class="control-group">
                <label class="control-label">耦合方式</label>
                <select v-model.number="channel.coupling" class="control-select">
                  <option value="0">DC</option>
                  <option value="1">AC</option>
                </select>
              </div>
              <div class="control-group">
                <label class="control-label">带宽限制</label>
                <div
                  class="toggle-switch small"
                  :class="{ active: channel.bCHBWLimit }"
                  @click="toggleBWLimit(index)"
                >
                  <div class="toggle-slider"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 时基设置 -->
      <div class="setting-section">
        <div class="section-header">
          <h3 class="section-title">时基设置</h3>
        </div>
        <div class="timebase-control">
          <div class="control-group">
            <label class="control-label">时间基准</label>
            <select v-model.number="localDeviceSettings.timeBaseIndex" class="control-select">
              <option value="0">2ns/div</option>
              <option value="1">5ns/div</option>
              <option value="2">10ns/div</option>
              <option value="3">20ns/div</option>
              <option value="4">50ns/div</option>
              <option value="5">100ns/div</option>
              <option value="6">200ns/div</option>
              <option value="7">500ns/div</option>
              <option value="8">1μs/div</option>
              <option value="9">2μs/div</option>
              <option value="10">5μs/div</option>
              <option value="11">10μs/div</option>
              <option value="12">20μs/div</option>
              <option value="13">50μs/div</option>
              <option value="14">100μs/div</option>
              <option value="15">200μs/div</option>
              <option value="16">500μs/div</option>
              <option value="17">1ms/div</option>
              <option value="18">2ms/div</option>
              <option value="19">5ms/div</option>
              <option value="20">10ms/div</option>
              <option value="21">20ms/div</option>
              <option value="22">50ms/div</option>
              <option value="23">100ms/div</option>
              <option value="24">200ms/div</option>
              <option value="25">500ms/div</option>
              <option value="26">1s/div</option>
              <option value="27">2s/div</option>
              <option value="28">5s/div</option>
              <option value="29">10s/div</option>
              <option value="30">20s/div</option>
              <option value="31">50s/div</option>
              <option value="32">100s/div</option>
              <option value="33">200s/div</option>
              <option value="34">500s/div</option>
              <option value="35">1000s/div</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 触发设置 -->
      <div class="setting-section">
        <div class="section-header">
          <h3 class="section-title">触发设置</h3>
        </div>
        <div class="trigger-controls">
          <div class="control-row">
            <div class="control-group">
              <label class="control-label">触发源</label>
              <select v-model.number="localDeviceSettings.trigger.source" class="control-select">
                <option value="0">CH1</option>
                <option value="1">CH2</option>
                <option value="2">CH3</option>
                <option value="3">CH4</option>
                <option value="4">EXT</option>
                <option value="5">EXT/10</option>
              </select>
            </div>
            <div class="control-group">
              <label class="control-label">触发模式</label>
              <select v-model.number="localDeviceSettings.trigger.mode" class="control-select">
                <option value="0">边沿触发</option>
                <option value="1">脉冲触发</option>
                <option value="2">视频触发</option>
              </select>
            </div>
          </div>
          <div class="control-row">
            <div class="control-group">
              <label class="control-label">触发斜率</label>
              <select v-model.number="localDeviceSettings.trigger.slope" class="control-select">
                <option value="0">上升沿</option>
                <option value="1">下降沿</option>
              </select>
            </div>
            <div class="control-group">
              <!-- <label class="control-label">触发电平</label>
              <div class="slider-container">
                <input
                  type="range"
                  v-model.number="localDeviceSettings.trigger.level"
                  min="0"
                  max="255"
                  class="level-slider"
                />
                <span class="slider-value">{{ localDeviceSettings.trigger.level }}</span>
              </div> -->
            </div>
          </div>
        </div>
      </div>

      <!-- 采样设置 -->
      <div class="setting-section">
        <div class="section-header">
          <h3 class="section-title">采样设置</h3>
        </div>
        <div class="sampling-controls">
          <div class="control-group">
            <label class="control-label">缓冲区长度</label>
            <select
              v-model.number="localDeviceSettings.sampling.bufferLength"
              class="control-select"
            >
              <option value="1000">1K</option>
              <option value="5000">5K</option>
              <option value="10000">10k</option>
              <option value="15000">15K</option>
              <option value="20000">20k</option>
            </select>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <button class="btn btn-secondary" @click="showRestConfirmDialog">恢复默认</button>
        <button class="btn btn-primary" @click="showApplyConfirmDialog">应用设置</button>
      </div>
    </div>

    <!-- 应用设置确认对话框 -->
    <el-dialog v-model="applyConfirmVisible" title="设备参数应用设置" width="600px" top="37vh">
      <div>
        <p>确定要应用当前设置吗？</p>
        <p>当前配置会在本地存储后立即生效</p>
      </div>
      <template #footer>
        <el-button @click="applyConfirmVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmApplySettings"> 确认 </el-button>
      </template>
    </el-dialog>
    <!-- 恢复设置确认对话框 -->
    <el-dialog v-model="resetConfirmVisible" title="设备参数应用设置" width="600px" top="37vh">
      <div>
        <p>确定要使用默认值作为当前的设置吗？</p>
        <p>当前配置会在本地存储后立即生效</p>
      </div>
      <template #footer>
        <el-button @click="resetConfirmVisible = false">取消</el-button>
        <el-button type="primary" @click="resetToDeviceSettings"> 确认 </el-button>
      </template>
    </el-dialog>

    <LoadingOverlay
      :visible="applyLoading"
      title="正在应用设置"
      description="请稍候，正在保存您的配置..."
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@renderer/store/user'
import { ElMessage } from 'element-plus'
import useParamSettingStore from '@renderer/store/paramentSetting'
import type { DeviceSettings } from '@main/type'
import LoadingOverlay from '@renderer/components/LoadingOverlay/LoadingOverlay.vue'

// 获取store实例
const store = useParamSettingStore()

const userStore = useUserStore()
const { userRole } = storeToRefs(userStore)

// 解构响应式状态
const { deviceSettings } = storeToRefs(store)

// 权限检查
const canModifySettings = computed(
  () => userRole.value === 'admin' || userRole.value === 'technology'
)

// 解构方法
const { resetDeviceSettings, updateDeviceSettings } = store

// 创建本地副本用于编辑
const localDeviceSettings = ref<DeviceSettings | null>(null)

// 应用设置确认对话框相关
const applyConfirmVisible = ref(false)
const resetConfirmVisible = ref(false)
const applyLoading = ref(false)

// 初始化本地副本
const initLocalSettings = () => {
  localDeviceSettings.value = JSON.parse(JSON.stringify(deviceSettings.value))
}

// 本地切换通道开关
const toggleChannel = (index: number) => {
  if (localDeviceSettings.value) {
    localDeviceSettings.value.channels[index].bCHEnable =
      !localDeviceSettings.value.channels[index].bCHEnable
  }
}

// 本地切换带宽限制
const toggleBWLimit = (index: number) => {
  if (localDeviceSettings.value) {
    localDeviceSettings.value.channels[index].bCHBWLimit = Number(
      !localDeviceSettings.value.channels[index].bCHBWLimit
    )
  }
}

// 显示应用设置确认对话框
const showApplyConfirmDialog = () => {
  applyConfirmVisible.value = true
}

const showRestConfirmDialog = () => {
  resetConfirmVisible.value = true
}

// 确认应用设置
const confirmApplySettings = async () => {
  if (!canModifySettings.value) {
    ElMessage.error('您没有权限修改设备参数')
    return
  }

  if (!localDeviceSettings.value) {
    ElMessage.error('设置数据无效')
    return
  }

  applyLoading.value = true

  try {
    await updateDeviceSettings(localDeviceSettings.value)
    ElMessage.success('设置已成功应用')
    applyConfirmVisible.value = false
  } catch (error) {
    console.error('应用设置失败:', error)
    ElMessage.error('应用设置失败，请重试')
  } finally {
    applyLoading.value = false
  }
}

// 重置为默认设置
const resetToDeviceSettings = async () => {
  if (!canModifySettings.value) {
    ElMessage.error('您没有权限修改设备参数')
    return
  }

  try {
    await resetDeviceSettings()
    // 重新初始化本地副本
    initLocalSettings()
    ElMessage.success('设置已重置为默认值')
  } catch (error) {
    console.error('重置设置失败:', error)
    ElMessage.error('重置设置失败，请重试')
  }
}

// 组件挂载时初始化
onMounted(() => {
  initLocalSettings()
})
</script>
<style scoped lang="less">
.parameter-setting {
  padding: 24px;

  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.setting-header {
  margin-bottom: 32px;
  text-align: center;

  .title {
    font-size: 28px;
    font-weight: 600;
    color: #1d1d1f;
    margin: 0 0 8px 0;
  }

  .subtitle {
    font-size: 16px;
    color: #86868b;
    margin: 0;
  }
}

.setting-content {
  max-width: 1000px;
  margin: 0 auto;
}

.setting-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid #e5e5e7;
}

.section-header {
  margin-bottom: 20px;

  .section-title {
    font-size: 20px;
    font-weight: 600;
    color: #1d1d1f;
    margin: 0;
  }
}

.channel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.channel-card {
  background: #f5f5f7;
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #e5e5e7;
}

.channel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  .channel-label {
    font-size: 16px;
    font-weight: 600;
    color: #1d1d1f;
  }
}

.channel-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: #424245;
}

.control-select {
  padding: 8px 12px;
  border: 1px solid #d2d2d7;
  border-radius: 6px;
  background: white;
  font-size: 14px;
  color: #1d1d1f;
  outline: none;
  transition: all 0.2s ease;

  &:focus {
    border-color: #007aff;
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
  }
}

.toggle-switch {
  width: 44px;
  height: 24px;
  background: #d2d2d7;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;

  &.small {
    width: 36px;
    height: 20px;
    border-radius: 10px;

    .toggle-slider {
      width: 16px;
      height: 16px;
      border-radius: 8px;
    }

    &.active .toggle-slider {
      transform: translateX(16px);
    }
  }

  &.active {
    background: #007aff;
  }

  .toggle-slider {
    width: 20px;
    height: 20px;
    background: white;
    border-radius: 10px;
    position: absolute;
    top: 2px;
    left: 2px;
    transition: all 0.3s ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  &.active .toggle-slider {
    transform: translateX(20px);
  }
}

.trigger-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sampling-controls {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 16px;
  align-items: end;
}

.slider-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-slider {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: #d2d2d7;
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 10px;
    background: #007aff;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 10px;
    background: #007aff;
    cursor: pointer;
    border: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  }
}

.slider-value {
  font-size: 14px;
  font-weight: 500;
  color: #1d1d1f;
  min-width: 32px;
  text-align: center;
}

.action-buttons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 32px;
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
  outline: none;

  &.btn-primary {
    background: #007aff;
    color: white;

    &:hover {
      background: #0056cc;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
    }
  }

  &.btn-secondary {
    background: #f5f5f7;
    color: #1d1d1f;
    border: 1px solid #d2d2d7;

    &:hover {
      background: #e5e5e7;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
  }
}

@media (max-width: 768px) {
  .parameter-setting {
    padding: 16px;
  }

  .channel-grid {
    grid-template-columns: 1fr;
  }

  .control-row {
    grid-template-columns: 1fr;
  }

  .sampling-controls {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
