import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface ThemeSettings {
  theme: 'light' | 'dark' | 'auto'
  primaryColor: string
  fontSize: 'small' | 'medium' | 'large'
  fontFamily: 'system' | 'apple' | 'microsoft'
  enableAnimations: boolean
  enableBlur: boolean
  enableRoundedCorners: boolean
}

const defaultSettings: ThemeSettings = {
  theme: 'light',
  primaryColor: '#007AFF',
  fontSize: 'medium',
  fontFamily: 'system',
  enableAnimations: true,
  enableBlur: true,
  enableRoundedCorners: true
}

export const useThemeStore = defineStore('theme', () => {
  const settings = ref<ThemeSettings>({ ...defaultSettings })

  // 应用主题
  const applyTheme = () => {
    const root = document.documentElement

    // 主题模式
    if (settings.value.theme === 'dark') {
      root.classList.add('dark-theme')
      root.classList.remove('light-theme')
    } else if (settings.value.theme === 'light') {
      root.classList.add('light-theme')
      root.classList.remove('dark-theme')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark-theme')
        root.classList.remove('light-theme')
      } else {
        root.classList.add('light-theme')
        root.classList.remove('dark-theme')
      }
    }

    // CSS变量
    root.style.setProperty('--primary-color', settings.value.primaryColor)
    root.style.setProperty('--font-color-primary', settings.value.primaryColor)

    // 字体设置
    const fontSizeMap = { small: '14px', medium: '16px', large: '18px' }
    root.style.setProperty('--base-font-size', fontSizeMap[settings.value.fontSize])

    const fontFamilyMap = {
      system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      apple: '-apple-system, BlinkMacSystemFont, sans-serif',
      microsoft: '"Microsoft YaHei", "微软雅黑", sans-serif'
    }
    root.style.setProperty('--base-font-family', fontFamilyMap[settings.value.fontFamily])

    // 效果设置
    root.style.setProperty('--enable-animations', settings.value.enableAnimations ? '1' : '0')
    root.style.setProperty('--enable-blur', settings.value.enableBlur ? 'blur(10px)' : 'none')
    root.style.setProperty('--border-radius', settings.value.enableRoundedCorners ? '8px' : '4px')
  }

  // 更新设置
  const updateSettings = (newSettings: Partial<ThemeSettings>) => {
    Object.assign(settings.value, newSettings)
    applyTheme()
    saveSettings()
  }

  // 保存设置
  const saveSettings = () => {
    localStorage.setItem('themeSettings', JSON.stringify(settings.value))
  }

  // 加载设置
  const loadSettings = () => {
    try {
      const saved = localStorage.getItem('themeSettings')
      if (saved) {
        const parsed = JSON.parse(saved)
        Object.assign(settings.value, parsed)
      }
    } catch (error) {
      console.error('加载主题设置失败:', error)
    }
    applyTheme()
  }

  // 重置设置
  const resetSettings = () => {
    Object.assign(settings.value, defaultSettings)
    applyTheme()
    saveSettings()
  }

  // 监听系统主题变化
  const setupSystemThemeListener = () => {
    if (settings.value.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      mediaQuery.addEventListener('change', applyTheme)
      return () => mediaQuery.removeEventListener('change', applyTheme)
    }
    return ''
  }

  return {
    settings,
    applyTheme,
    updateSettings,
    loadSettings,
    resetSettings,
    setupSystemThemeListener
  }
})
