<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CardImagePreview from '@/components/app/CardImagePreview.vue'
import TradeRequestCard from '@/components/app/TradeRequestCard.vue'
import { useAppContext } from '@/context/app-context'
import { validateTradeForm } from '@/lib/validation'
import { useAuthStore } from '@/stores/auth'
import { useCardsStore } from '@/stores/cards'
import { useTradesStore } from '@/stores/trades'
import type { Card, PaginatedResponse, Trade } from '@/types/marketplace'

type DashboardTab = 'inventory' | 'catalog' | 'trade' | 'my-trades'

const validTabs: DashboardTab[] = ['inventory', 'catalog', 'trade', 'my-trades']

const authStore = useAuthStore()
const cardsStore = useCardsStore()
const tradesStore = useTradesStore()
const route = useRoute()
const router = useRouter()
const { notify } = useAppContext()

const parseTab = (value: unknown): DashboardTab => {
  if (typeof value === 'string' && validTabs.includes(value as DashboardTab)) {
    return value as DashboardTab
  }

  return 'inventory'
}

const activeTab = ref<DashboardTab>(parseTab(route.query.tab))

const sectionMeta: Record<DashboardTab, { title: string; subtitle: string }> = {
  inventory: {
    title: 'Minhas cartas',
    subtitle: 'Visualize e acompanhe sua coleção atual.'
  },
  catalog: {
    title: 'Catálogo',
    subtitle: 'Adicione cartas da base pública para sua conta.'
  },
  trade: {
    title: 'Criar troca',
    subtitle: 'Monte sua oferta e escolha as cartas que deseja receber.'
  },
  'my-trades': {
    title: 'Minhas trocas',
    subtitle: 'Gerencie as solicitações de troca que você criou.'
  }
}

const currentSection = computed(() => sectionMeta[activeTab.value])

const catalogPage = ref(1)
const catalogRpp = ref(12)
const catalogLoadingMore = ref(false)
const addingCardFromPreviewId = ref<string | null>(null)

const myTradesPage = ref(1)
const myTradesRpp = ref(10)
const myTradesLoadingMore = ref(false)

const cardsToAdd = ref<string[]>([])
const tradeForm = reactive({
  offeringIds: [] as string[],
  receivingIds: [] as string[]
})
const showAddCardsConfirmationModal = ref(false)
const showTradeConfirmationModal = ref(false)

const tradeErrors = reactive<Partial<Record<'offeringIds' | 'receivingIds', string>>>({})

const hasMoreFromPage = <T>(pageData?: PaginatedResponse<T>) =>
  Boolean(pageData && (pageData.more || pageData.list.length === pageData.rpp))

const catalogCurrentPageData = computed(() => cardsStore.getCatalogPage(catalogPage.value, catalogRpp.value))
const catalogHasMore = computed(() => hasMoreFromPage(catalogCurrentPageData.value))

const catalogCards = computed(() => {
  const merged = new Map<string, Card>()

  for (let pageNumber = 1; pageNumber <= catalogPage.value; pageNumber += 1) {
    const pageData = cardsStore.getCatalogPage(pageNumber, catalogRpp.value)

    if (!pageData) {
      continue
    }

    pageData.list.forEach((card) => {
      if (!merged.has(card.id)) {
        merged.set(card.id, card)
      }
    })
  }

  return Array.from(merged.values())
})

const myTradesCurrentPageData = computed(() => tradesStore.getTradesPage(myTradesPage.value, myTradesRpp.value))
const myTradesHasMore = computed(() => hasMoreFromPage(myTradesCurrentPageData.value))

const myTrades = computed(() => {
  const merged = new Map<string, Trade>()

  for (let pageNumber = 1; pageNumber <= myTradesPage.value; pageNumber += 1) {
    const pageData = tradesStore.getTradesPage(pageNumber, myTradesRpp.value)

    if (!pageData) {
      continue
    }

    pageData.list.forEach((trade) => {
      if (trade.userId === authStore.user?.id && !merged.has(trade.id)) {
        merged.set(trade.id, trade)
      }
    })
  }

  return Array.from(merged.values())
})

