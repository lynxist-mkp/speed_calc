import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getSetting, setSetting } from '@/db/index'
import type { KeyboardLayout } from '@/utils/keymap'

export interface BasicSettings {
  keyboardLayout: 'normal' | 'reverse' | 'shuffle'
  selectedType: number
  countMode: 'quick' | 'normal' | 'custom'
  count: number
  nback: 0 | 1 | 2
}

export interface DASettings {
  selectedFillType: number
  selectedCompareType: number
  count: number
  difficulty: 'easy' | 'normal' | 'hard'
  displayMode: 'chart' | 'formula'
  nback: 0 | 1 | 2
}

// 全局设置：物理键盘布局（影响键盘映射）
export interface GlobalSettings {
  keyboardInputLayout: KeyboardLayout
}

const DEFAULT_BASIC: BasicSettings = {
  keyboardLayout: 'normal',
  selectedType: 0,
  countMode: 'quick',
  count: 10,
  nback: 0,
}

const DEFAULT_DA: DASettings = {
  selectedFillType: 0,
  selectedCompareType: 0,
  count: 10,
  difficulty: 'normal',
  displayMode: 'chart',
  nback: 0,
}

const DEFAULT_GLOBAL: GlobalSettings = {
  keyboardInputLayout: 'qwerty',
}

const BASIC_KEYS: Record<keyof BasicSettings, string> = {
  keyboardLayout: 'basic.keyboardLayout',
  selectedType: 'basic.selectedType',
  countMode: 'basic.countMode',
  count: 'basic.count',
  nback: 'basic.nback',
}

const DA_KEYS: Record<keyof DASettings, string> = {
  selectedFillType: 'da.selectedFillType',
  selectedCompareType: 'da.selectedCompareType',
  count: 'da.count',
  difficulty: 'da.difficulty',
  displayMode: 'da.displayMode',
  nback: 'da.nback',
}

const GLOBAL_KEYS: Record<keyof GlobalSettings, string> = {
  keyboardInputLayout: 'global.keyboardInputLayout',
}

function parseValue<T>(raw: string | null, defaultValue: T): T {
  if (raw === null) return defaultValue
  try {
    return JSON.parse(raw) as T
  } catch {
    return defaultValue
  }
}

export const useSettingsStore = defineStore('settings', () => {
  const basic = ref<BasicSettings>({ ...DEFAULT_BASIC })
  const dataAnalysis = ref<DASettings>({ ...DEFAULT_DA })
  const global = ref<GlobalSettings>({ ...DEFAULT_GLOBAL })
  const loaded = ref(false)

  async function load(): Promise<void> {
    for (const k of Object.keys(BASIC_KEYS) as (keyof BasicSettings)[]) {
      const raw = await getSetting(BASIC_KEYS[k])
      ;(basic.value as Record<keyof BasicSettings, unknown>)[k] = parseValue(raw, DEFAULT_BASIC[k])
    }
    for (const k of Object.keys(DA_KEYS) as (keyof DASettings)[]) {
      const raw = await getSetting(DA_KEYS[k])
      ;(dataAnalysis.value as Record<keyof DASettings, unknown>)[k] = parseValue(raw, DEFAULT_DA[k])
    }
    for (const k of Object.keys(GLOBAL_KEYS) as (keyof GlobalSettings)[]) {
      const raw = await getSetting(GLOBAL_KEYS[k])
      ;(global.value as Record<keyof GlobalSettings, unknown>)[k] = parseValue(
        raw,
        DEFAULT_GLOBAL[k],
      )
    }
    loaded.value = true
  }

  async function saveBasic(patch: Partial<BasicSettings>): Promise<void> {
    for (const k of Object.keys(patch) as (keyof BasicSettings)[]) {
      const value = patch[k]!
      ;(basic.value as Record<keyof BasicSettings, unknown>)[k] = value
      await setSetting(BASIC_KEYS[k], JSON.stringify(value))
    }
  }

  async function saveDataAnalysis(patch: Partial<DASettings>): Promise<void> {
    for (const k of Object.keys(patch) as (keyof DASettings)[]) {
      const value = patch[k]!
      ;(dataAnalysis.value as Record<keyof DASettings, unknown>)[k] = value
      await setSetting(DA_KEYS[k], JSON.stringify(value))
    }
  }

  async function saveGlobal(patch: Partial<GlobalSettings>): Promise<void> {
    for (const k of Object.keys(patch) as (keyof GlobalSettings)[]) {
      const value = patch[k]!
      ;(global.value as Record<keyof GlobalSettings, unknown>)[k] = value
      await setSetting(GLOBAL_KEYS[k], JSON.stringify(value))
    }
  }

  return { basic, dataAnalysis, global, loaded, load, saveBasic, saveDataAnalysis, saveGlobal }
})
