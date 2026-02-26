<script setup lang="ts">
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import bannerImage from '@/assets/img/Banner.webp'
import { useAppContext } from '@/context/app-context'
import MarketplaceHero from '@/pages/marketplace/components/MarketplaceHero.vue'
import MarketplaceTradeGroups from '@/pages/marketplace/components/MarketplaceTradeGroups.vue'
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
    <MarketplaceHero
      :hero-style="heroStyle"
      :grouped-trades-count="groupedTrades.length"
      :trades-count="trades.length"
      :is-authenticated="authStore.isAuthenticated"
    />

    <p v-if="tradesStore.loading" class="text-sm text-muted-foreground">Carregando trocas...</p>
    <p v-else-if="trades.length === 0" class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      Nenhuma solicitação de troca disponível no momento.
    </p>

    <MarketplaceTradeGroups
      v-else
      :groups="groupedTrades"
      :open-groups="openGroups"
      :current-user-id="authStore.user?.id"
      :action-loading="tradesStore.actionLoading"
      :on-enter="animateGroupEnter"
      :on-leave="animateGroupLeave"
      @toggle-group="toggleGroup"
      @delete-trade="removeTrade"
    />

    <p v-if="loadingMore" class="text-center text-sm text-muted-foreground">Carregando mais trocas...</p>
    <p v-else-if="!hasMoreTrades && trades.length > 0" class="text-center text-sm text-muted-foreground">
      Todas as trocas disponíveis foram carregadas.
    </p>
  </section>
</template>
