<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import ThemeToggle from '@/components/app/ThemeToggle.vue'
import { useAppContext } from '@/context/app-context'
import { PROFILE_AVATAR_UPDATED_EVENT, getStoredAvatar } from '@/lib/profile-avatar'
import { getTrades } from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useCardsStore } from '@/stores/cards'
import { useTradesStore } from '@/stores/trades'

interface SidebarItem {
  label: string
  to: RouteLocationRaw
  badge?: string
}

interface SidebarSection {
  title: string
  items: SidebarItem[]
}

const authStore = useAuthStore()
const cardsStore = useCardsStore()
const tradesStore = useTradesStore()
const router = useRouter()
const route = useRoute()
const appContext = useAppContext()
const sidebarAvatarUrl = ref<string | null>(null)
const openTradesTotalCount = ref<number | null>(null)
const openTradesCountLoading = ref(false)
const BADGE_COUNT_RPP = 999

const formatBadgeCount = (count: number) => (count > 99 ? '99+' : String(count))

const toasts = computed(() => appContext.toasts.value)
const openTradesBadge = computed(() => {
  if (openTradesCountLoading.value && openTradesTotalCount.value === null) {
    return '...'
  }

  return formatBadgeCount(openTradesTotalCount.value ?? 0)
})

const myCardsBadge = computed(() => {
  if (!authStore.isAuthenticated) {
    return undefined
  }

  if (cardsStore.myCardsLoading && cardsStore.myCards.length === 0) {
    return '...'
  }

  return formatBadgeCount(cardsStore.myCards.length)
})

const guestSections = computed<SidebarSection[]>(() => [
  {
    title: 'Marketplace',
    items: [{ label: 'Trocas abertas', to: '/', badge: openTradesBadge.value }]
  },
  {
    title: 'Acesso',
    items: [
      { label: 'Entrar', to: '/login' },
      { label: 'Criar conta', to: '/register' }
    ]
  }
])

const authSections = computed<SidebarSection[]>(() => [
  {
    title: 'Marketplace',
    items: [{ label: 'Trocas abertas', to: '/', badge: openTradesBadge.value }]
  },
  {
    title: 'Coleção',
    items: [
      { label: 'Minhas cartas', to: { path: '/dashboard', query: { tab: 'inventory' } }, badge: myCardsBadge.value },
      { label: 'Adicionar cartas', to: { path: '/dashboard', query: { tab: 'catalog' } } }
    ]
  },
  {
    title: 'Trocas',
    items: [
      { label: 'Criar solicitação', to: { path: '/dashboard', query: { tab: 'trade' } } },
      { label: 'Minhas solicitações', to: { path: '/dashboard', query: { tab: 'my-trades' } } }
    ]
  },
  {
    title: 'Conta',
    items: [{ label: 'Meu perfil', to: '/profile' }]
  }
])

const sidebarSections = computed(() => (authStore.isAuthenticated ? authSections.value : guestSections.value))

const topNavItems = computed<SidebarItem[]>(() => {
  return sidebarSections.value.flatMap((section) => section.items)
})

const sidebarUserInitial = computed(() => authStore.user?.name?.trim().charAt(0).toUpperCase() || 'U')

const syncSidebarAvatar = () => {
  if (!authStore.user?.id) {
    sidebarAvatarUrl.value = null
    return
  }

  sidebarAvatarUrl.value = getStoredAvatar(authStore.user.id)
}

const onProfileAvatarUpdated = (event: Event) => {
  const customEvent = event as CustomEvent<{ userId?: string }>

  if (!authStore.user?.id) {
    return
  }

  if (customEvent.detail?.userId && customEvent.detail.userId !== authStore.user.id) {
    return
  }

  syncSidebarAvatar()
}

const fetchOpenTradesTotalCount = async () => {
  openTradesCountLoading.value = true

  try {
    const response = await getTrades(1, BADGE_COUNT_RPP)
    openTradesTotalCount.value = response.list.length
  } catch {
    openTradesTotalCount.value = 0
  } finally {
    openTradesCountLoading.value = false
  }
}

const syncSidebarBadges = async () => {
  const actions: Promise<unknown>[] = [fetchOpenTradesTotalCount()]

  if (authStore.isAuthenticated) {
    actions.push(cardsStore.fetchMyCards(true))
  }

  await Promise.all(
    actions.map((action) =>
      action.catch(() => {
        return null
      })
    )
  )
}

const logout = async () => {
  authStore.logout()
  sidebarAvatarUrl.value = null
  appContext.notify('Sessao finalizada.', 'info')
  await router.push('/')
}

const toastToneClass = (tone: 'success' | 'error' | 'info') => {
  if (tone === 'success') {
    return 'border-success/30 bg-success/10 text-success'
  }

  if (tone === 'error') {
    return 'border-destructive/30 bg-destructive/10 text-destructive'
  }

  return 'border-ygo-primary/30 bg-ygo-primary/10 text-ygo-primary'
}

const isItemActive = (item: SidebarItem) => {
  if (typeof item.to === 'string') {
    return route.path === item.to
  }

  if (!('path' in item.to)) {
    return false
  }

  const itemPath = item.to.path

  if (itemPath !== route.path) {
    return false
  }

  const itemQuery = item.to.query

  if (!itemQuery || typeof itemQuery !== 'object') {
    return true
  }

  return Object.entries(itemQuery).every(([key, value]) => route.query[key] === String(value))
}

