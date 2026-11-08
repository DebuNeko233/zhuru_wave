<template>
  <div class="program-setting">
    <div class="setting-header">
      <h2 class="title">程序参数设置</h2>
      <p class="subtitle">数据采集与处理参数配置</p>
    </div>

    <div class="setting-content" v-if="localProgramSettings">
      <!-- 数据处理参数 -->
      <div class="setting-section">
        <div class="section-header">
          <h3 class="section-title">数据采集相关设置</h3>
        </div>
        <div class="data-controls">
          <div class="control-row">
            <div class="control-group">
              <label class="control-label">采集更新频率 (ms)</label>
              <input
                type="number"
                v-model.number="localProgramSettings.interval"
                min="50"
                max="5000"
                step="50"
                class="control-input"
              />
            </div>
            <div class="control-group">
              <label class="control-label">获取最大长度数据(最大1万个点)</label>
              <input
                type="number"
                v-model.number="localProgramSettings.maxLen"
                min="1000"
                max="50000"
                step="500"
                class="control-input"
              />
            </div>
            <div class="control-group">
              <label class="control-label">展示采样点个数</label>
              <input
                type="number"
                v-model.number="localProgramSettings.targetLength"
                min="1000"
                max="50000"
                step="500"
                class="control-input"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- 功能开关 -->
      <div class="setting-section">
        <div class="section-header">
          <h3 class="section-title">功能开关</h3>
        </div>
        <div class="switch-controls">
          <div class="switch-item" :class="{ disabled: !localProgramSettings.loggingEnabled }">
            <div class="switch-info">
              <span class="switch-label">日志采集</span>
              <span class="switch-desc">启用数据日志记录功能</span>
            </div>
            <div
              class="toggle-switch"
              :class="{ active: localProgramSettings.loggingEnabled }"
              @click="toggleLogging()"
            >
              <div class="toggle-slider"></div>
            </div>
          </div>
          <div
            class="switch-item"
            :class="{ disabled: !localProgramSettings.realTimeMode }"
            style="display: none"
          >
            <div class="switch-info">
              <span class="switch-label">实时模式</span>
              <span class="switch-desc">启用实时数据处理和显示</span>
            </div>
            <div
              class="toggle-switch"
              :class="{ active: localProgramSettings.realTimeMode }"
              @click="toggleRealtime()"
            >
              <div class="toggle-slider"></div>
            </div>
          </div>
          <div
            class="switch-item"
            style="display: none"
            :class="{ disabled: !localProgramSettings.autoSaveEnabled }"
          >
            <div class="switch-info">
              <span class="switch-label">自动保存</span>
              <span class="switch-desc">自动保存采集的数据</span>
            </div>
            <div
              class="toggle-switch"
              :class="{ active: localProgramSettings.autoSaveEnabled }"
              @click="toggleAutoSave()"
            >
              <div class="toggle-slider"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 存储设置 -->
      <div class="setting-section">
        <div class="section-header">
          <h3 class="section-title">存储设置</h3>
        </div>
        <div class="storage-controls">
          <div class="control-group">
            <label class="control-label">报警数据存储位置</label>
            <div class="path-input-group">
              <input
                type="text"
                v-model="localProgramSettings.storageDir.alarmDataPath"
                class="control-input path-input"
                placeholder="选择数据存储目录"
                readonly
              />
              <button class="btn btn-outline" @click="selectDataPath">浏览</button>
            </div>
          </div>
          <div class="control-group">
            <label class="control-label">日志存储位置</label>
            <div class="path-input-group">
              <input
                type="text"
                v-model="localProgramSettings.storageDir.logPath"
                class="control-input path-input"
                placeholder="选择日志存储目录"
                readonly
              />
              <button class="btn btn-outline" @click="selectLogPath">浏览</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 调试模式-->
      <div class="setting-section" :class="{ disabled: !localProgramSettings.enableDebug }">
        <div class="section-header">
          <h3 class="section-title">调试模式</h3>
          <div
            class="toggle-switch"
            :class="{ active: localProgramSettings.enableDebug }"
            @click="toggleDebugSave()"
          >
            <div class="toggle-slider"></div>
          </div>
        </div>
        <div class="storage-controls">
          <div class="control-group">
            <label class="control-label">调试图片存储位置</label>
            <div class="path-input-group">
              <input
                type="text"
                v-model="localProgramSettings.debugStorage.debugImgPath"
                class="control-input path-input"
                placeholder="选择调试图片存储"
                readonly
                :disabled="!localProgramSettings.enableDebug"
              />
              <button
                class="btn btn-outline"
                :class="{ disabled: !localProgramSettings.enableDebug }"
                @click="selectImgPath"
                :disabled="!localProgramSettings.enableDebug"
              >
                浏览
              </button>
            </div>
          </div>
        </div>

        <div class="switch-controls debug_switch">
          <div
            class="switch-item"
            :class="{ disabled: !localProgramSettings.debugStorage.debug_total }"
          >
            <div class="switch-info">
              <span class="switch-label">大图调试</span>
              <span class="switch-desc">启用大图调试功能</span>
            </div>

            <div
              class="toggle-switch"
              :class="{ active: localProgramSettings.debugStorage.debug_total }"
              @click="toggleDebugTotal()"
            >
              <div class="toggle-slider"></div>
            </div>
          </div>

          <div
            class="switch-item"
            :class="{ disabled: !localProgramSettings.debugStorage.debug_single }"
          >
            <div class="switch-info">
              <span class="switch-label">周期小图调试</span>
              <span class="switch-desc">启用周期小图调试</span>
            </div>
            <div
              class="toggle-switch"
              :class="{ active: localProgramSettings.debugStorage.debug_single }"
              @click="toggleDebugSingle()"
            >
              <div class="toggle-slider"></div>
            </div>
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
        <el-button type="primary" @click="resetToProgramSettings"> 确认 </el-button>
      </template>
    </el-dialog>

    <!-- 使用新的加载组件 -->
    <LoadingOverlay
      :visible="applyLoading"
      title="正在应用设置"
      description="请稍候，正在保存您的配置..."
    />
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@renderer/store/user'
import { storeToRefs } from 'pinia'
import useParamentSettingStore from '@renderer/store/paramentSetting'
import type { ProgramSettings } from '@main/type'
import LoadingOverlay from '@renderer/components/LoadingOverlay/LoadingOverlay.vue'

