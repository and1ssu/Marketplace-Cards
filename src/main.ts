import { createPinia } from 'pinia'
import { createApp } from 'vue'
import App from './App.vue'
import { registerAppContext } from '@/context/app-context'
import { API_BASE_URL } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import router from '@/router'
import './style.css'

const bootstrap = async () => {
  const app = createApp(App)
  const pinia = createPinia()

  app.use(pinia)
  registerAppContext(app, API_BASE_URL)
  app.use(router)

  const authStore = useAuthStore(pinia)
  await authStore.hydrate()

  app.mount('#app')
}

bootstrap()
