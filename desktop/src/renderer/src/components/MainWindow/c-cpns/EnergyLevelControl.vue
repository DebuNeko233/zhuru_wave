<template>
  <div class="energy-level-control">
    <div class="info-content">
      <div class="info-left">
        <div class="info-label">能量级别</div>
        <div class="info-value">{{ currentEnergyLevel }}</div>
        <div class="info-epsilon">采样点 {{ currentEpsilon }}</div>
        <div class="info-status" :class="energyStatusClass">{{ energyStatusText }}</div>
      </div>

      <div class="info-right">
        <div class="energy-selector">
          <div
            v-for="level in displayedLevels"
            :key="level"
            class="energy-option"
            :class="{ active: currentEnergyLevel === level }"
            @click="selectEnergyLevel(level)"
          >
            {{ level }}
          </div>
          <div v-if="hasMoreLevels" class="energy-option more-option" @click="toggleShowAll">
            {{ showAll ? '收起' : `+${hiddenLevelsCount}` }}
          </div>
        </div>

        <button class="manage-btn" :disabled="isEnerageLevelMapLoading" @click="openConfigDialog">
          <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" width="28" height="28">
            <path
              d="M512 909.061224c-218.906122 0-397.061224-178.155102-397.061224-397.061224s178.155102-397.061224 397.061224-397.061224 397.061224 178.155102 397.061224 397.061224-178.155102 397.061224-397.061224 397.061224z"
              fill="#16C4AF"
            ></path>
            <path
              d="M660.897959 531.853061h-297.795918c-10.971429 0-19.853061-8.881633-19.853061-19.853061s8.881633-19.853061 19.853061-19.853061h297.795918c10.971429 0 19.853061 8.881633 19.853061 19.853061s-8.881633 19.853061-19.853061 19.853061z"
              fill="#DCFFFA"
            ></path>
            <path
              d="M512 680.75102c-10.971429 0-19.853061-8.881633-19.853061-19.853061v-297.795918c0-10.971429 8.881633-19.853061 19.853061-19.853061s19.853061 8.881633 19.853061 19.853061v297.795918c0 10.971429-8.881633 19.853061-19.853061 19.853061z"
              fill="#DCFFFA"
            ></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import useParamSettingStore from '@renderer/store/paramentSetting'

// 定义事件
const emit = defineEmits<{
  openConfigDialog: []
}>()

const { enerageLevelMap, isEnerageLevelMapLoading } = storeToRefs(useParamSettingStore())
const { changeEnerageLevelConfig } = useParamSettingStore()

const MAX_DISPLAY_COUNT = 5

const showAll = ref(false)

// 所有可用能量级别，按数值升序排列
const energyLevels = computed(() =>
  Object.keys(enerageLevelMap.value)
    .map(Number)
    .sort((a, b) => a - b)
)

// 当前激活的能量级别，加载完成后自动初始化为第一个可用级别
const currentActiveLevel = ref<number | undefined>()

watch(
  energyLevels,
  (levels) => {
    if (currentActiveLevel.value === undefined && levels.length > 0) {
      currentActiveLevel.value = levels[0]
    }
  },
  { immediate: true }
)

const currentEnergyLevel = computed(() => currentActiveLevel.value)

// 当前级别对应的采样点上限（epsilon）
const currentEpsilon = computed(() => {
  const level = currentEnergyLevel.value
  if (level === undefined) return '-'
  return enerageLevelMap.value[level]?.epsilon ?? '-'
})

// 展示的级别列表：折叠时最多显示 MAX_DISPLAY_COUNT 个，
// 始终确保当前选中项可见
const displayedLevels = computed(() => {
  const levels = energyLevels.value
  if (showAll.value || levels.length <= MAX_DISPLAY_COUNT) return levels

  const active = currentActiveLevel.value
  const head = levels.slice(0, MAX_DISPLAY_COUNT)

  // 当前选中项已在前 MAX_DISPLAY_COUNT 个中，直接返回
  if (active === undefined || head.includes(active)) return head

  // 选中项在折叠区域外，用它替换最后一个槽位并保持升序
  return [...head.slice(0, MAX_DISPLAY_COUNT - 1), active].sort((a, b) => a - b)
})