const myCardIdsSet = computed(() => new Set(cardsStore.myCards.map((card) => card.id)))
const addableCatalogCards = computed(() => catalogCards.value.filter((card) => !myCardIdsSet.value.has(card.id)))
const receivableCatalogCards = computed(() => catalogCards.value.filter((card) => !myCardIdsSet.value.has(card.id)))
const selectedCatalogCardsToAdd = computed(() => {
  const catalogById = new Map(addableCatalogCards.value.map((card) => [card.id, card]))
  return cardsToAdd.value
    .map((cardId) => catalogById.get(cardId))
    .filter((card): card is Card => Boolean(card))
})
const selectedOfferingCards = computed(() => {
  const myCardsById = new Map(cardsStore.myCards.map((card) => [card.id, card]))
  return tradeForm.offeringIds
    .map((cardId) => myCardsById.get(cardId))
    .filter((card): card is Card => Boolean(card))
})
const selectedReceivingCards = computed(() => {
  const catalogById = new Map(receivableCatalogCards.value.map((card) => [card.id, card]))
  return tradeForm.receivingIds
    .map((cardId) => catalogById.get(cardId))
    .filter((card): card is Card => Boolean(card))
})

const allCatalogSelected = computed(
  () => addableCatalogCards.value.length > 0 && addableCatalogCards.value.every((card) => cardsToAdd.value.includes(card.id))
)

const allOfferingSelected = computed(
  () => cardsStore.myCards.length > 0 && cardsStore.myCards.every((card) => tradeForm.offeringIds.includes(card.id))
)

const allReceivingSelected = computed(
  () =>
    receivableCatalogCards.value.length > 0 &&
    receivableCatalogCards.value.every((card) => tradeForm.receivingIds.includes(card.id))
)
const isCatalogInitialLoading = computed(() => cardsStore.catalogLoading && catalogCards.value.length === 0)
const shouldShowCatalogEmptyState = computed(() => !isCatalogInitialLoading.value && addableCatalogCards.value.length === 0)
const shouldShowTradeReceivingEmptyState = computed(
  () => !isCatalogInitialLoading.value && receivableCatalogCards.value.length === 0
)

const isCardNew = (cardId: string) => cardsStore.newCardIds.includes(cardId)

const syncData = async () => {
  await Promise.all([
    cardsStore.fetchCatalog(1, catalogRpp.value),
    cardsStore.fetchMyCards(true),
    tradesStore.fetchTrades(1, myTradesRpp.value, true)
  ])
}

const loadDashboard = async () => {
  try {
    await syncData()
  } catch {
    notify(cardsStore.error ?? tradesStore.error ?? 'Falha ao carregar dashboard.', 'error')
  }
}

const ensureCatalogLoaded = async () => {
  try {
    await cardsStore.fetchCatalog(catalogPage.value, catalogRpp.value)
  } catch {
    notify(cardsStore.error ?? 'Falha ao carregar cartas.', 'error')
  }
}

const ensureCatalogOptionsForTab = async (tab: DashboardTab, maxAttempts = 3) => {
  if (tab !== 'catalog' && tab !== 'trade') {
    return
  }

  let attempts = 0

  while (catalogHasMore.value && attempts < maxAttempts) {
    const visibleCount = tab === 'catalog' ? addableCatalogCards.value.length : receivableCatalogCards.value.length

    if (visibleCount > 0) {
      return
    }

    attempts += 1
    await loadMoreCatalog()
  }
}

const ensureMyTradesLoaded = async () => {
  try {
    await tradesStore.fetchTrades(myTradesPage.value, myTradesRpp.value)
  } catch {
    notify(tradesStore.error ?? 'Falha ao carregar suas trocas.', 'error')
  }
}

const setActiveTab = async (tab: DashboardTab) => {
  activeTab.value = tab

  if (tab === 'catalog' || tab === 'trade') {
    await ensureCatalogLoaded()
    await ensureCatalogOptionsForTab(tab)
  }

  if (tab === 'my-trades') {
    await ensureMyTradesLoaded()
  }

  await router.replace({
    query: {
      ...route.query,
      tab
    }
  })
}

