import type {
  AddMyCardsPayload,
  Card,
  CreateTradePayload,
  CreateTradeResponse,
  LoginPayload,
  LoginResponse,
  MeResponse,
  PaginatedResponse,
  RegisterPayload,
  RegisterResponse,
  Trade
} from '@/types/marketplace'
import { request } from './http'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://cards-marketplace-api.onrender.com'

export const registerUser = (payload: RegisterPayload) =>
  request<RegisterResponse>(API_BASE_URL, '/register', {
    method: 'POST',
    body: payload
  })

export const loginUser = (payload: LoginPayload) =>
  request<LoginResponse>(API_BASE_URL, '/login', {
    method: 'POST',
    body: payload
  })

export const getMe = (token: string) =>
  request<MeResponse>(API_BASE_URL, '/me', {
    token
  })

export const getCards = (page = 1, rpp = 12) =>
  request<PaginatedResponse<Card>>(API_BASE_URL, `/cards?page=${page}&rpp=${rpp}`)

export const getMyCards = (token: string) =>
  request<Card[]>(API_BASE_URL, '/me/cards', {
    token
  })

export const addCardsToMyAccount = (token: string, payload: AddMyCardsPayload) =>
  request<void>(API_BASE_URL, '/me/cards', {
    method: 'POST',
    token,
    body: payload
  })

export const getTrades = (page = 1, rpp = 10) =>
  request<PaginatedResponse<Trade>>(API_BASE_URL, `/trades?page=${page}&rpp=${rpp}`)

export const createTrade = (token: string, payload: CreateTradePayload) =>
  request<CreateTradeResponse>(API_BASE_URL, '/trades', {
    method: 'POST',
    token,
    body: payload
  })

export const deleteTrade = (token: string, tradeId: string) =>
  request<void>(API_BASE_URL, `/trades/${tradeId}`, {
    method: 'DELETE',
    token
  })
