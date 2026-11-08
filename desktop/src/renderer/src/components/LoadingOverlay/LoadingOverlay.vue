<template>
  <div v-if="visible" class="loading-overlay">
    <div class="loading-container">
      <img :src="loadingGif" alt="Loading..." class="loading-gif" />
      <div class="loading-text">
        <h3>{{ title }}</h3>
        <p>{{ description }}</p>
      </div>
      <div class="loading-progress">
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import loadingGif from '@renderer/assets/img/loading.gif'

interface Props {
  visible: boolean
  title?: string
  description?: string
  loadingGif?: string
}

withDefaults(defineProps<Props>(), {
  title: '正在处理',
  description: '请稍候，正在处理您的请求...',
  loadingGif: loadingGif // 默认GIF路径
})
</script>

<style scoped lang="less">
/* 加载动画样式 */
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1999;
  animation: fadeIn 0.3s ease-out;
}

.loading-container {
  background: white;
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 20px;
  justify-content: center;
  align-items: center;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  animation: slideUp 0.4s ease-out;
}

.loading-spinner {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto 30px;
}

.spinner-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border: 3px solid transparent;
  border-radius: 50%;
  animation: spin 1.5s linear infinite;
}

.spinner-ring:nth-child(1) {
  border-top-color: #409eff;
  animation-delay: 0s;
}

.spinner-ring:nth-child(2) {
  border-right-color: #67c23a;
  animation-delay: -0.5s;
  width: 70%;
  height: 70%;
  top: 15%;
  left: 15%;
}

.spinner-ring:nth-child(3) {
  border-bottom-color: #e6a23c;
  animation-delay: -1s;
  width: 40%;
  height: 40%;
  top: 30%;
  left: 30%;
}

.loading-text h3 {
  margin: 0 0 10px;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.loading-text p {
  margin: 0 0 30px;
  color: #606266;
  font-size: 14px;
}

.loading-progress {
  width: 100%;
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #f0f2f5;
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  border-radius: 2px;
  animation: progressMove 2s ease-in-out infinite;
}

/* 动画定义 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes progressMove {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .loading-container {
    background: #2c2c2c;
    color: white;
  }

  .loading-text h3 {
    color: white;
  }

  .loading-text p {
    color: #cccccc;
  }
}
</style>
