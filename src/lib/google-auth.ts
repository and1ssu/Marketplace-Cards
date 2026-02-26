interface GoogleCredentialResponse {
  credential?: string
}

interface GoogleIdConfiguration {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
}

interface GoogleAccountsId {
  initialize: (config: GoogleIdConfiguration) => void
  renderButton: (element: HTMLElement, options: Record<string, string | number>) => void
}

interface GoogleAccounts {
  id: GoogleAccountsId
}

interface GoogleGlobal {
  accounts: GoogleAccounts
}

declare global {
  interface Window {
    google?: GoogleGlobal
  }
}

export interface GoogleProfile {
  sub: string
  email: string
  name: string
}

const GOOGLE_SCRIPT_ID = 'google-identity-services'
const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let scriptPromise: Promise<void> | null = null

const decodeBase64Url = (value: string) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  return atob(`${normalized}${padding}`)
}

export const decodeGoogleCredential = (credential: string): GoogleProfile => {
  const parts = credential.split('.')

  if (parts.length !== 3) {
    throw new Error('google-invalid-credential')
  }

  try {
    const payloadRaw = decodeBase64Url(parts[1] ?? '')
    const payload = JSON.parse(payloadRaw) as Partial<GoogleProfile>

    if (!payload.sub || !payload.email) {
      throw new Error('google-invalid-credential')
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name?.trim() || payload.email.split('@')[0] || 'Usuario Google'
    }
  } catch {
    throw new Error('google-invalid-credential')
  }
}

export const loadGoogleIdentityScript = async () => {
  if (window.google?.accounts?.id) {
    return
  }

  if (scriptPromise) {
    return scriptPromise
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null

    if (existing) {
      existing.addEventListener(
        'load',
        () => resolve(),
        {
          once: true
        }
      )

      existing.addEventListener(
        'error',
        () => reject(new Error('google-script-load-failed')),
        {
          once: true
        }
      )

      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_SCRIPT_ID
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('google-script-load-failed'))
    document.head.appendChild(script)
  })

  return scriptPromise
}

export const mountGoogleSignInButton = async (
  element: HTMLElement,
  clientId: string,
  onCredential: (credential: string) => void
) => {
  await loadGoogleIdentityScript()

  if (!window.google?.accounts?.id) {
    throw new Error('google-api-unavailable')
  }

  element.innerHTML = ''

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (!response.credential) {
        return
      }

      onCredential(response.credential)
    }
  })

  window.google.accounts.id.renderButton(element, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'pill'
  })
}