const paramentSettingStore = useParamentSettingStore()

const { resetProgramSettings, updateProgramSettings, enerageLevelMap } = paramentSettingStore

// 应用设置确认对话框相关
const applyConfirmVisible = ref(false)
const resetConfirmVisible = ref(false)
const applyLoading = ref(false)

const userStore = useUserStore()
const { userRole } = storeToRefs(userStore)

const canModifySettings = computed(
  () => userRole.value === 'admin' || userRole.value === 'technology'
)

const localProgramSettings = ref<ProgramSettings | null>()

// 初始化本地副本
const initLocalSettings = () => {
  localProgramSettings.value = JSON.parse(JSON.stringify(paramentSettingStore.programSettings))
}

const toggleRealtime = () => {
  if (localProgramSettings.value) {
    localProgramSettings.value.realTimeMode = !localProgramSettings.value?.realTimeMode
  }
}

const toggleAutoSave = () => {
  if (localProgramSettings.value) {
    localProgramSettings.value.autoSaveEnabled = !localProgramSettings.value?.autoSaveEnabled
  }
}

const toggleDebugSave = () => {
  if (localProgramSettings.value) {
    localProgramSettings.value.enableDebug = !localProgramSettings.value?.enableDebug
  }
}

const toggleDebugTotal = () => {
  if (localProgramSettings.value) {
    localProgramSettings.value.debugStorage.debug_total =
      !localProgramSettings.value?.debugStorage.debug_total
  }
}

const toggleDebugSingle = () => {
  if (localProgramSettings.value) {
    localProgramSettings.value.debugStorage.debug_single =
      !localProgramSettings.value?.debugStorage.debug_single
  }
}

const toggleLogging = () => {
  if (localProgramSettings.value) {
    localProgramSettings.value.loggingEnabled = !localProgramSettings.value?.loggingEnabled
  }
}

const selectDataPath = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('dialog:showOpenDialog', {
      title: '选择报警数据存储目录',
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      if (localProgramSettings.value) {
        localProgramSettings.value.storageDir.alarmDataPath = result.filePaths[0]
        ElMessage.success('数据存储路径已更新')
      }
    }
  } catch (error) {
    console.error('选择数据路径失败:', error)
    ElMessage.error('选择路径失败')
  }
}

