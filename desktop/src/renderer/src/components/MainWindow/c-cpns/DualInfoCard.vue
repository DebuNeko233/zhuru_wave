<template>
  <div class="info-card" :class="{ hover: enableHover }">
    <div class="info-content">
      <div class="info-left">
        <div class="info-label">{{ label }}</div>
        <div class="dual-values">
          <div class="value-item">
            <div class="value-label">{{ leftLabel }}</div>
            <div class="value-number">{{ leftValue }}</div>
          </div>
          <template v-if="middleLabel !== undefined">
            <div class="value-divider"></div>
            <div class="value-item">
              <div class="value-label">{{ middleLabel }}</div>
              <div class="value-number">{{ middleValue }}</div>
            </div>
          </template>
          <div class="value-divider"></div>
          <div class="value-item">
            <div class="value-label">{{ rightLabel }}</div>
            <div class="value-number">{{ rightValue }}</div>
          </div>
        </div>
        <div class="info-status" :class="statusClass">{{ status }}</div>
      </div>
      <div class="info-right">
        <div class="info-icon">
          <component :is="icon" v-if="icon" />
          <slot name="icon" v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'

interface Props {
  label: string
  leftLabel: string
  leftValue: string
  middleLabel?: string
  middleValue?: string
  rightLabel: string
  rightValue: string
  status: string
  statusType?: 'normal' | 'warning' | 'excellent' | 'low' | 'positive' | 'negative'
  icon?: Component | string
  enableHover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  statusType: 'normal',
  enableHover: true
})

const statusClass = computed(() => {
  return props.statusType
})
</script>

<style scoped lang="less">
.info-card {
  flex: 1;
  background: white;
  padding: 12px 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;

  &.hover:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    transform: translateY(-2px);
    cursor: pointer;
  }
}

.info-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 110px;
}

.info-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.info-right {
  display: flex;
  align-items: center;
  margin-left: 12px;
}

.info-label {
  font-size: 18px;
  color: #666;
  font-weight: 500;
  margin-bottom: 8px;
}

.dual-values {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.value-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.value-label {
  font-size: 12px;
  color: #999;
  margin-bottom: 4px;
  font-weight: 400;
}

.value-number {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  line-height: 1;
}

.value-divider {
  width: 1px;
  height: 30px;
  background: #e8e8e8;
  margin: 0 8px;
}

.info-status {
  font-size: 15px;
  font-weight: 500;
  text-align: center;

  &.normal {
    color: #52c41a;
  }

  &.warning {
    color: #faad14;
  }

  &.excellent {
    color: #722ed1;
  }

  &.low {
    color: #13c2c2;
  }

  &.positive {
    color: #52c41a;
  }

  &.negative {
    color: #ff4d4f;
  }
}

.info-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 50px;
  height: 50px;
  border-radius: 8px;
}

// 响应式设计
@media (max-width: 1920px) {
  .info-card {
    padding: 10px 12px;
  }

  .value-number {
    font-size: 16px;
  }

  .info-label {
    font-size: 14px;
  }

  .info-icon {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 768px) {
  .dual-values {
    gap: 8px;
  }

  .value-number {
    font-size: 18px;
  }

  .info-icon {
    width: 44px;
    height: 44px;
  }
}
</style>
