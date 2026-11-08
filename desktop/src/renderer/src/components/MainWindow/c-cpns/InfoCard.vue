<template>
  <div class="info-card" :class="{ hover: enableHover }">
    <div class="info-content">
      <div class="info-left">
        <div class="info-label">{{ label }}</div>
        <div class="info-value">{{ value }}</div>
        <div v-if="status" class="info-status" :class="statusClass">{{ status }}</div>
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
  value: string
  status?: string
  statusType?: 'normal' | 'warning' | 'excellent' | 'low' | 'positive' | 'negative'
  icon?: Component | string
  enableHover?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  statusType: 'normal',
  enableHover: true,
  iconColor: '#666',
  iconBackground: 'rgba(0, 0, 0, 0.04)'
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
  gap: 5px;
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
  margin-bottom: 6px;
}

.info-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
  line-height: 1;
}

.info-status {
  font-size: 15px;
  font-weight: 500;

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

  .info-value {
    font-size: 20px;
  }

  .info-label {
    font-size: 16px;
  }

  .info-icon {
    width: 36px;
    height: 36px;
  }
}

@media (max-width: 768px) {
  .info-card {
    padding: 16px;
  }

  .info-value {
    font-size: 24px;
  }

  .info-icon {
    width: 44px;
    height: 44px;
  }
}
</style>
