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

const catalogCacheKey = (page: number, rpp: number) => `${rpp}:${page}`
const newCardsStorageKey = (userId: string) => `marketplace-new-cards:${userId}`
const uniqueIds = (ids: string[]) => Array.from(new Set(ids))

interface CardsState {
  catalogPages: Record<string, PaginatedResponse<Card>>
  myCards: Card[]
  newCardIds: string[]
  newCardsOwnerId: string | null
  catalogLoading: boolean
  myCardsLoading: boolean
  error: string | null
}

export const useCardsStore = defineStore('cards', {
  state: (): CardsState => ({
    catalogPages: {},
    myCards: [],
    newCardIds: [],
    newCardsOwnerId: null,
    catalogLoading: false,
    myCardsLoading: false,
    error: null
  }),
  getters: {
    getCatalogPage: (state) => (page: number, rpp: number) => state.catalogPages[catalogCacheKey(page, rpp)],
    isNewCard: (state) => (cardId: string) => state.newCardIds.includes(cardId)
  },
  actions: {
    ensureNewCardsState(userId: string | null) {
      if (!userId) {
        this.newCardsOwnerId = null
        this.newCardIds = []
        return
      }

      if (this.newCardsOwnerId === userId) {
        return
      }

      this.newCardsOwnerId = userId

      try {
        const raw = localStorage.getItem(newCardsStorageKey(userId))
        const parsed = raw ? (JSON.parse(raw) as unknown) : []

        if (!Array.isArray(parsed)) {
          this.newCardIds = []
          return
        }

        this.newCardIds = parsed.filter((value): value is string => typeof value === 'string')
      } catch {
        this.newCardIds = []
      }
    },
    persistNewCards() {
      if (!this.newCardsOwnerId) {
        return
      }

      try {
        localStorage.setItem(newCardsStorageKey(this.newCardsOwnerId), JSON.stringify(this.newCardIds))
      } catch {
        return
      }
    },
    syncNewCardsWithInventory() {
      const inventoryIds = new Set(this.myCards.map((card) => card.id))
      this.newCardIds = this.newCardIds.filter((cardId) => inventoryIds.has(cardId))
      this.persistNewCards()
    },
    markCardsAsNew(cardIds: string[]) {
      this.newCardIds = uniqueIds([...this.newCardIds, ...cardIds])
      this.syncNewCardsWithInventory()
    },
    async fetchCatalog(page = 1, rpp = 12, force = false) {
      const key = catalogCacheKey(page, rpp)

      if (!force && this.catalogPages[key]) {
        return this.catalogPages[key]
      }

      this.catalogLoading = true
      this.error = null

      try {
        const data = await getCards(page, rpp)
        this.catalogPages[key] = data
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

      this.ensureNewCardsState(auth.user?.id ?? null)
      this.myCardsLoading = true
      this.error = null

      try {
        const data = await getMyCards(auth.token)
        this.myCards = data
        this.syncNewCardsWithInventory()
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

      this.ensureNewCardsState(auth.user?.id ?? null)
      this.error = null

      try {
        await addCardsToMyAccount(auth.token, { cardIds })
        await this.fetchMyCards(true)
        this.markCardsAsNew(cardIds)
      } catch (error) {
        this.error = getErrorMessage(error)
        throw error
      }
    }
  }
})
