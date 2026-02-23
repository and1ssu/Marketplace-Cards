<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import TradeRequestCard from '@/components/app/TradeRequestCard.vue'
import { useAppContext } from '@/context/app-context'
import { validateTradeForm } from '@/lib/validation'
import { useAuthStore } from '@/stores/auth'
import { useCardsStore } from '@/stores/cards'
import { useTradesStore } from '@/stores/trades'

const authStore = useAuthStore()
const cardsStore = useCardsStore()
const tradesStore = useTradesStore()
const { notify } = useAppContext()

const activeTab = ref<'inventory' | 'catalog' | 'trade' | 'my-trades'>('inventory')
const catalogPage = ref(1)

const cardsToAdd = ref<string[]>([])
const tradeForm = reactive({
  offeringIds: [] as string[],
  receivingIds: [] as string[]
})

const tradeErrors = reactive<Partial<Record<'offeringIds' | 'receivingIds', string>>>({})

const catalogData = computed(() => cardsStore.catalogPages[catalogPage.value])
const catalogCards = computed(() => catalogData.value?.list ?? [])
const myTrades = computed(() => {
  const currentTrades = tradesStore.pages[1]?.list ?? []
  return currentTrades.filter((trade) => trade.userId === authStore.user?.id)
})

const syncData = async () => {
  await Promise.all([
    cardsStore.fetchCatalog(catalogPage.value, 12),
    cardsStore.fetchMyCards(true),
    tradesStore.fetchTrades(1, 10, true)
  ])
}

const loadDashboard = async () => {
  try {
    await syncData()
  } catch {
    notify(cardsStore.error ?? tradesStore.error ?? 'Falha ao carregar dashboard.', 'error')
  }
}

const toggleSelection = (target: string[], cardId: string) => {
  if (target.includes(cardId)) {
    return target.filter((id) => id !== cardId)
  }

  return [...target, cardId]
}

const submitAddCards = async () => {
  if (cardsToAdd.value.length === 0) {
    notify('Selecione ao menos uma carta para adicionar.', 'error')
    return
  }

  try {
    await cardsStore.addCards(cardsToAdd.value)
    cardsToAdd.value = []
    notify('Cartas adicionadas com sucesso.', 'success')
  } catch {
    notify(cardsStore.error ?? 'Falha ao adicionar cartas.', 'error')
  }
}

