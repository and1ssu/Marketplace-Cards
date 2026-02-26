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
const myCardsStorageKey = (userId: string) => `marketplace-my-cards-cache:${userId}`
const uniqueIds = (ids: string[]) => Array.from(new Set(ids))
const CATALOG_CACHE_STORAGE_KEY = 'marketplace-catalog-cache:v1'
const CATALOG_CACHE_TTL_MS = 12 * 60 * 60 * 1000
const MY_CARDS_CACHE_TTL_MS = 5 * 60 * 1000

interface CatalogCacheEntry {
  data: PaginatedResponse<Card>
  expiresAt: number
}

type PersistedCatalogCache = Record<string, CatalogCacheEntry>

interface MyCardsCachePayload {
  data: Card[]
  expiresAt: number
}

const readPersistedCatalogCache = (): PersistedCatalogCache => {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_STORAGE_KEY)

    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return parsed as PersistedCatalogCache
  } catch {
    return {}
  }
}

const writePersistedCatalogCache = (cache: PersistedCatalogCache) => {
  try {
    localStorage.setItem(CATALOG_CACHE_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    return
  }
}

const getCatalogCacheFromStorage = (key: string) => {
  const persisted = readPersistedCatalogCache()
  const entry = persisted[key]

  if (!entry) {
    return null
  }

  if (Date.now() > entry.expiresAt) {
    delete persisted[key]
    writePersistedCatalogCache(persisted)
    return null
  }

  return entry.data
}

const setCatalogCacheToStorage = (key: string, data: PaginatedResponse<Card>) => {
  const persisted = readPersistedCatalogCache()
  persisted[key] = {
    data,
    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS
  }
  writePersistedCatalogCache(persisted)
}

const getMyCardsFromStorage = (userId: string) => {
  try {
    const raw = localStorage.getItem(myCardsStorageKey(userId))

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as MyCardsCachePayload

    if (!Array.isArray(parsed?.data) || typeof parsed.expiresAt !== 'number') {
      return null
    }

    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(myCardsStorageKey(userId))
      return null
    }

    return parsed.data
  } catch {
    return null
  }
}

const setMyCardsToStorage = (userId: string, cards: Card[]) => {
  try {
    const payload: MyCardsCachePayload = {
      data: cards,
      expiresAt: Date.now() + MY_CARDS_CACHE_TTL_MS
    }

    localStorage.setItem(myCardsStorageKey(userId), JSON.stringify(payload))
  } catch {
    return
  }
}

interface CardsState {
  catalogPages: Record<string, PaginatedResponse<Card>>
  myCards: Card[]
  newCardIds: string[]
  newCardsOwnerId: string | null
  loadedMyCardsOwnerId: string | null
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
    loadedMyCardsOwnerId: null,
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
        this.loadedMyCardsOwnerId = null
        this.myCards = []
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

      if (!force) {
        const cached = getCatalogCacheFromStorage(key)

        if (cached) {
          this.catalogPages[key] = cached
          return cached
        }
      }

      this.catalogLoading = true
      this.error = null

      try {
        const data = await getCards(page, rpp)
        this.catalogPages[key] = data
        setCatalogCacheToStorage(key, data)
        return data
      } catch (error) {
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.catalogLoading = false
      }
    },
    async fetchMyCards(force = false) {
      const auth = useAuthStore()
      if (!auth.token) {
        throw new Error('Usuario nao autenticado.')
      }

      const userId = auth.user?.id ?? null
      this.ensureNewCardsState(userId)

      if (!userId) {
        throw new Error('Usuario nao autenticado.')
      }

      if (this.loadedMyCardsOwnerId !== userId) {
        this.myCards = []
        this.loadedMyCardsOwnerId = null
      }

      if (!force && this.myCards.length > 0) {
        return this.myCards
      }

      if (!force) {
        const cached = getMyCardsFromStorage(userId)

        if (cached) {
          this.myCards = cached
          this.loadedMyCardsOwnerId = userId
          this.syncNewCardsWithInventory()
          return cached
        }
      }

      this.myCardsLoading = true
      this.error = null

      try {
        const data = await getMyCards(auth.token)
        this.myCards = data
        this.loadedMyCardsOwnerId = userId
        setMyCardsToStorage(userId, data)
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
