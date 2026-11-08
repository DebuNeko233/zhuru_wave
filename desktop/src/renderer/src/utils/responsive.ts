/**
 * 响应式字体大小管理工具
 */

interface ResponsiveConfig {
  minWidth: number
  maxWidth: number
  minFontSize: number
  maxFontSize: number
}

class ResponsiveFontManager {
  private config: ResponsiveConfig
  private resizeHandler: () => void
  private resizeTimer: number | null = null // 修复类型问题

  constructor(
    config: ResponsiveConfig = {
      minWidth: 320,
      maxWidth: 1920,
      minFontSize: 12,
      maxFontSize: 20
    }
  ) {
    this.config = config
    this.resizeHandler = this.handleResize.bind(this)
    this.init()
  }

  /**
   * 初始化响应式字体大小
   */
  private init(): void {
    this.setFontSize()
    window.addEventListener('resize', this.resizeHandler)
    window.addEventListener('orientationchange', this.resizeHandler)
  }

  /**
   * 处理窗口大小变化
   */
  private handleResize(): void {
    // 防抖处理
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer)
    }
    this.resizeTimer = window.setTimeout(() => {
      // 使用window.setTimeout
      this.setFontSize()
    }, 100)
  }

  /**
   * 设置字体大小
   */
  private setFontSize(): void {
    const screenWidth = window.innerWidth
    const { minWidth, maxWidth, minFontSize, maxFontSize } = this.config

    let fontSize: number

    if (screenWidth <= minWidth) {
      fontSize = minFontSize
    } else if (screenWidth >= maxWidth) {
      fontSize = maxFontSize
    } else {
      // 线性插值计算字体大小
      const ratio = (screenWidth - minWidth) / (maxWidth - minWidth)
      fontSize = minFontSize + (maxFontSize - minFontSize) * ratio
    }

    // 设置html根元素字体大小
    document.documentElement.style.fontSize = `${fontSize}px`

    // 触发自定义事件，通知字体大小变化
    window.dispatchEvent(
      new CustomEvent('fontSizeChanged', {
        detail: { fontSize, screenWidth }
      })
    )
  }

  /**
   * 获取当前字体大小
   */
  getCurrentFontSize(): number {
    const htmlFontSize = window.getComputedStyle(document.documentElement).fontSize
    return parseFloat(htmlFontSize)
  }

  /**
   * 手动设置字体大小
   */
  setManualFontSize(fontSize: number): void {
    document.documentElement.style.fontSize = `${fontSize}px`
  }

  /**
   * 重置为默认字体大小
   */
  reset(): void {
    this.setFontSize()
  }

  /**
   * 销毁监听器
   */
  destroy(): void {
    window.removeEventListener('resize', this.resizeHandler)
    window.removeEventListener('orientationchange', this.resizeHandler)
    if (this.resizeTimer) {
      clearTimeout(this.resizeTimer)
    }
  }

  /**
   * 获取rem转px的值
   */
  remToPx(rem: number): number {
    return rem * this.getCurrentFontSize()
  }

  /**
   * 获取px转rem的值
   */
  pxToRem(px: number): number {
    return px / this.getCurrentFontSize()
  }
}

// 创建全局实例
export const responsiveFontManager = new ResponsiveFontManager()

// 导出工具函数
export const remToPx = (rem: number): number => responsiveFontManager.remToPx(rem)
export const pxToRem = (px: number): number => responsiveFontManager.pxToRem(px)

// Vue组合式API
export function useResponsiveFont() {
  const getCurrentFontSize = () => responsiveFontManager.getCurrentFontSize()
  const setManualFontSize = (fontSize: number) => responsiveFontManager.setManualFontSize(fontSize)
  const reset = () => responsiveFontManager.reset()

  return {
    getCurrentFontSize,
    setManualFontSize,
    reset,
    remToPx,
    pxToRem
  }
}

export default ResponsiveFontManager
