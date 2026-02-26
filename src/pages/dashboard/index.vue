<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppContext } from '@/context/app-context'
import DashboardAddCardsConfirmationModal from '@/pages/dashboard/components/DashboardAddCardsConfirmationModal.vue'
import DashboardCatalogSection from '@/pages/dashboard/components/DashboardCatalogSection.vue'
import DashboardInventorySection from '@/pages/dashboard/components/DashboardInventorySection.vue'
import DashboardMyTradesSection from '@/pages/dashboard/components/DashboardMyTradesSection.vue'
import DashboardTradeConfirmationModal from '@/pages/dashboard/components/DashboardTradeConfirmationModal.vue'
import DashboardTradeSection from '@/pages/dashboard/components/DashboardTradeSection.vue'
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
const availableCatalogCards = computed(() => catalogCards.value.filter((card) => !myCardIdsSet.value.has(card.id)))
const addableCatalogCards = availableCatalogCards
const receivableCatalogCards = availableCatalogCards

const mapIdsToCards = (cardIds: string[], sourceCards: Card[]) => {
  const cardsById = new Map(sourceCards.map((card) => [card.id, card]))

  return cardIds
    .map((cardId) => cardsById.get(cardId))
    .filter((card): card is Card => Boolean(card))
}

const selectedCatalogCardsToAdd = computed(() => mapIdsToCards(cardsToAdd.value, addableCatalogCards.value))
const selectedOfferingCards = computed(() => mapIdsToCards(tradeForm.offeringIds, cardsStore.myCards))
const selectedReceivingCards = computed(() => mapIdsToCards(tradeForm.receivingIds, receivableCatalogCards.value))

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
const toggleLoadedSelection = (selected: string[], loadedIds: string[], allLoadedSelected: boolean) =>
  allLoadedSelected ? removeCards(selected, loadedIds) : addCards(selected, loadedIds)

const toggleAllCatalogSelection = () => {
  const loadedIds = addableCatalogCards.value.map((card) => card.id)
  cardsToAdd.value = toggleLoadedSelection(cardsToAdd.value, loadedIds, allCatalogSelected.value)
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
  tradeForm.receivingIds = toggleLoadedSelection(tradeForm.receivingIds, loadedIds, allReceivingSelected.value)
}

const toggleCatalogCardSelection = (cardId: string) => {
  cardsToAdd.value = toggleSelection(cardsToAdd.value, cardId)
}

const toggleOfferingCardSelection = (cardId: string) => {
  tradeForm.offeringIds = toggleSelection(tradeForm.offeringIds, cardId)
}

const toggleReceivingCardSelection = (cardId: string) => {
  tradeForm.receivingIds = toggleSelection(tradeForm.receivingIds, cardId)
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

const triggerLoadMoreOnScrollEnd = (event: Event, loadMore: () => Promise<void>) => {
  const target = event.target as HTMLElement

  if (nearBottom(target)) {
    void loadMore()
  }
}

const onCatalogScroll = (event: Event) => triggerLoadMoreOnScrollEnd(event, loadMoreCatalog)

const onTradeReceivingScroll = (event: Event) => triggerLoadMoreOnScrollEnd(event, loadMoreCatalog)
const onMyTradesScroll = (event: Event) => triggerLoadMoreOnScrollEnd(event, loadMoreMyTrades)

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

    <DashboardInventorySection
      v-if="activeTab === 'inventory'"
      :cards="cardsStore.myCards"
      :loading="cardsStore.myCardsLoading"
      :is-card-new="isCardNew"
      @refresh="cardsStore.fetchMyCards(true)"
    />

    <DashboardCatalogSection
      v-if="activeTab === 'catalog'"
      :all-catalog-selected="allCatalogSelected"
      :my-cards-loading="cardsStore.myCardsLoading"
      :selected-card-ids="cardsToAdd"
      :cards="addableCatalogCards"
      :adding-card-from-preview-id="addingCardFromPreviewId"
      :catalog-loading-more="catalogLoadingMore"
      :catalog-has-more="catalogHasMore"
      :is-catalog-initial-loading="isCatalogInitialLoading"
      :should-show-catalog-empty-state="shouldShowCatalogEmptyState"
      @toggle-all="toggleAllCatalogSelection"
      @open-confirm="openAddCardsConfirmation"
      @toggle-card="toggleCatalogCardSelection"
      @add-from-preview="addCardFromPreview"
      @load-more="loadMoreCatalog"
      @scroll="onCatalogScroll"
    />

    <DashboardTradeSection
      v-if="activeTab === 'trade'"
      :my-cards="cardsStore.myCards"
      :all-offering-selected="allOfferingSelected"
      :offering-ids="tradeForm.offeringIds"
      :all-receiving-selected="allReceivingSelected"
      :receiving-ids="tradeForm.receivingIds"
      :receivable-cards="receivableCatalogCards"
      :offering-error="tradeErrors.offeringIds"
      :receiving-error="tradeErrors.receivingIds"
      :is-catalog-initial-loading="isCatalogInitialLoading"
      :should-show-trade-receiving-empty-state="shouldShowTradeReceivingEmptyState"
      :catalog-loading-more="catalogLoadingMore"
      :catalog-has-more="catalogHasMore"
      :action-loading="tradesStore.actionLoading"
      @toggle-all-offering="toggleAllOfferingSelection"
      @toggle-offering="toggleOfferingCardSelection"
      @toggle-all-receiving="toggleAllReceivingSelection"
      @toggle-receiving="toggleReceivingCardSelection"
      @scroll-receiving="onTradeReceivingScroll"
      @load-more-receiving="loadMoreCatalog"
      @open-trade-confirmation="openTradeConfirmation"
    />

    <DashboardMyTradesSection
      v-if="activeTab === 'my-trades'"
      :trades="myTrades"
      :action-loading="tradesStore.actionLoading"
      :loading-more="myTradesLoadingMore"
      :has-more="myTradesHasMore"
      @delete-trade="removeTrade"
      @load-more="loadMoreMyTrades"
      @scroll="onMyTradesScroll"
    />

    <DashboardAddCardsConfirmationModal
      :visible="showAddCardsConfirmationModal"
      :selected-cards="selectedCatalogCardsToAdd"
      :loading="cardsStore.myCardsLoading"
      @close="showAddCardsConfirmationModal = false"
      @confirm="submitAddCards"
    />

    <DashboardTradeConfirmationModal
      :visible="showTradeConfirmationModal"
      :offering-cards="selectedOfferingCards"
      :receiving-cards="selectedReceivingCards"
      :loading="tradesStore.actionLoading"
      @close="showTradeConfirmationModal = false"
      @confirm="submitCreateTrade"
    />
  </section>
</template>