const selectLogPath = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('dialog:showOpenDialog', {
      title: '选择日志存储目录',
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      if (localProgramSettings.value) {
        localProgramSettings.value.storageDir.logPath = result.filePaths[0]
        ElMessage.success('日志存储路径已更新')
      }
    }
  } catch (error) {
    console.error('选择日志路径失败:', error)
    ElMessage.error('选择路径失败')
  }
}

const selectImgPath = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('dialog:showOpenDialog', {
      title: '选择日志存储目录',
      properties: ['openDirectory']
    })

    if (!result.canceled && result.filePaths.length > 0) {
      if (localProgramSettings.value) {
        localProgramSettings.value.debugStorage.debugImgPath = result.filePaths[0]
        ElMessage.success('日志存储路径已更新')
      }
    }
  } catch (error) {
    console.error('选择日志路径失败:', error)
    ElMessage.error('选择路径失败')
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
    ElMessage.error('您没有权限修改设置')
    return
  }

  if (!localProgramSettings.value) {
    ElMessage.error('设置数据无效')
    return
  }

  applyLoading.value = true

  try {
    await updateProgramSettings(localProgramSettings.value)
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
const resetToProgramSettings = async () => {
  if (!canModifySettings.value) {
    ElMessage.error('您没有权限修改设置')
    return
  }
  try {
    applyLoading.value = true
    await resetProgramSettings()
    // 重新初始化本地副本
    initLocalSettings()
    ElMessage.success('设置已重置为默认值')
    resetConfirmVisible.value = false
  } catch (error) {
    console.error('重置设置失败:', error)
    ElMessage.error('重置设置失败，请重试')
  } finally {
    applyLoading.value = false
  }
}

watch(
  () => localProgramSettings.value?.debugStorage.enerageLevel,
  (newVal, oldVal) => {
    if (newVal !== oldVal && newVal && enerageLevelMap[newVal]) {
      if (localProgramSettings.value?.debugStorage) {
        localProgramSettings.value.debugStorage.epsilon = enerageLevelMap[newVal].epsilon
        localProgramSettings.value.debugStorage.rate = enerageLevelMap[newVal].rate
      }
    }
  }
)

// 组件挂载时初始化
onMounted(() => {
  initLocalSettings()
})
</script>

<style scoped lang="less">
.program-setting {
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
  transition: all 0.4s ease;

  &.disabled {
    background: #f5f5f7;
  }
}

.section-header {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  .section-title {
    font-size: 20px;
    font-weight: 600;
    color: #1d1d1f;
    margin: 0;
  }
}

.data-controls,
.advanced-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.control-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
}

.control-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.control-label {
  font-size: 14px;
  font-weight: 500;
  color: #424245;
}

.control-input {
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

.switch-controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.debug_switch {
  margin-top: 20px;
}

.switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e5e7;
  transition: all 0.4s ease;
  &.disabled {
    background: #f5f5f7;
  }
}

.switch-info {
  display: flex;
  flex-direction: column;
  gap: 4px;

  .switch-label {
    font-size: 16px;
    font-weight: 500;
    color: #1d1d1f;
  }

  .switch-desc {
    font-size: 14px;
    color: #86868b;
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

.storage-controls {
  display: flex;

  gap: 16px;
}

.path-input-group {
  display: flex;
  gap: 8px;

  .path-input {
    flex: 1;
  }
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

  &.btn-outline {
    background: transparent;
    color: #007aff;
    border: 1px solid #007aff;
    padding: 8px 16px;
    font-size: 14px;

    &:hover {
      background: #007aff;
      color: white;
    }
  }
  &.disabled {
    background: #f5f5f7;
    color: #86868b;
    cursor: not-allowed;
    padding: 8px 16px;
    font-size: 14px;
    border: 1px solid #d2d2d7;
    &:hover {
      background: #f5f5f7;
      color: #86868b;
    }
  }
}

@media (max-width: 768px) {
  .program-setting {
    padding: 16px;
  }

  .control-row {
    grid-template-columns: 1fr;
  }

  .switch-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .path-input-group {
    flex-direction: column;
  }

  .action-buttons {
    flex-direction: column;
  }
}
</style>
