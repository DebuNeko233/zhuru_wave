<template>
  <div class="appearance-setting">
    <!-- 页面标题 -->
    <div class="setting-header">
      <h2 class="setting-title">外观设置</h2>
      <p class="setting-subtitle">个性化您的界面外观和主题偏好</p>
    </div>

    <!-- 主题选择 -->
    <div class="setting-section">
      <h3 class="section-title">主题模式</h3>
      <div class="theme-options">
        <div
          v-for="theme in themes"
          :key="theme.value"
          class="theme-card"
          :class="{ active: currentTheme === theme.value }"
          @click="changeTheme(theme.value)"
        >
          <div class="theme-preview" :class="theme.value">
            <div class="preview-header"></div>
            <div class="preview-content">
              <div class="preview-sidebar"></div>
              <div class="preview-main"></div>
            </div>
          </div>
          <div class="theme-info">
            <h4>{{ theme.name }}</h4>
            <p>{{ theme.description }}</p>
          </div>
          <el-icon v-if="currentTheme === theme.value" class="check-icon">
            <Check />
          </el-icon>
        </div>
      </div>
    </div>

    <!-- 颜色配置 -->
    <div class="setting-section">
      <h3 class="section-title">主题色配置</h3>
      <div class="color-options">
        <div class="color-group">
          <label class="color-label">主色调</label>
          <div class="color-picker-group">
            <div
              v-for="color in primaryColors"
              :key="color.value"
              class="color-option"
              :class="{ active: currentPrimaryColor === color.value }"
              @click="changePrimaryColor(color)"
            >
              <div class="color-circle" :style="{ backgroundColor: color.value }"></div>
              <span class="color-name">{{ color.name }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 字体设置 -->
    <div class="setting-section">
      <h3 class="section-title">字体设置</h3>
      <div class="font-settings">
        <div class="setting-item">
          <label class="setting-label">字体大小</label>
          <el-select v-model="fontSize" class="setting-select">
            <el-option label="小" value="small" />
            <el-option label="中" value="medium" />
            <el-option label="大" value="large" />
          </el-select>
        </div>
        <div class="setting-item">
          <label class="setting-label">字体族</label>
          <el-select v-model="fontFamily" class="setting-select">
            <el-option label="系统默认" value="system" />
            <el-option label="苹果字体" value="apple" />
            <el-option label="微软雅黑" value="microsoft" />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 界面效果 -->
    <div class="setting-section">
      <h3 class="section-title">界面效果</h3>
      <div class="effect-settings">
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">动画效果</label>
            <p class="setting-desc">启用界面过渡动画</p>
          </div>
          <el-switch v-model="enableAnimations" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">毛玻璃效果</label>
            <p class="setting-desc">为弹窗和面板添加模糊背景</p>
          </div>
          <el-switch v-model="enableBlur" />
        </div>
        <div class="setting-item">
          <div class="setting-info">
            <label class="setting-label">圆角风格</label>
            <p class="setting-desc">使用更圆润的界面元素</p>
          </div>
          <el-switch v-model="enableRoundedCorners" />
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-section">
      <el-button @click="resetToDefault">恢复默认</el-button>
      <el-button type="primary" @click="saveSettings" :loading="saving"> 保存设置 </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { Check } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

// 主题选项
const themes = [
  {
    value: 'light',
    name: '浅色模式',
    description: '经典的浅色主题，适合日间使用'
  },
  {
    value: 'dark',
    name: '深色模式',
    description: '护眼的深色主题，适合夜间使用'
  },
  {
    value: 'auto',
    name: '跟随系统',
    description: '根据系统设置自动切换主题'
  }
]

// 主色调选项
const primaryColors = [
  { name: '苹果蓝', value: '#007AFF', lightV: '#e3f2fd' },
  { name: '苹果绿', value: '#34C759', lightV: '#c8e6c9' },
  { name: '苹果橙', value: '#FF9500', lightV: '#ffcc80' },
  { name: '苹果红', value: '#FF3B30', lightV: '#ffab91' },
  { name: '苹果紫', value: '#AF52DE', lightV: '#d1c4e9' },
  { name: '苹果粉', value: '#FF2D92', lightV: '#ffcc80' }
]

// 响应式数据
const currentTheme = ref('light')
const currentPrimaryColor = ref('#007AFF')
const currentLightVColor = ref('#e3f2fd')

const fontSize = ref('medium')
const fontFamily = ref('system')
const enableAnimations = ref(true)
const enableBlur = ref(true)
const enableRoundedCorners = ref(true)
const saving = ref(false)

// 主题切换
const changeTheme = (theme) => {
  currentTheme.value = theme
  applyTheme(theme)
}

// 应用主题
const applyTheme = (theme) => {
  const root = document.documentElement

  if (theme === 'dark') {
    root.classList.add('dark-theme')
    root.classList.remove('light-theme')
  } else if (theme === 'light') {
    root.classList.add('light-theme')
    root.classList.remove('dark-theme')
  } else if (theme === 'auto') {
    // 检测系统主题
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      root.classList.add('dark-theme')
      root.classList.remove('light-theme')
    } else {
      root.classList.add('light-theme')
      root.classList.remove('dark-theme')
    }
  }
}