// 是否还有隐藏项
const hasMoreLevels = computed(() => energyLevels.value.length > MAX_DISPLAY_COUNT)

// 折叠时隐藏的级别数量（用于 "+N" 按钮文字）
const hiddenLevelsCount = computed(() =>
  Math.max(0, energyLevels.value.length - displayedLevels.value.length)
)

const energyStatusText = computed(() => {
  if (isEnerageLevelMapLoading.value) return '加载中...'
  const level = currentEnergyLevel.value
  if (level === undefined) return '加载中...'
  return level < 120 ? '低能量' : '高能量'
})

const energyStatusClass = computed(() => {
  if (isEnerageLevelMapLoading.value) return ''
  const level = currentEnergyLevel.value
  if (level === undefined) return ''
  return level < 120 ? 'low-energy' : 'high-energy'
})

const selectEnergyLevel = (level: number): void => {
  if (isEnerageLevelMapLoading.value) return

  const config = enerageLevelMap.value[level]
  if (config) {
    currentActiveLevel.value = level
    changeEnerageLevelConfig(level, config)
  }
}

const toggleShowAll = (): void => {
  showAll.value = !showAll.value
}

const openConfigDialog = (): void => {
  emit('openConfigDialog')
}
</script>

<style scoped lang="less">
// ── 卡片外壳，与 InfoCard 完全一致 ──────────────────────────────
.energy-level-control {
  flex: 1;
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
  }
}

// ── 内容区，与 InfoCard .info-content 完全一致 ───────────────────
.info-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 110px;
}

// ── 左侧：label / value / status，与 InfoCard 完全一致 ───────────
.info-left {
  flex: 1;
  display: flex;
  gap: 5px;
  flex-direction: column;
  justify-content: center;
}

.info-label {
  font-size: 18px;
  color: #666;
  font-weight: 500;
  margin-bottom: 6px;
  white-space: nowrap;
}

.info-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  line-height: 1;
}

.info-epsilon {
  font-size: 12px;
  color: #999;
  margin-bottom: 2px;
}

.info-status {
  font-size: 15px;
  font-weight: 500;

  &.low-energy {
    color: #faad14;
  }

  &.high-energy {
    color: #52c41a;
  }
}

// ── 右侧：选择器 + 管理按钮，替代 InfoCard 的图标区 ─────────────
.info-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
  margin-left: 12px;
}

.energy-selector {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-height: 64px;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 2px;

  &::-webkit-scrollbar {
    width: 3px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;

    &:hover {
      background: #a8a8a8;
    }
  }
}

.energy-option {
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 32px;
  text-align: center;
  color: #606266;
  white-space: nowrap;

  &:hover {
    background: #ecf5ff;
    border-color: #b3d8ff;
    color: #409eff;
  }

  &.active {
    background: #409eff;
    color: #fff;
    border-color: #409eff;
  }

  &.more-option {
    background: #f0f0f0;
    color: #909399;
    border-color: #d3d4d6;

    &:hover {
      background: #e6e8eb;
      color: #606266;
      border-color: #c0c4cc;
    }
  }

  &:active {
    transform: scale(0.98);
  }
}

.manage-btn {
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: #f0fffe;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

// ── 响应式，与 InfoCard 对齐 ─────────────────────────────────────
@media (max-width: 1920px) {
  .energy-level-control {
    padding: 10px 12px;
  }

  .info-value {
    font-size: 20px;
  }

  .info-label {
    font-size: 16px;
  }

  .energy-option {
    padding: 3px 6px;
    font-size: 11px;
    min-width: 24px;
  }
}

@media (max-width: 768px) {
  .energy-level-control {
    padding: 16px;
  }

  .info-value {
    font-size: 24px;
  }

  .energy-selector {
    max-height: 44px;
  }
}
</style>
