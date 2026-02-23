import { defineStore } from 'pinia'
import { createTrade, deleteTrade, getTrades } from '@/services/api'
import { ApiError } from '@/services/http'
import type { CreateTradePayload, PaginatedResponse, Trade } from '@/types/marketplace'
import { useAuthStore } from './auth'

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Ocorreu um erro inesperado.'
}

interface TradesState {
  pages: Record<number, PaginatedResponse<Trade>>
  loading: boolean
  actionLoading: boolean
  error: string | null
}

export const useTradesStore = defineStore('trades', {
  state: (): TradesState => ({
    pages: {},
    loading: false,
    actionLoading: false,
    error: null
  }),
  actions: {
    async fetchTrades(page = 1, rpp = 10, force = false) {
      if (!force && this.pages[page]) {
        return this.pages[page]
      }

      this.loading = true
      this.error = null

      try {
        const data = await getTrades(page, rpp)
        this.pages[page] = data
        return data
      } catch (error) {
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.loading = false
      }
    },
    async createTrade(payload: CreateTradePayload) {
      const auth = useAuthStore()
      if (!auth.token) {
        throw new Error('Usuario nao autenticado.')
      }

      this.actionLoading = true
      this.error = null

      try {
        const response = await createTrade(auth.token, payload)
        this.pages = {}
        return response
      } catch (error) {
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.actionLoading = false
      }
    },
    async deleteTrade(tradeId: string) {
      const auth = useAuthStore()
      if (!auth.token) {
        throw new Error('Usuario nao autenticado.')
      }

      this.actionLoading = true
      this.error = null

      try {
        await deleteTrade(auth.token, tradeId)

        Object.entries(this.pages).forEach(([pageKey, page]) => {
          const pageNumber = Number(pageKey)
          this.pages[pageNumber] = {
            ...page,
            list: page.list.filter((trade) => trade.id !== tradeId)
          }
        })
      } catch (error) {
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.actionLoading = false
      }
    }
  }
})
