<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PaginationBar from '@/components/app/PaginationBar.vue'
import TradeRequestCard from '@/components/app/TradeRequestCard.vue'
import { useAppContext } from '@/context/app-context'
import { useAuthStore } from '@/stores/auth'
import { useTradesStore } from '@/stores/trades'
import type { Trade } from '@/types/marketplace'

const tradesStore = useTradesStore()
const authStore = useAuthStore()
const { notify } = useAppContext()

const page = ref(1)
const rpp = ref(10)
const openGroups = ref<Record<string, boolean>>({})

const pageData = computed(() => tradesStore.getTradesPage(page.value, rpp.value))
const trades = computed(() => pageData.value?.list ?? [])
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

const totalItems = computed(() => {
  if (!pageData.value || pageData.value.more) {
    return null
  }

  return (pageData.value.page - 1) * pageData.value.rpp + pageData.value.list.length
})

const totalPages = computed(() => {
  if (!pageData.value || pageData.value.more) {
    return null
  }

  return pageData.value.page
})

const loadTrades = async (nextPage: number, force = false) => {
  if (nextPage < 1) {
    return
  }

  try {
    page.value = nextPage
    await tradesStore.fetchTrades(nextPage, rpp.value, force)
  } catch {
    notify(tradesStore.error ?? 'Falha ao carregar trocas.', 'error')
  }
}

const changeRpp = async (nextRpp: number) => {
  rpp.value = nextRpp
  page.value = 1
  await loadTrades(1, false)
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

watch(
  groupedTrades,
  (groups) => {
    groups.forEach((group) => {
      if (!(group.userId in openGroups.value)) {
        openGroups.value[group.userId] = false
      }
    })
  },
  { immediate: true }
)

onMounted(async () => {
  await loadTrades(1)
})
</script>

<template>
  <section class="space-y-6">
    <header class="rounded-3xl border border-border/60 bg-card/80 p-6 backdrop-blur">
      <p class="text-xs uppercase tracking-[0.2em] text-muted-foreground">Marketplace</p>
      <h1 class="mt-2 font-display text-4xl font-bold leading-tight">Trocas de cartas abertas</h1>
      <p class="mt-3 max-w-2xl text-muted-foreground">
        Explore as ofertas da comunidade. Visitantes podem visualizar tudo e usuários logados podem gerenciar suas solicitações.
      </p>
    </header>


    <PaginationBar
      :page="page"
      :rpp="rpp"
      :count="trades.length"
      :has-more="Boolean(pageData?.more)"
      :loading="tradesStore.loading"
      :total-items="totalItems"
      :total-pages="totalPages"
      label="trocas"
      @change-page="loadTrades"
      @change-rpp="changeRpp"
    />

    <p v-if="tradesStore.loading" class="text-sm text-muted-foreground">Carregando trocas...</p>
    <p v-else-if="trades.length === 0" class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      Nenhuma solicitação de troca disponível no momento.
    </p>

    <div v-else class="grid gap-4">
      <article
        v-for="group in groupedTrades"
        :key="group.userId"
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
      </article>
    </div>
  </section>
</template>