const toggleSelection = (target: string[], cardId: string) => {
  if (target.includes(cardId)) {
    return target.filter((id) => id !== cardId)
  }

  return [...target, cardId]
}

const addCards = (selected: string[], ids: string[]) => Array.from(new Set([...selected, ...ids]))
const removeCards = (selected: string[], ids: string[]) => selected.filter((id) => !ids.includes(id))

const toggleAllCatalogSelection = () => {
  const loadedIds = addableCatalogCards.value.map((card) => card.id)

  if (allCatalogSelected.value) {
    cardsToAdd.value = removeCards(cardsToAdd.value, loadedIds)
    return
  }

  cardsToAdd.value = addCards(cardsToAdd.value, loadedIds)
}

const toggleAllOfferingSelection = () => {
  const ids = cardsStore.myCards.map((card) => card.id)

  if (allOfferingSelected.value) {
    tradeForm.offeringIds = []
    return
  }

  tradeForm.offeringIds = ids
}

const toggleAllReceivingSelection = () => {
  const loadedIds = receivableCatalogCards.value.map((card) => card.id)

  if (allReceivingSelected.value) {
    tradeForm.receivingIds = removeCards(tradeForm.receivingIds, loadedIds)
    return
  }

  tradeForm.receivingIds = addCards(tradeForm.receivingIds, loadedIds)
}

const normalizeCardsToAddSelection = () => {
  const selectedUnique = Array.from(new Set(cardsToAdd.value))
  const selectedAllowed = selectedUnique.filter((cardId) => !myCardIdsSet.value.has(cardId))

  if (selectedAllowed.length !== selectedUnique.length) {
    notify('Cartas já existentes na sua conta foram removidas da seleção.', 'info')
  }

  cardsToAdd.value = selectedAllowed
  return selectedAllowed
}

const openAddCardsConfirmation = () => {
  const selectedAllowed = normalizeCardsToAddSelection()

  if (selectedAllowed.length === 0) {
    notify('Selecione ao menos uma carta para adicionar.', 'error')
    return
  }

  showAddCardsConfirmationModal.value = true
}

const submitAddCards = async () => {
  const selectedAllowed = normalizeCardsToAddSelection()

  if (selectedAllowed.length === 0) {
    showAddCardsConfirmationModal.value = false
    notify('Selecione ao menos uma carta para adicionar.', 'error')
    return
  }

  try {
    await cardsStore.addCards(selectedAllowed)
    cardsToAdd.value = []
    showAddCardsConfirmationModal.value = false
    notify('Cartas adicionadas com sucesso.', 'success')
  } catch {
    notify(cardsStore.error ?? 'Falha ao adicionar cartas.', 'error')
  }
}

const addCardFromPreview = async (cardId: string) => {
  if (myCardIdsSet.value.has(cardId)) {
    notify('Essa carta ja esta na sua conta.', 'info')
    return
  }

  addingCardFromPreviewId.value = cardId

  try {
    await cardsStore.addCards([cardId])
    cardsToAdd.value = cardsToAdd.value.filter((id) => id !== cardId)
    notify('Carta adicionada com sucesso.', 'success')
  } catch {
    notify(cardsStore.error ?? 'Falha ao adicionar carta.', 'error')
  } finally {
    addingCardFromPreviewId.value = null
  }
}

const normalizeTradeSelections = () => {
  const offeringUnique = Array.from(new Set(tradeForm.offeringIds))
  const receivingUnique = Array.from(new Set(tradeForm.receivingIds))
  const receivingAllowed = receivingUnique.filter((cardId) => !myCardIdsSet.value.has(cardId))

  if (receivingAllowed.length !== receivingUnique.length) {
    notify('Cartas da sua conta foram removidas da lista de recebimento.', 'info')
  }

  tradeForm.offeringIds = offeringUnique
  tradeForm.receivingIds = receivingAllowed

  return { offeringUnique, receivingAllowed }
}

