<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAppContext } from '@/context/app-context'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const appContext = useAppContext()

const navItems = computed(() => {
  const publicItems = [{ to: '/', label: 'Marketplace' }]

  if (!authStore.isAuthenticated) {
    return publicItems
  }

  return [...publicItems, { to: '/dashboard', label: 'Dashboard' }]
})

const toasts = computed(() => appContext.toasts.value)

const logout = async () => {
  authStore.logout()
  appContext.notify('Sessao finalizada.', 'info')
  await router.push('/')
}

const toastToneClass = (tone: 'success' | 'error' | 'info') => {
  if (tone === 'success') {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
  }

  if (tone === 'error') {
    return 'border-destructive/30 bg-destructive/10 text-destructive'
  }

  return 'border-indigo-500/30 bg-indigo-500/10 text-indigo-700'
}
</script>

<template>
  <div class="min-h-screen bg-shell text-foreground">
    <div class="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div class="absolute -left-24 top-16 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl"></div>
      <div class="absolute right-0 top-0 h-80 w-80 rounded-full bg-orange-300/20 blur-3xl"></div>
      <div class="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl"></div>
    </div>

    <header class="border-b border-border/60 bg-card/70 backdrop-blur">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <RouterLink to="/" class="font-display text-2xl font-bold tracking-tight">CardFlow</RouterLink>

        <nav class="flex items-center gap-2">
          <RouterLink
            v-for="item in navItems"
            :key="item.to"
            :to="item.to"
            class="rounded-md px-3 py-2 text-sm font-medium transition hover:bg-accent"
            active-class="bg-accent"
          >
            {{ item.label }}
          </RouterLink>
        </nav>

        <div class="flex items-center gap-2">
          <template v-if="authStore.isAuthenticated">
            <span class="hidden text-sm text-muted-foreground sm:inline">{{ authStore.user?.name }}</span>
            <button
              class="rounded-md border border-border px-3 py-2 text-sm transition hover:border-foreground"
              @click="logout"
            >
              Sair
            </button>
          </template>
          <template v-else>
            <RouterLink to="/login" class="rounded-md px-3 py-2 text-sm font-medium transition hover:bg-accent">
              Entrar
            </RouterLink>
            <RouterLink
              to="/register"
              class="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            >
              Criar conta
            </RouterLink>
          </template>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <RouterView />
    </main>

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
