<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import bannerImage from '@/assets/img/Banner.webp'
import TradeRequestCard from '@/components/app/TradeRequestCard.vue'
import { useAppContext } from '@/context/app-context'
import { useAuthStore } from '@/stores/auth'
import { useTradesStore } from '@/stores/trades'
import type { PaginatedResponse, Trade } from '@/types/marketplace'

const tradesStore = useTradesStore()
const authStore = useAuthStore()
const { notify } = useAppContext()

const page = ref(1)
const rpp = 10
const loadingMore = ref(false)
const openGroups = ref<Record<string, boolean>>({})
const pageRoot = ref<HTMLElement | null>(null)
let introAnimationContext: gsap.Context | null = null
let scrollAnimationContext: gsap.Context | null = null

gsap.registerPlugin(ScrollTrigger)

const pageData = computed(() => tradesStore.getTradesPage(page.value, rpp))
const trades = computed(() => {
  const merged = new Map<string, Trade>()

  for (let pageNumber = 1; pageNumber <= page.value; pageNumber += 1) {
    const current = tradesStore.getTradesPage(pageNumber, rpp)

    if (!current) {
      continue
    }

    current.list.forEach((trade) => {
      if (!merged.has(trade.id)) {
        merged.set(trade.id, trade)
      }
    })
  }

  return Array.from(merged.values())
})
const hasMoreTrades = computed(() =>
  Boolean(pageData.value && (pageData.value.more || pageData.value.list.length === pageData.value.rpp))
)
const groupedTrades = computed(() => {
  const groupsMap = new Map<string, { userId: string; userName: string; trades: Trade[] }>()

  trades.value.forEach((trade) => {
    const group = groupsMap.get(trade.userId)

    if (group) {
      group.trades.push(trade)
      return
    }

    groupsMap.set(trade.userId, {
      userId: trade.userId,
      userName: trade.user.name,
      trades: [trade]
    })
  })

  return Array.from(groupsMap.values())
})

const heroStyle = computed(() => ({
  backgroundImage: `linear-gradient(125deg, rgba(6, 14, 40, 0.94), rgba(8, 20, 54, 0.7) 48%, rgba(6, 14, 40, 0.95)), url("${bannerImage}")`
}))

const loadTrades = async (nextPage: number, force = false) => {
  if (nextPage < 1) {
    return
  }

  const previousPage = page.value

  try {
    const data = (await tradesStore.fetchTrades(nextPage, rpp, force)) as PaginatedResponse<Trade>

    if (nextPage > previousPage && data.list.length === 0) {
      notify('Não há mais trocas para carregar.', 'info')
      return false
    }

    page.value = nextPage
    return true
  } catch {
    notify(tradesStore.error ?? 'Falha ao carregar trocas.', 'error')
    return false
  }
}

const loadMoreTrades = async () => {
  if (loadingMore.value || tradesStore.loading || !hasMoreTrades.value) {
    return
  }

  loadingMore.value = true
  try {
    await loadTrades(page.value + 1)
  } finally {
    loadingMore.value = false
  }
}

const removeTrade = async (tradeId: string) => {
  try {
    await tradesStore.deleteTrade(tradeId)
    notify('Solicitacao removida com sucesso.', 'success')
  } catch {
    notify(tradesStore.error ?? 'Falha ao remover solicitacao.', 'error')
  }
}

const toggleGroup = (userId: string) => {
  openGroups.value[userId] = !openGroups.value[userId]
}

const nearPageBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 240

const onWindowScroll = () => {
  if (nearPageBottom()) {
    void loadMoreTrades()
  }
}

const runIntroAnimation = () => {
  if (!pageRoot.value) {
    return
  }

  introAnimationContext?.revert()

  introAnimationContext = gsap.context(() => {
    const timeline = gsap.timeline({
      defaults: {
        ease: 'power2.out'
      }
    })

    timeline.from('[data-gsap="marketplace-hero"]', {
      y: 24,
      autoAlpha: 0,
      duration: 0.55
    })

  }, pageRoot.value)
}

const setupScrollAnimations = () => {
  if (!pageRoot.value || tradesStore.loading) {
    return
  }

  scrollAnimationContext?.revert()

  const groups = pageRoot.value.querySelectorAll<HTMLElement>('[data-gsap="trade-group"]')

  if (groups.length === 0) {
    return
  }

  scrollAnimationContext = gsap.context(() => {
    groups.forEach((group, index) => {
      gsap.fromTo(
        group,
        {
          y: 20,
          autoAlpha: 0
        },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.5,
          delay: index * 0.03,
          ease: 'power2.out',
          clearProps: 'transform,opacity,visibility',
          scrollTrigger: {
            trigger: group,
            start: 'top 85%',
            toggleActions: 'play none none none',
            once: true
          }
        }
      )
    })
  }, pageRoot.value)

  ScrollTrigger.refresh()
}

