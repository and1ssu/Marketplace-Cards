import { defineStore } from 'pinia'
import { addCardsToMyAccount, getCards, getMyCards } from '@/services/api'
import { ApiError } from '@/services/http'
import { useAuthStore } from './auth'
import type { Card, PaginatedResponse } from '@/types/marketplace'

const getErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'Ocorreu um erro inesperado.'
}

interface CardsState {
  catalogPages: Record<number, PaginatedResponse<Card>>
  myCards: Card[]
  catalogLoading: boolean
  myCardsLoading: boolean
  error: string | null
}

export const useCardsStore = defineStore('cards', {
  state: (): CardsState => ({
    catalogPages: {},
    myCards: [],
    catalogLoading: false,
    myCardsLoading: false,
    error: null
  }),
  actions: {
    async fetchCatalog(page = 1, rpp = 12, force = false) {
      if (!force && this.catalogPages[page]) {
        return this.catalogPages[page]
      }

      this.catalogLoading = true
      this.error = null

      try {
        const data = await getCards(page, rpp)
        this.catalogPages[page] = data
        return data
      } catch (error) {
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.catalogLoading = false
      }
    },
    async fetchMyCards(force = false) {
      if (!force && this.myCards.length > 0) {
        return this.myCards
      }

      const auth = useAuthStore()
      if (!auth.token) {
        throw new Error('Usuario nao autenticado.')
      }

      this.myCardsLoading = true
      this.error = null

      try {
        const data = await getMyCards(auth.token)
        this.myCards = data
        return data
      } catch (error) {
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.myCardsLoading = false
      }
    },
    async addCards(cardIds: string[]) {
      const auth = useAuthStore()
      if (!auth.token) {
        throw new Error('Usuario nao autenticado.')
      }

      this.error = null

      try {
        await addCardsToMyAccount(auth.token, { cardIds })
        await this.fetchMyCards(true)
      } catch (error) {
        this.error = getErrorMessage(error)
        throw error
      }
    }
  }
})
