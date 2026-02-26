const DEFAULT_ERROR_MESSAGE = 'Nao foi possivel concluir a requisicao.'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  token?: string
  signal?: AbortSignal
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const request = async <T>(
  baseUrl: string,
  path: string,
  config: RequestConfig = {}
): Promise<T> => {
  const { method = 'GET', body, token, signal } = config

  let response: Response

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: body ? JSON.stringify(body) : undefined,
      signal
    })
  } catch {
    throw new ApiError('Falha de conexao com o servidor.', 0)
  }

  const text = await response.text()
  let parsed: unknown

  if (text) {
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      parsed = text
    }
  }

  if (!response.ok) {
    let message = DEFAULT_ERROR_MESSAGE

    if (isObject(parsed)) {
      const candidate = parsed.message ?? parsed.error
      if (typeof candidate === 'string' && candidate.trim()) {
        message = candidate
      }
    } else if (typeof parsed === 'string' && parsed.trim()) {
      message = parsed
    }

    throw new ApiError(message, response.status)
  }

  return parsed as T
}