const animateGroupEnter = (element: Element, done: () => void) => {
  const el = element as HTMLElement
  gsap.killTweensOf(el)
  el.style.overflow = 'hidden'

  gsap.fromTo(
    el,
    {
      height: 0,
      autoAlpha: 0
    },
    {
      height: 'auto',
      autoAlpha: 1,
      duration: 0.35,
      ease: 'power2.out',
      onComplete: () => {
        el.style.overflow = ''
        done()
      }
    }
  )
}

const animateGroupLeave = (element: Element, done: () => void) => {
  const el = element as HTMLElement
  gsap.killTweensOf(el)
  el.style.overflow = 'hidden'

  gsap.fromTo(
    el,
    {
      height: el.scrollHeight,
      autoAlpha: 1
    },
    {
      height: 0,
      autoAlpha: 0,
      duration: 0.28,
      ease: 'power1.in',
      onComplete: () => {
        el.style.overflow = ''
        done()
      }
    }
  )
}

watch(
  groupedTrades,
  (groups) => {
    groups.forEach((group) => {
      if (!(group.userId in openGroups.value)) {
        openGroups.value[group.userId] = true
      }
    })
  },
  { immediate: true }
)

onMounted(async () => {
  await loadTrades(1)
  await nextTick()
  runIntroAnimation()
  window.addEventListener('scroll', onWindowScroll, { passive: true })
})

watch(groupedTrades, async () => {
  await nextTick()
  setupScrollAnimations()
})

onBeforeUnmount(() => {
  introAnimationContext?.revert()
  scrollAnimationContext?.revert()
  window.removeEventListener('scroll', onWindowScroll)
})
</script>

<template>
  <section ref="pageRoot" class="space-y-6">
    <header
      data-gsap="marketplace-hero"
      class="relative overflow-hidden rounded-3xl border border-border/60 shadow-xl shadow-black/10"
    >
      <div
        class="absolute inset-0 bg-cover bg-center bg-no-repeat"
        :style="heroStyle"
      ></div>
      <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-slate-950/10"></div>
      <div class="relative p-6 sm:p-8" style="text-shadow: 0 2px 14px rgba(0, 0, 0, 0.5);">
        <p class="text-xs uppercase tracking-[0.2em] text-slate-100">Marketplace</p>
        <h1 class="mt-2 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
          Trocas de cartas abertas
        </h1>
        <p class="mt-3 max-w-2xl text-sm text-slate-100/95 sm:text-base">
          Explore as ofertas da comunidade. Visitantes podem visualizar tudo e usuários logados podem gerenciar suas solicitações.
        </p>
        <div class="mt-5 flex flex-wrap gap-2">
          <span class="rounded-full border border-white/45 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {{ groupedTrades.length }} solicitantes
          </span>
          <span class="rounded-full border border-white/45 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {{ trades.length }} trocas carregadas
          </span>
          <span class="rounded-full border border-white/45 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
            {{ authStore.isAuthenticated ? 'Modo autenticado' : 'Modo visitante' }}
          </span>
        </div>
      </div>
    </header>

    <p v-if="tradesStore.loading" class="text-sm text-muted-foreground">Carregando trocas...</p>
    <p v-else-if="trades.length === 0" class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      Nenhuma solicitação de troca disponível no momento.
    </p>

    <div v-else class="grid gap-4">
      <article
        v-for="group in groupedTrades"
        :key="group.userId"
        data-gsap="trade-group"
        class="rounded-2xl border border-border/70 bg-card/80 p-3"
      >
        <button
          type="button"
          class="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition hover:bg-accent/60"
          @click="toggleGroup(group.userId)"
        >
          <div class="min-w-0">
            <p class="text-sm text-muted-foreground">Solicitante</p>
            <h2 class="truncate text-lg font-semibold">{{ group.userName }}</h2>
          </div>
          <div class="flex items-center gap-3 pl-3">
            <span class="rounded-full bg-ygo-accentSoft px-2.5 py-1 text-xs font-semibold text-ygo-accent">
              {{ group.trades.length }} {{ group.trades.length > 1 ? 'trocas' : 'troca' }}
            </span>
            <span class="text-sm text-muted-foreground">
              {{ openGroups[group.userId] ? 'Ocultar' : 'Mostrar' }}
            </span>
          </div>
        </button>

        <Transition :css="false" @enter="animateGroupEnter" @leave="animateGroupLeave">
          <div v-if="openGroups[group.userId]" class="mt-3 grid gap-4">
            <TradeRequestCard
              v-for="trade in group.trades"
              :key="trade.id"
              :trade="trade"
              :can-delete="authStore.user?.id === trade.userId"
              :busy="tradesStore.actionLoading"
              @delete="removeTrade"
            />
          </div>
        </Transition>
      </article>
    </div>

    <p v-if="loadingMore" class="text-center text-sm text-muted-foreground">Carregando mais trocas...</p>
    <p v-else-if="!hasMoreTrades && trades.length > 0" class="text-center text-sm text-muted-foreground">
      Todas as trocas disponíveis foram carregadas.
    </p>
  </section>
</template>