// 更改主色调
const changePrimaryColor = (color) => {
  currentPrimaryColor.value = color.value
  currentLightVColor.value = color.lightV
  document.documentElement.style.setProperty('--primary-color', color.value)
  document.documentElement.style.setProperty('--lightVColor-color', color.lightV)
  document.documentElement.style.setProperty('--font-color-primary', color.value)
}

// 应用字体设置
const applyFontSettings = () => {
  const root = document.documentElement

  // 字体大小
  const fontSizeMap = {
    small: '14px',
    medium: '16px',
    large: '18px'
  }
  root.style.setProperty('--base-font-size', fontSizeMap[fontSize.value])

  // 字体族
  const fontFamilyMap = {
    system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    apple: '-apple-system, BlinkMacSystemFont, sans-serif',
    microsoft: '"Microsoft YaHei", "微软雅黑", sans-serif'
  }
  root.style.setProperty('--base-font-family', fontFamilyMap[fontFamily.value])
}

// 应用界面效果
const applyEffects = () => {
  const root = document.documentElement

  root.style.setProperty('--enable-animations', enableAnimations.value ? '1' : '0')
  root.style.setProperty('--enable-blur', enableBlur.value ? 'blur(10px)' : 'none')
  root.style.setProperty('--border-radius', enableRoundedCorners.value ? '8px' : '4px')
}

// 保存设置
const saveSettings = async () => {
  saving.value = true
  try {
    const settings = {
      theme: currentTheme.value,
      primaryColor: currentPrimaryColor.value,
      fontSize: fontSize.value,
      fontFamily: fontFamily.value,
      enableAnimations: enableAnimations.value,
      enableBlur: enableBlur.value,
      enableRoundedCorners: enableRoundedCorners.value
    }

    // 保存到本地存储
    localStorage.setItem('appearanceSettings', JSON.stringify(settings))

    ElMessage.success('外观设置已保存')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saving.value = false
  }
}

// 恢复默认设置
const resetToDefault = () => {
  currentTheme.value = 'light'
  currentPrimaryColor.value = '#007AFF'
  fontSize.value = 'medium'
  fontFamily.value = 'system'
  enableAnimations.value = true
  enableBlur.value = true
  enableRoundedCorners.value = true

  applyTheme('light')
  changePrimaryColor('#007AFF')
  applyFontSettings()
  applyEffects()

  ElMessage.success('已恢复默认设置')
}

// 加载保存的设置
const loadSettings = () => {
  try {
    const saved = localStorage.getItem('appearanceSettings')
    if (saved) {
      const settings = JSON.parse(saved)
      currentTheme.value = settings.theme || 'light'
      currentPrimaryColor.value = settings.primaryColor || '#007AFF'
      fontSize.value = settings.fontSize || 'medium'
      fontFamily.value = settings.fontFamily || 'system'
      enableAnimations.value = settings.enableAnimations ?? true
      enableBlur.value = settings.enableBlur ?? true
      enableRoundedCorners.value = settings.enableRoundedCorners ?? true

      // 应用设置
      applyTheme(currentTheme.value)
      changePrimaryColor(currentPrimaryColor.value)
      applyFontSettings()
      applyEffects()
    }
  } catch (error) {
    console.error('加载外观设置失败:', error)
  }
}

// 监听设置变化
watch([fontSize, fontFamily], applyFontSettings)
watch([enableAnimations, enableBlur, enableRoundedCorners], applyEffects)

// 组件挂载时加载设置
onMounted(() => {
  loadSettings()
})
</script>

