export type TradeCardType = 'OFFERING' | 'RECEIVING'

export interface UserProfile {
  id: string
  name: string
  email: string
}

export interface Card {
  id: string
  name: string
  description: string
  imageUrl: string
  createdAt: string
}

export interface TradeCard {
  id: string
  cardId: string
  tradeId: string
  type: TradeCardType
  card: Card
}

export interface Trade {
  id: string
  userId: string
  createdAt: string
  user: {
    name: string
  }
  tradeCards: TradeCard[]
}

export interface PaginatedResponse<T> {
  list: T[]
  rpp: number
  page: number
  more: boolean
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
}

export interface RegisterResponse {
  userId: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  user: UserProfile
}

export interface MeResponse extends UserProfile {
  cards: Card[]
}

export interface AddMyCardsPayload {
  cardIds: string[]
}

export interface CreateTradeCardPayload {
  cardId: string
  type: TradeCardType
}

export interface CreateTradePayload {
  cards: CreateTradeCardPayload[]
}

export interface CreateTradeResponse {
  tradeId: string
}
