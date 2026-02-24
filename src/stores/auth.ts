import { defineStore } from 'pinia'
import { getMe, loginUser, registerUser } from '@/services/api'
import { ApiError } from '@/services/http'
import type { LoginPayload, RegisterPayload, UserProfile } from '@/types/marketplace'

const TOKEN_KEY = 'marketplace-token'

const translateRegisterApiMessage = (message: string, status: number) => {
  const normalized = message.toLowerCase()

  if (
    normalized.includes('email already') ||
    normalized.includes('already exists') ||
    normalized.includes('user already') ||
    normalized.includes('duplicate') ||
    normalized.includes('unique constraint')
  ) {
    return 'Este e-mail já está cadastrado.'
  }

  if (normalized.includes('email')) {
    return 'E-mail inválido.'
  }

  if (normalized.includes('password')) {
    return 'Senha inválida.'
  }

  if (status === 401) {
    return 'E-mail ou senha inválidos.'
  }

  if (status === 409) {
    return 'Este e-mail já está cadastrado.'
  }

  return message
}

const getRegisterErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return translateRegisterApiMessage(error.message, error.status)
  }

  return 'Ocorreu um erro inesperado.'
}

const getLoginErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    const normalized = error.message.toLowerCase()

    if (
      error.status === 400 ||
      error.status === 401 ||
      error.status === 403 ||
      normalized.includes('invalid email') ||
      normalized.includes('invalid password') ||
      normalized.includes('invalid credentials') ||
      normalized.includes('wrong password') ||
      normalized.includes('unauthorized') ||
      normalized.includes('bad credentials') ||
      normalized.includes('user not found') ||
      normalized.includes('email or password') ||
      normalized.includes('email')
    ) {
      return 'E-mail ou senha inválidos.'
    }

    if (error.status >= 500) {
      return 'Erro no servidor. Tente novamente em instantes.'
    }

    return 'Não foi possível entrar. Tente novamente.'
  }

  return 'Ocorreu um erro inesperado.'
}

interface AuthState {
  token: string | null
  user: UserProfile | null
  loading: boolean
  error: string | null
  hydrated: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    token: null,
    user: null,
    loading: false,
    error: null,
    hydrated: false
  }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user)
  },
  actions: {
    setToken(token: string | null) {
      this.token = token

      if (!token) {
        localStorage.removeItem(TOKEN_KEY)
        return
      }

      localStorage.setItem(TOKEN_KEY, token)
    },
    async hydrate() {
      if (this.hydrated) {
        return
      }

      const storedToken = localStorage.getItem(TOKEN_KEY)

      if (!storedToken) {
        this.hydrated = true
        return
      }

      this.token = storedToken

      try {
        const me = await getMe(storedToken)
        this.user = {
          id: me.id,
          name: me.name,
          email: me.email
        }
      } catch {
        this.setToken(null)
        this.user = null
      } finally {
        this.hydrated = true
      }
    },
    async register(payload: RegisterPayload) {
      this.loading = true
      this.error = null

      try {
        await registerUser(payload)
      } catch (error) {
        this.error = getRegisterErrorMessage(error)
        throw error
      } finally {
        this.loading = false
      }
    },
    async login(payload: LoginPayload) {
      this.loading = true
      this.error = null

      try {
        const response = await loginUser(payload)
        this.setToken(response.token)
        this.user = response.user
      } catch (error) {
        this.error = getLoginErrorMessage(error)
        throw error
      } finally {
        this.loading = false
      }
    },
    async refreshMe() {
      if (!this.token) {
        return
      }

      this.loading = true
      this.error = null

      try {
        const me = await getMe(this.token)
        this.user = {
          id: me.id,
          name: me.name,
          email: me.email
        }
      } catch (error) {
        this.error = getRegisterErrorMessage(error)
        throw error
      } finally {
        this.loading = false
      }
    },
    logout() {
      this.setToken(null)
      this.user = null
      this.error = null
    }
  }
})
