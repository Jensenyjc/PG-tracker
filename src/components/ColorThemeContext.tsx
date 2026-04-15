/**
 * @Project: PG-Tracker
 * @File: ColorThemeContext.tsx
 * @Description: 颜色主题上下文，提供多种颜色主题选择（默认蓝、温暖橙、自然绿、玫瑰粉、紫罗兰、海洋青、石板灰）
 * @Author: 杨敬诚
 * @Date: 2026-04-15
 * Copyright (c) 2026. All rights reserved.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type ColorTheme = 'default' | 'warm' | 'nature' | 'rose' | 'violet' | 'ocean' | 'slate'

export interface ColorThemeInfo {
  id: ColorTheme
  name: string
  color: string // 代表颜色的 HSL 值用于显示
  description: string
}

export const colorThemes: ColorThemeInfo[] = [
  { id: 'default', name: '默认蓝', color: 'hsl(221, 83%, 53%)', description: '经典的蓝色主题' },
  { id: 'warm', name: 'Claude橙', color: '#D97757', description: 'Claude 同款温暖橙色' },
  { id: 'nature', name: '自然绿', color: 'hsl(142, 70%, 45%)', description: '清新的自然绿色' },
  { id: 'rose', name: '玫瑰粉', color: 'hsl(340, 80%, 55%)', description: '柔和的玫瑰粉色' },
  { id: 'violet', name: 'VSCode紫', color: '#C586C0', description: 'VS Code 同款紫色' },
  { id: 'ocean', name: '海洋青', color: 'hsl(190, 80%, 50%)', description: '深邃的海洋青色' },
  { id: 'slate', name: '石板灰', color: 'hsl(210, 30%, 50%)', description: '简约的石板灰色' }
]

interface ColorThemeContextType {
  colorTheme: ColorTheme
  setColorTheme: (theme: ColorTheme) => void
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined)

const STORAGE_KEY = 'pg-tracker-color-theme'

interface ColorThemeProviderProps {
  children: ReactNode
}

export function ColorThemeProvider({ children }: ColorThemeProviderProps): JSX.Element {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    // 从 localStorage 读取保存的颜色主题
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY) as ColorTheme
      if (saved && colorThemes.some(t => t.id === saved)) {
        return saved
      }
    }
    return 'default'
  })

  // 当颜色主题改变时，更新 DOM 和 localStorage
  useEffect(() => {
    const root = document.documentElement

    // 设置 data-theme 属性
    if (colorTheme === 'default') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', colorTheme)
    }

    // 保存到 localStorage
    localStorage.setItem(STORAGE_KEY, colorTheme)
  }, [colorTheme])

  // 初始化时应用保存的主题
  useEffect(() => {
    const root = document.documentElement
    if (colorTheme !== 'default') {
      root.setAttribute('data-theme', colorTheme)
    }
  }, [])

  const setColorTheme = (theme: ColorTheme): void => {
    setColorThemeState(theme)
  }

  return (
    <ColorThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ColorThemeContext.Provider>
  )
}

export function useColorTheme(): ColorThemeContextType {
  const context = useContext(ColorThemeContext)
  if (!context) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider')
  }
  return context
}