const validateCurrentTradeForm = () => {
  Object.assign(tradeErrors, { offeringIds: undefined, receivingIds: undefined })

  const { offeringUnique, receivingAllowed } = normalizeTradeSelections()

  const validation = validateTradeForm({
    offeringIds: offeringUnique,
    receivingIds: receivingAllowed
  })

  Object.assign(tradeErrors, validation)

  return { offeringUnique, receivingAllowed, validation }
}

const openTradeConfirmation = () => {
  const { validation } = validateCurrentTradeForm()

  if (Object.keys(validation).length > 0) {
    return
  }

  showTradeConfirmationModal.value = true
}

const submitCreateTrade = async () => {
  const { offeringUnique, receivingAllowed, validation } = validateCurrentTradeForm()

  if (Object.keys(validation).length > 0) {
    showTradeConfirmationModal.value = false
    return
  }

  try {
    await tradesStore.createTrade({
      cards: [
        ...offeringUnique.map((cardId) => ({ cardId, type: 'OFFERING' as const })),
        ...receivingAllowed.map((cardId) => ({ cardId, type: 'RECEIVING' as const }))
      ]
    })

    tradeForm.offeringIds = []
    tradeForm.receivingIds = []
    showTradeConfirmationModal.value = false
    myTradesPage.value = 1
    await tradesStore.fetchTrades(1, myTradesRpp.value, true)
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

const loadMoreCatalog = async () => {
  if (catalogLoadingMore.value || !catalogHasMore.value) {
    return
  }

  const nextPage = catalogPage.value + 1
  catalogLoadingMore.value = true

  try {
    await cardsStore.fetchCatalog(nextPage, catalogRpp.value)
    catalogPage.value = nextPage
  } catch {
    notify(cardsStore.error ?? 'Falha ao carregar mais cartas.', 'error')
  } finally {
    catalogLoadingMore.value = false
  }
}

const loadMoreMyTrades = async () => {
  if (myTradesLoadingMore.value || !myTradesHasMore.value) {
    return
  }

  const nextPage = myTradesPage.value + 1
  myTradesLoadingMore.value = true

  try {
    await tradesStore.fetchTrades(nextPage, myTradesRpp.value)
    myTradesPage.value = nextPage
  } catch {
    notify(tradesStore.error ?? 'Falha ao carregar mais trocas.', 'error')
  } finally {
    myTradesLoadingMore.value = false
  }
}

const nearBottom = (target: HTMLElement) =>
  target.scrollTop + target.clientHeight >= target.scrollHeight - 100

const onCatalogScroll = (event: Event) => {
  const target = event.target as HTMLElement

  if (nearBottom(target)) {
    void loadMoreCatalog()
  }
}

const onTradeReceivingScroll = (event: Event) => {
  const target = event.target as HTMLElement

  if (nearBottom(target)) {
    void loadMoreCatalog()
  }
}

const onMyTradesScroll = (event: Event) => {
  const target = event.target as HTMLElement

  if (nearBottom(target)) {
    void loadMoreMyTrades()
  }
}

watch(
  myCardIdsSet,
  (ownedIds) => {
    const addable = cardsToAdd.value.filter((cardId) => !ownedIds.has(cardId))
    if (addable.length !== cardsToAdd.value.length) {
      cardsToAdd.value = addable
    }

    const filtered = tradeForm.receivingIds.filter((cardId) => !ownedIds.has(cardId))

    if (filtered.length !== tradeForm.receivingIds.length) {
      tradeForm.receivingIds = filtered
    }
  },
  { immediate: true }
)

watch(
  [activeTab, addableCatalogCards, receivableCatalogCards, catalogHasMore],
  ([tab, addableCards, receivableCards, hasMore]) => {
    if (!hasMore || cardsStore.catalogLoading || catalogLoadingMore.value) {
      return
    }

    if (tab === 'catalog' && addableCards.length === 0) {
      void ensureCatalogOptionsForTab('catalog')
    }

    if (tab === 'trade' && receivableCards.length === 0) {
      void ensureCatalogOptionsForTab('trade')
    }
  },
  { immediate: true }
)

watch(
  () => route.query.tab,
  (tabQuery) => {
    const parsed = parseTab(tabQuery)

    if (parsed !== activeTab.value) {
      activeTab.value = parsed
    }

    if (parsed === 'catalog' || parsed === 'trade') {
      void (async () => {
        await ensureCatalogLoaded()
        await ensureCatalogOptionsForTab(parsed)
      })()
    }

    if (parsed === 'my-trades') {
      void ensureMyTradesLoaded()
    }
  }
)

onMounted(async () => {
  await loadDashboard()
})
</script>

<template>
  <section class="space-y-6">
    <header class="rounded-3xl border border-border/70 bg-card/90 p-6 backdrop-blur">
      <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Painel do jogador</p>
      <h1 class="mt-2 font-display text-4xl font-bold">{{ currentSection.title }}</h1>
      <p class="mt-2 text-muted-foreground">
        {{ currentSection.subtitle }}
      </p>
    </header>

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
          class="relative rounded-xl border border-border/70 bg-card/80 p-3"
        >
          <span
            v-if="isCardNew(card.id)"
            class="absolute right-3 top-3 z-10 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold tracking-[0.08em] text-white"
          >
            NEW
          </span>
          <CardImagePreview
            :src="card.imageUrl"
            :alt="card.name"
            thumb-class="rounded-lg border border-border/60 bg-white/70 p-2"
            image-class="h-72 w-full object-contain"
          />
          <h3 class="mt-3 font-semibold">{{ card.name }}</h3>
          <p class="mt-1 text-sm text-muted-foreground">{{ card.description }}</p>
        </article>
      </div>
    </section>

    <section v-if="activeTab === 'catalog'" class="flex max-h-[78vh] flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-xl font-semibold">Adicionar cartas à conta</h2>
        <div class="flex flex-wrap items-center gap-2">
          <button
            class="rounded-lg border border-border px-3 py-2 text-sm transition hover:border-foreground"
            @click="toggleAllCatalogSelection"
          >
            {{ allCatalogSelected ? 'Desmarcar todas carregadas' : 'Marcar todas carregadas' }}
          </button>
          <button
            class="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            :disabled="cardsStore.myCardsLoading"
            @click="openAddCardsConfirmation"
          >
            Adicionar selecionadas ({{ cardsToAdd.length }})
          </button>
        </div>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/70 bg-card/70 p-3" @scroll.passive="onCatalogScroll">
        <p v-if="isCatalogInitialLoading" class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Carregando cartas do catálogo...
        </p>
        <p v-else-if="shouldShowCatalogEmptyState" class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
          Não há novas cartas disponíveis para adicionar no momento.
        </p>
        <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label
            v-for="card in addableCatalogCards"
            :key="card.id"
            class="group flex h-[21rem] cursor-pointer flex-col rounded-xl border border-border/70 bg-card/80 p-2.5 transition hover:border-foreground"
          >
            <input
              type="checkbox"
              class="mb-2"
              :checked="cardsToAdd.includes(card.id)"
              @change="cardsToAdd = toggleSelection(cardsToAdd, card.id)"
            />
            <CardImagePreview
              :src="card.imageUrl"
              :alt="card.name"
              thumb-class="rounded-lg border border-border/60 bg-white/70 p-1.5"
              image-class="h-40 w-full object-contain"
              action-label="Adicionar à conta"
              :action-disabled="false"
              :action-busy="addingCardFromPreviewId === card.id"
              @action="addCardFromPreview(card.id)"
            />
            <h3 class="mt-2 text-[1rem] font-semibold leading-tight">{{ card.name }}</h3>
            <p class="mt-1 max-h-20 overflow-hidden text-sm text-muted-foreground">{{ card.description }}</p>
          </label>
        </div>

        <p v-if="catalogLoadingMore" class="pt-3 text-center text-sm text-muted-foreground">Carregando mais cartas...</p>
        <button
          v-else-if="catalogHasMore"
          type="button"
          class="mt-3 w-full rounded-lg border border-border px-3 py-2 text-sm font-medium"
          @click="loadMoreCatalog"
        >
          Carregar mais cartas
        </button>
        <p v-else class="pt-3 text-center text-sm text-muted-foreground">Todas as cartas disponíveis já foram carregadas.</p>
      </div>
    </section>

    <section v-if="activeTab === 'trade'" class="grid gap-4 lg:grid-cols-2">
      <article class="rounded-2xl border border-border/70 bg-card/90 p-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-lg font-semibold">1. Selecione o que você oferece</h2>
          <button class="rounded-lg border border-border px-3 py-1.5 text-xs" @click="toggleAllOfferingSelection">
            {{ allOfferingSelected ? 'Desmarcar todos' : 'Marcar todos' }}
          </button>
        </div>
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
            <CardImagePreview
              :src="card.imageUrl"
              :alt="card.name"
              thumb-class="h-16 w-12 rounded-md border border-border/60 bg-white/70 p-0.5"
              image-class="h-full w-full object-contain"
            />
            <span class="text-sm">{{ card.name }}</span>
          </label>
        </div>
      </article>

      <article class="rounded-2xl border border-border/70 bg-card/90 p-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="text-lg font-semibold">2. Selecione o que você quer receber</h2>
          <button class="rounded-lg border border-border px-3 py-1.5 text-xs" @click="toggleAllReceivingSelection">
            {{ allReceivingSelected ? 'Desmarcar todas carregadas' : 'Marcar todas carregadas' }}
          </button>
        </div>
        <p v-if="tradeErrors.receivingIds" class="mt-2 text-xs text-destructive">{{ tradeErrors.receivingIds }}</p>

        <div class="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-2" @scroll.passive="onTradeReceivingScroll">
          <p v-if="isCatalogInitialLoading" class="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Carregando cartas para receber...
          </p>
          <p v-else-if="shouldShowTradeReceivingEmptyState" class="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Não há cartas disponíveis para receber no momento.
          </p>
          <label
            v-else
            v-for="card in receivableCatalogCards"
            :key="card.id"
            class="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-2"
          >
            <input
              type="checkbox"
              :checked="tradeForm.receivingIds.includes(card.id)"
              @change="tradeForm.receivingIds = toggleSelection(tradeForm.receivingIds, card.id)"
            />
            <CardImagePreview
              :src="card.imageUrl"
              :alt="card.name"
              thumb-class="h-16 w-12 rounded-md border border-border/60 bg-white/70 p-0.5"
              image-class="h-full w-full object-contain"
            />
            <span class="text-sm">{{ card.name }}</span>
          </label>

          <p v-if="catalogLoadingMore" class="pt-2 text-center text-xs text-muted-foreground">Carregando mais cartas...</p>
          <button
            v-else-if="catalogHasMore"
            type="button"
            class="w-full rounded-lg border border-border px-3 py-2 text-xs font-medium"
            @click="loadMoreCatalog"
          >
            Carregar mais cartas
          </button>
          <p v-else class="pt-2 text-center text-xs text-muted-foreground">Todas as cartas disponíveis foram carregadas.</p>
        </div>
      </article>

      <button
        class="rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60 lg:col-span-2"
        :disabled="tradesStore.actionLoading"
        @click="openTradeConfirmation"
      >
        {{ tradesStore.actionLoading ? 'Criando solicitação...' : 'Publicar solicitação de troca' }}
      </button>
    </section>

    <section v-if="activeTab === 'my-trades'" class="space-y-4">
      <h2 class="text-xl font-semibold">Solicitações criadas por você</h2>

      <div class="max-h-[74vh] space-y-4 overflow-y-auto rounded-xl border border-border/70 bg-card/70 p-3" @scroll.passive="onMyTradesScroll">
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

        <p v-if="myTradesLoadingMore" class="pt-2 text-center text-sm text-muted-foreground">Carregando mais solicitações...</p>
        <button
          v-else-if="myTradesHasMore"
          type="button"
          class="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium"
          @click="loadMoreMyTrades"
        >
          Carregar mais solicitações
        </button>
        <p v-else-if="myTrades.length > 0" class="pt-2 text-center text-sm text-muted-foreground">
          Você já chegou ao fim das suas solicitações.
        </p>
      </div>
    </section>

    <div
      v-if="showAddCardsConfirmationModal"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      @click.self="showAddCardsConfirmationModal = false"
    >
      <article class="w-full max-w-3xl rounded-2xl border border-border/70 bg-background p-5 shadow-2xl">
        <header class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-semibold">Confirmar adição de cartas</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Revise as cartas selecionadas antes de adicionar à sua conta.
            </p>
          </div>
          <button class="rounded-md border border-border px-2.5 py-1 text-xs" @click="showAddCardsConfirmationModal = false">Fechar</button>
        </header>

        <section class="rounded-xl border border-border/70 bg-card/70 p-3">
          <p class="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Cartas selecionadas ({{ selectedCatalogCardsToAdd.length }})
          </p>
          <ul class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
            <li v-for="card in selectedCatalogCardsToAdd" :key="`confirm-add-${card.id}`" class="flex items-center gap-3">
              <img :src="card.imageUrl" :alt="card.name" class="h-14 w-10 rounded-md border border-border/60 bg-white/70 object-contain p-0.5" />
              <span class="text-sm">{{ card.name }}</span>
            </li>
          </ul>
        </section>

        <footer class="mt-5 flex flex-wrap justify-end gap-2">
          <button class="rounded-lg border border-border px-4 py-2 text-sm" @click="showAddCardsConfirmationModal = false">Cancelar</button>
          <button
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            :disabled="cardsStore.myCardsLoading"
            @click="submitAddCards"
          >
            {{ cardsStore.myCardsLoading ? 'Adicionando...' : 'Confirmar adição' }}
          </button>
        </footer>
      </article>
    </div>

    <div
      v-if="showTradeConfirmationModal"
      class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
      @click.self="showTradeConfirmationModal = false"
    >
      <article class="w-full max-w-3xl rounded-2xl border border-border/70 bg-background p-5 shadow-2xl">
        <header class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 class="text-xl font-semibold">Confirmar solicitação de troca</h3>
            <p class="mt-1 text-sm text-muted-foreground">
              Revise as cartas selecionadas antes de publicar.
            </p>
          </div>
          <button class="rounded-md border border-border px-2.5 py-1 text-xs" @click="showTradeConfirmationModal = false">Fechar</button>
        </header>

        <div class="grid gap-4 md:grid-cols-2">
          <section class="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
              Oferecendo ({{ selectedOfferingCards.length }})
            </p>
            <ul class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              <li v-for="card in selectedOfferingCards" :key="`confirm-offering-${card.id}`" class="flex items-center gap-3">
                <img :src="card.imageUrl" :alt="card.name" class="h-14 w-10 rounded-md border border-border/60 bg-white/70 object-contain p-0.5" />
                <span class="text-sm">{{ card.name }}</span>
              </li>
            </ul>
          </section>

          <section class="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3">
            <p class="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600">
              Recebendo ({{ selectedReceivingCards.length }})
            </p>
            <ul class="mt-3 max-h-64 space-y-2 overflow-y-auto pr-1">
              <li v-for="card in selectedReceivingCards" :key="`confirm-receiving-${card.id}`" class="flex items-center gap-3">
                <img :src="card.imageUrl" :alt="card.name" class="h-14 w-10 rounded-md border border-border/60 bg-white/70 object-contain p-0.5" />
                <span class="text-sm">{{ card.name }}</span>
              </li>
            </ul>
          </section>
        </div>

        <footer class="mt-5 flex flex-wrap justify-end gap-2">
          <button class="rounded-lg border border-border px-4 py-2 text-sm" @click="showTradeConfirmationModal = false">Cancelar</button>
          <button
            class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
            :disabled="tradesStore.actionLoading"
            @click="submitCreateTrade"
          >
            {{ tradesStore.actionLoading ? 'Criando solicitação...' : 'Confirmar e publicar' }}
          </button>
        </footer>
      </article>
    </div>
  </section>
</template>
