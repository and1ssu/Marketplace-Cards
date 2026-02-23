import type { App, InjectionKey, Ref } from 'vue'
import { inject, ref } from 'vue'

export type ToastTone = 'success' | 'error' | 'info'

export interface AppToast {
  id: string
  title: string
  tone: ToastTone
}

export interface AppContextValue {
  apiBaseUrl: string
  toasts: Ref<AppToast[]>
  notify: (title: string, tone?: ToastTone) => void
  removeToast: (id: string) => void
}

const AppContextKey: InjectionKey<AppContextValue> = Symbol('app-context')
let fallbackContext: AppContextValue | null = null

const randomId = () => Math.random().toString(36).slice(2)

export const createAppContext = (apiBaseUrl: string): AppContextValue => {
  const toasts = ref<AppToast[]>([])

  const removeToast = (id: string) => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id)
  }

  const notify = (title: string, tone: ToastTone = 'info') => {
    const id = randomId()
    toasts.value = [...toasts.value, { id, title, tone }]

    window.setTimeout(() => {
      removeToast(id)
    }, 3500)
  }

  return {
    apiBaseUrl,
    toasts,
    notify,
    removeToast
  }
}

export const registerAppContext = (app: App, apiBaseUrl: string) => {
  const context = createAppContext(apiBaseUrl)
  fallbackContext = context
  app.provide(AppContextKey, context)
}

export const useAppContext = () => {
  const context = inject(AppContextKey, fallbackContext)

  if (!context) {
    throw new Error('App context nao inicializado.')
  }

  return context
}
