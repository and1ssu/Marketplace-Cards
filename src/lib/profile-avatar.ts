const avatarStorageKey = (userId: string) => `marketplace-profile-avatar:${userId}`
export const PROFILE_AVATAR_UPDATED_EVENT = 'profile-avatar-updated'

export const getStoredAvatar = (userId: string) => {
  try {
    return localStorage.getItem(avatarStorageKey(userId))
  } catch {
    return null
  }
}

export const setStoredAvatar = (userId: string, avatarDataUrl: string) => {
  try {
    localStorage.setItem(avatarStorageKey(userId), avatarDataUrl)
    window.dispatchEvent(new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, { detail: { userId } }))
    return true
  } catch {
    return false
  }
}

export const removeStoredAvatar = (userId: string) => {
  try {
    localStorage.removeItem(avatarStorageKey(userId))
    window.dispatchEvent(new CustomEvent(PROFILE_AVATAR_UPDATED_EVENT, { detail: { userId } }))
    return true
  } catch {
    return false
  }
}