watch(
  () => authStore.user?.id,
  () => {
    syncSidebarAvatar()
  }
)

watch(
  () => authStore.isAuthenticated,
  () => {
    void syncSidebarBadges()
  }
)

watch(
  () => tradesStore.actionLoading,
  (isLoading, wasLoading) => {
    if (wasLoading && !isLoading) {
      void fetchOpenTradesTotalCount()
    }
  }
)

onMounted(() => {
  syncSidebarAvatar()
  window.addEventListener(PROFILE_AVATAR_UPDATED_EVENT, onProfileAvatarUpdated as EventListener)
  void syncSidebarBadges()
})

onBeforeUnmount(() => {
  window.removeEventListener(PROFILE_AVATAR_UPDATED_EVENT, onProfileAvatarUpdated as EventListener)
})
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute -left-24 top-16 h-64 w-64 rounded-full bg-cyan-400/15 blur-3xl"></div>
      <div class="absolute right-0 top-0 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl"></div>
      <div class="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"></div>
    </div>

    <div class="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-5">
      <aside class="hidden lg:block">
        <div class="sticky top-0 h-screen p-4">
          <div class="flex h-full flex-col rounded-2xl border border-border/70 bg-card/80 p-4 backdrop-blur">
            <div class="flex items-center justify-between gap-3 border-b border-border/70 pb-4">
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-ygo-primary text-sm font-bold text-ygo-primaryForeground">
                  CF
                </div>
                <div>
                  <p class="font-display text-xl leading-none">CardFlow</p>
                  <p class="text-xs text-muted-foreground">Marketplace</p>
                </div>
              </div>
              <ThemeToggle />
            </div>

            <div class="mt-5 flex-1 space-y-6 overflow-y-auto">
              <section v-for="section in sidebarSections" :key="section.title">
                <p class="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{{ section.title }}</p>
                <div class="space-y-1">
                  <RouterLink
                    v-for="item in section.items"
                    :key="`${section.title}-${item.label}`"
                    :to="item.to"
                    class="flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition"
                    :class="isItemActive(item) ? 'bg-primary/12 text-primary' : 'hover:bg-accent/70'"
                  >
                    <span>{{ item.label }}</span>
                    <span
                      v-if="item.badge"
                      class="rounded-full border border-ygo-accent/45 bg-ygo-accent px-2 py-0.5 text-[11px] font-semibold text-ygo-accentForeground"
                    >
                      {{ item.badge }}
                    </span>
                  </RouterLink>
                </div>
              </section>
            </div>

            <div class="border-t border-border/70 pt-4">
              <template v-if="authStore.isAuthenticated">
                <div class="mb-3 flex items-center gap-2">
                  <div class="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-accent/50">
                    <img v-if="sidebarAvatarUrl" :src="sidebarAvatarUrl" alt="Avatar" class="h-full w-full object-cover" />
                    <span v-else class="text-xs font-semibold text-muted-foreground">{{ sidebarUserInitial }}</span>
                  </div>
                  <p class="text-sm text-muted-foreground">{{ authStore.user?.name }}</p>
                </div>
                <button
                  class="w-full rounded-lg border border-destructive/40 px-3 py-2 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
                  @click="logout"
                >
                  Sair
                </button>
              </template>
              <template v-else>
                <p class="text-sm text-muted-foreground">Faça login para criar e gerenciar suas trocas.</p>
              </template>
            </div>
          </div>
        </div>
      </aside>

      <div class="min-h-screen">
        <header class="border-b border-border/60 bg-card/70 px-4 py-4 backdrop-blur lg:hidden">
          <div class="flex items-center justify-between gap-2">
            <RouterLink to="/" class="font-display text-2xl font-bold tracking-tight">CardFlow</RouterLink>
            <div class="flex items-center gap-2">
              <ThemeToggle />
              <template v-if="authStore.isAuthenticated">
                <button
                  class="rounded-md border border-border px-3 py-1.5 text-sm transition hover:border-foreground"
                  @click="logout"
                >
                  Sair
                </button>
              </template>
              <template v-else>
                <RouterLink to="/login" class="rounded-md px-3 py-1.5 text-sm font-medium transition hover:bg-accent">
                  Entrar
                </RouterLink>
                <RouterLink
                  to="/register"
                  class="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
                >
                  Criar conta
                </RouterLink>
              </template>
            </div>
          </div>

          <nav class="mt-3 flex flex-wrap gap-2">
            <RouterLink
              v-for="item in topNavItems"
              :key="item.label"
              :to="item.to"
              class="rounded-md border border-border px-3 py-1.5 text-sm"
              active-class="bg-accent"
            >
              {{ item.label }}
            </RouterLink>
          </nav>
        </header>

        <main class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
          <RouterView />
        </main>
      </div>
    </div>

    <div class="fixed bottom-4 right-4 z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2">
      <article
        v-for="toast in toasts"
        :key="toast.id"
        class="rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur"
        :class="toastToneClass(toast.tone)"
      >
        <div class="flex items-center justify-between gap-3">
          <p>{{ toast.title }}</p>
          <button class="rounded px-1 text-xs opacity-70 hover:opacity-100" @click="appContext.removeToast(toast.id)">
            Fechar
          </button>
        </div>
      </article>
    </div>
  </div>
</template>
