<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import TradeRequestCard from '@/components/app/TradeRequestCard.vue'
import { useAppContext } from '@/context/app-context'
import { useAuthStore } from '@/stores/auth'
import { useTradesStore } from '@/stores/trades'

const tradesStore = useTradesStore()
const authStore = useAuthStore()
const { notify } = useAppContext()

const page = ref(1)
const rpp = 10

const pageData = computed(() => tradesStore.pages[page.value])
const trades = computed(() => pageData.value?.list ?? [])

const loadTrades = async (nextPage: number, force = false) => {
  try {
    page.value = nextPage
    await tradesStore.fetchTrades(nextPage, rpp, force)
  } catch {
    notify(tradesStore.error ?? 'Falha ao carregar trocas.', 'error')
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

    <div class="flex flex-wrap items-center gap-3">
      <button
        class="rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium transition hover:border-foreground"
        :disabled="tradesStore.loading"
        @click="loadTrades(page, true)"
      >
        Atualizar
      </button>
      <button
        class="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:border-foreground disabled:opacity-50"
        :disabled="page <= 1 || tradesStore.loading"
        @click="loadTrades(page - 1)"
      >
        Página anterior
      </button>
      <button
        class="rounded-lg border border-border px-4 py-2 text-sm font-medium transition hover:border-foreground disabled:opacity-50"
        :disabled="!pageData?.more || tradesStore.loading"
        @click="loadTrades(page + 1)"
      >
        Próxima página
      </button>
    </div>

    <p v-if="tradesStore.loading" class="text-sm text-muted-foreground">Carregando trocas...</p>
    <p v-else-if="trades.length === 0" class="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      Nenhuma solicitação de troca disponível no momento.
    </p>

    <div v-else class="grid gap-4">
      <TradeRequestCard
        v-for="trade in trades"
        :key="trade.id"
        :trade="trade"
        :can-delete="authStore.user?.id === trade.userId"
        :busy="tradesStore.actionLoading"
        @delete="removeTrade"
      />
    </div>
  </section>
</template>