const submitCreateTrade = async () => {
  Object.assign(tradeErrors, { offeringIds: undefined, receivingIds: undefined })
  const validation = validateTradeForm(tradeForm)
  Object.assign(tradeErrors, validation)

  if (Object.keys(validation).length > 0) {
    return
  }

  try {
    await tradesStore.createTrade({
      cards: [
        ...tradeForm.offeringIds.map((cardId) => ({ cardId, type: 'OFFERING' as const })),
        ...tradeForm.receivingIds.map((cardId) => ({ cardId, type: 'RECEIVING' as const }))
      ]
    })

    tradeForm.offeringIds = []
    tradeForm.receivingIds = []
    await tradesStore.fetchTrades(1, 10, true)
    notify('Solicitacao de troca criada com sucesso.', 'success')
  } catch {
    notify(tradesStore.error ?? 'Falha ao criar solicitacao.', 'error')
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

const changeCatalogPage = async (nextPage: number) => {
  catalogPage.value = nextPage

  try {
    await cardsStore.fetchCatalog(nextPage, 12)
  } catch {
    notify(cardsStore.error ?? 'Falha ao carregar cartas.', 'error')
  }
}

onMounted(async () => {
  await loadDashboard()
})
</script>

<template>
  <section class="space-y-6">
    <header class="rounded-3xl border border-border/70 bg-card/90 p-6 backdrop-blur">
      <h1 class="font-display text-4xl font-bold">Painel do jogador</h1>
      <p class="mt-2 text-muted-foreground">
        Gerencie sua coleção, adicione novas cartas e publique solicitações de troca.
      </p>
    </header>

    <nav class="flex flex-wrap gap-2">
      <button
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="activeTab === 'inventory' ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-foreground'"
        @click="activeTab = 'inventory'"
      >
        Minhas cartas
      </button>
      <button
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="activeTab === 'catalog' ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-foreground'"
        @click="activeTab = 'catalog'"
      >
        Catálogo
      </button>
      <button
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="activeTab === 'trade' ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-foreground'"
        @click="activeTab = 'trade'"
      >
        Criar troca
      </button>
      <button
        class="rounded-lg px-4 py-2 text-sm font-medium transition"
        :class="activeTab === 'my-trades' ? 'bg-primary text-primary-foreground' : 'border border-border text-foreground hover:border-foreground'"
        @click="activeTab = 'my-trades'"
      >
        Minhas trocas
      </button>
    </nav>

    <section v-if="activeTab === 'inventory'" class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold">Minha coleção</h2>
        <button
          class="rounded-lg border border-border px-3 py-2 text-sm transition hover:border-foreground"
          :disabled="cardsStore.myCardsLoading"
          @click="cardsStore.fetchMyCards(true)"
        >
          Atualizar
        </button>
      </div>

      <p v-if="cardsStore.myCardsLoading" class="text-sm text-muted-foreground">Carregando coleção...</p>
      <p v-else-if="cardsStore.myCards.length === 0" class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        Você ainda não adicionou cartas na sua conta.
      </p>

      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <article
          v-for="card in cardsStore.myCards"
          :key="card.id"
          class="rounded-xl border border-border/70 bg-card/80 p-3"
        >
          <img :src="card.imageUrl" :alt="card.name" class="h-48 w-full rounded-lg object-cover" loading="lazy" />
          <h3 class="mt-3 font-semibold">{{ card.name }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ card.description }}</p>
        </article>
      </div>
    </section>

    <section v-if="activeTab === 'catalog'" class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xl font-semibold">Adicionar cartas à conta</h2>
        <div class="flex items-center gap-2">
          <button
            class="rounded-lg border border-border px-3 py-2 text-sm transition hover:border-foreground disabled:opacity-50"
            :disabled="catalogPage <= 1"
            @click="changeCatalogPage(catalogPage - 1)"
          >
            Anterior
          </button>
          <span class="text-sm text-muted-foreground">Página {{ catalogPage }}</span>
          <button
            class="rounded-lg border border-border px-3 py-2 text-sm transition hover:border-foreground disabled:opacity-50"
            :disabled="!catalogData?.more"
            @click="changeCatalogPage(catalogPage + 1)"
          >
            Próxima
          </button>
        </div>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label
          v-for="card in catalogCards"
          :key="card.id"
          class="group block cursor-pointer rounded-xl border border-border/70 bg-card/70 p-3 transition hover:border-foreground"
        >
          <input
            type="checkbox"
            class="mb-3"
            :checked="cardsToAdd.includes(card.id)"
            @change="cardsToAdd = toggleSelection(cardsToAdd, card.id)"
          />
          <img :src="card.imageUrl" :alt="card.name" class="h-48 w-full rounded-lg object-cover" loading="lazy" />
          <h3 class="mt-3 font-semibold">{{ card.name }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ card.description }}</p>
        </label>
      </div>

      <button
        class="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        :disabled="cardsStore.myCardsLoading"
        @click="submitAddCards"
      >
        Adicionar selecionadas
      </button>
    </section>

    <section v-if="activeTab === 'trade'" class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-2xl border border-border/70 bg-card/90 p-4">
        <h2 class="text-lg font-semibold">1. Selecione o que você oferece</h2>
        <p v-if="tradeErrors.offeringIds" class="mt-2 text-xs text-destructive">{{ tradeErrors.offeringIds }}</p>

        <div class="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-2">
          <label
            v-for="card in cardsStore.myCards"
            :key="card.id"
            class="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-2"
          >
            <input
              type="checkbox"
              :checked="tradeForm.offeringIds.includes(card.id)"
              @change="tradeForm.offeringIds = toggleSelection(tradeForm.offeringIds, card.id)"
            />
            <img :src="card.imageUrl" :alt="card.name" class="h-12 w-10 rounded object-cover" loading="lazy" />
            <span class="text-sm">{{ card.name }}</span>
          </label>
        </div>
      </article>

      <article class="rounded-2xl border border-border/70 bg-card/90 p-4">
        <h2 class="text-lg font-semibold">2. Selecione o que você quer receber</h2>
        <p v-if="tradeErrors.receivingIds" class="mt-2 text-xs text-destructive">{{ tradeErrors.receivingIds }}</p>

        <div class="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-2">
          <label
            v-for="card in catalogCards"
            :key="card.id"
            class="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-2"
          >
            <input
              type="checkbox"
              :checked="tradeForm.receivingIds.includes(card.id)"
              @change="tradeForm.receivingIds = toggleSelection(tradeForm.receivingIds, card.id)"
            />
            <img :src="card.imageUrl" :alt="card.name" class="h-12 w-10 rounded object-cover" loading="lazy" />
            <span class="text-sm">{{ card.name }}</span>
          </label>
        </div>
      </article>

      <button
        class="rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60 lg:col-span-2"
        :disabled="tradesStore.actionLoading"
        @click="submitCreateTrade"
      >
        {{ tradesStore.actionLoading ? 'Criando solicitação...' : 'Publicar solicitação de troca' }}
      </button>
    </section>

    <section v-if="activeTab === 'my-trades'" class="space-y-4">
      <h2 class="text-xl font-semibold">Solicitações criadas por você</h2>
      <p v-if="myTrades.length === 0" class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        Você ainda não publicou solicitações de troca.
      </p>
      <TradeRequestCard
        v-for="trade in myTrades"
        :key="trade.id"
        :trade="trade"
        can-delete
        :busy="tradesStore.actionLoading"
        @delete="removeTrade"
      />
    </section>
  </section>
</template>
