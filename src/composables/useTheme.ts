import { ref } from 'vue'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'theme'
const theme = ref<Theme>('dark')
let initialized = false

const isBrowser = typeof window !== 'undefined'

const applyToDocument = (nextTheme: Theme) => {
  if (!isBrowser) {
    return
  }

  const root = document.documentElement
  root.classList.toggle('dark', nextTheme === 'dark')
  root.style.colorScheme = nextTheme
}

const persistTheme = (nextTheme: Theme) => {
  if (!isBrowser) {
    return
  }

  localStorage.setItem(STORAGE_KEY, nextTheme)
}

export const setTheme = (nextTheme: Theme, persist = true) => {
  theme.value = nextTheme
  applyToDocument(nextTheme)

  if (persist) {
    persistTheme(nextTheme)
  }
}

export const initTheme = () => {
  if (initialized) {
    return
  }

  initialized = true

  if (!isBrowser) {
    return
  }

  const stored = localStorage.getItem(STORAGE_KEY)
  const preferredTheme: Theme = stored === 'light' || stored === 'dark' ? stored : 'dark'

  setTheme(preferredTheme, false)

  if (!stored) {
    persistTheme(preferredTheme)
  }
}

export const useTheme = () => {
  initTheme()

  const toggleTheme = () => {
    setTheme(theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme,
    setTheme,
    toggleTheme
  }
}