<style scoped lang="less">
.appearance-setting {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;

  .setting-header {
    margin-bottom: 32px;

    .setting-title {
      font-size: 28px;
      font-weight: 600;
      color: #1d1d1f;
      margin: 0 0 8px 0;
    }

    .setting-subtitle {
      font-size: 16px;
      color: #86868b;
      margin: 0;
    }
  }

  .setting-section {
    margin-bottom: 40px;

    .section-title {
      font-size: 20px;
      font-weight: 600;
      color: #1d1d1f;
      margin: 0 0 20px 0;
    }
  }

  // 主题选择卡片
  .theme-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;

    .theme-card {
      position: relative;
      border: 2px solid #e5e5e7;
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: all 0.3s ease;

      &:hover {
        border-color: #007aff;
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 122, 255, 0.15);
      }

      &.active {
        border-color: #007aff;
        background: #f0f8ff;

        .check-icon {
          position: absolute;
          top: 12px;
          right: 12px;
          color: #007aff;
          font-size: 20px;
        }
      }

      .theme-preview {
        width: 100%;
        height: 80px;
        border-radius: 8px;
        overflow: hidden;
        margin-bottom: 12px;
        border: 1px solid #e5e5e7;

        &.light {
          background: #ffffff;

          .preview-header {
            height: 20px;
            background: #f5f5f7;
            border-bottom: 1px solid #e5e5e7;
          }

          .preview-content {
            display: flex;
            height: calc(100% - 20px);

            .preview-sidebar {
              width: 30%;
              background: #f5f5f7;
              border-right: 1px solid #e5e5e7;
            }

            .preview-main {
              flex: 1;
              background: #ffffff;
            }
          }
        }

        &.dark {
          background: #1c1c1e;

          .preview-header {
            height: 20px;
            background: #2c2c2e;
            border-bottom: 1px solid #38383a;
          }

          .preview-content {
            display: flex;
            height: calc(100% - 20px);

            .preview-sidebar {
              width: 30%;
              background: #2c2c2e;
              border-right: 1px solid #38383a;
            }

            .preview-main {
              flex: 1;
              background: #1c1c1e;
            }
          }
        }

        &.auto {
          background: linear-gradient(45deg, #ffffff 50%, #1c1c1e 50%);

          .preview-header {
            height: 20px;
            background: linear-gradient(45deg, #f5f5f7 50%, #2c2c2e 50%);
          }

          .preview-content {
            display: flex;
            height: calc(100% - 20px);

            .preview-sidebar {
              width: 30%;
              background: linear-gradient(45deg, #f5f5f7 50%, #2c2c2e 50%);
            }

            .preview-main {
              flex: 1;
              background: linear-gradient(45deg, #ffffff 50%, #1c1c1e 50%);
            }
          }
        }
      }

      .theme-info {
        h4 {
          font-size: 16px;
          font-weight: 600;
          color: #1d1d1f;
          margin: 0 0 4px 0;
        }

        p {
          font-size: 14px;
          color: #86868b;
          margin: 0;
        }
      }
    }
  }

  // 颜色选择
  .color-options {
    .color-group {
      .color-label {
        display: block;
        font-size: 16px;
        font-weight: 500;
        color: #1d1d1f;
        margin-bottom: 12px;
      }

      .color-picker-group {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;

        .color-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border: 2px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;

          &:hover {
            background: #f5f5f7;
          }

          &.active {
            border-color: var(--primary-color, #007aff);
            background: #f0f8ff;
          }

          .color-circle {
            width: 32px;
            height: 32px;
            border-radius: 50%;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }

          .color-name {
            font-size: 12px;
            color: #86868b;
            text-align: center;
          }
        }
      }
    }
  }

  // 设置项
  .font-settings,
  .effect-settings {
    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 0;
      border-bottom: 1px solid #f5f5f7;

      &:last-child {
        border-bottom: none;
      }

      .setting-info {
        flex: 1;

        .setting-label {
          font-size: 16px;
          font-weight: 500;
          color: #1d1d1f;
          margin-bottom: 4px;
          display: block;
        }

        .setting-desc {
          font-size: 14px;
          color: #86868b;
          margin: 0;
        }
      }

      .setting-select {
        width: 120px;
      }
    }
  }

  // 操作按钮
  .action-section {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 24px;
    border-top: 1px solid #f5f5f7;
    margin-top: 32px;
  }
}

// 深色主题样式
:global(.dark-theme) {
  --color-background: #1c1c1e;
  --color-text: #ffffff;
  --ev-c-white-soft: #1c1c1e;
  --ev-c-black-soft: #2c2c2e;

  .appearance-setting {
    .setting-title,
    .section-title,
    .setting-label {
      color: #ffffff !important;
    }

    .setting-subtitle,
    .setting-desc {
      color: #98989d !important;
    }

    .theme-card {
      background: #2c2c2e;
      border-color: #38383a;

      &.active {
        background: #1a2332;
        border-color: #007aff;
      }

      .theme-info h4 {
        color: #ffffff;
      }

      .theme-info p {
        color: #98989d;
      }
    }

    .color-option {
      &:hover {
        background: #38383a;
      }

      &.active {
        background: #1a2332;
      }
    }

    .setting-item {
      border-color: #38383a;
    }

    .action-section {
      border-color: #38383a;
    }
  }
}
</style>
