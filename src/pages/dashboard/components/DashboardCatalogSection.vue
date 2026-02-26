<script setup lang="ts">
import CardImagePreview from '@/components/app/CardImagePreview.vue'
import type { Card } from '@/types/marketplace'

defineProps<{
  allCatalogSelected: boolean
  myCardsLoading: boolean
  selectedCardIds: string[]
  cards: Card[]
  addingCardFromPreviewId: string | null
  catalogLoadingMore: boolean
  catalogHasMore: boolean
  isCatalogInitialLoading: boolean
  shouldShowCatalogEmptyState: boolean
}>()

const emit = defineEmits<{
  toggleAll: []
  openConfirm: []
  toggleCard: [cardId: string]
  addFromPreview: [cardId: string]
  loadMore: []
  scroll: [event: Event]
}>()
</script>

<template>
  <section class="flex max-h-[78vh] flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-xl font-semibold">Adicionar cartas à conta</h2>
      <div class="flex flex-wrap items-center gap-2">
        <button
          class="rounded-lg border border-border px-3 py-2 text-sm transition hover:border-foreground"
          @click="emit('toggleAll')"
        >
          {{ allCatalogSelected ? 'Desmarcar todas carregadas' : 'Marcar todas carregadas' }}
        </button>
        <button
          class="rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          :disabled="myCardsLoading"
          @click="emit('openConfirm')"
        >
          Adicionar selecionadas ({{ selectedCardIds.length }})
        </button>
      </div>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/70 bg-card/70 p-3" @scroll.passive="emit('scroll', $event)">
      <p v-if="isCatalogInitialLoading" class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        Carregando cartas do catálogo...
      </p>
      <p v-else-if="shouldShowCatalogEmptyState" class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        Não há novas cartas disponíveis para adicionar no momento.
      </p>
      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label
          v-for="card in cards"
          :key="card.id"
          class="group flex h-[21rem] cursor-pointer flex-col rounded-xl border border-border/70 bg-card/80 p-2.5 transition hover:border-foreground"
        >
          <input
            type="checkbox"
            class="mb-2"
            :checked="selectedCardIds.includes(card.id)"
            @change="emit('toggleCard', card.id)"
          />
          <CardImagePreview
            :src="card.imageUrl"
            :alt="card.name"
            thumb-class="rounded-lg border border-border/60 bg-white/70 p-1.5"
            image-class="h-40 w-full object-contain"
            action-label="Adicionar à conta"
            :action-disabled="false"
            :action-busy="addingCardFromPreviewId === card.id"
            @action="emit('addFromPreview', card.id)"
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
        @click="emit('loadMore')"
      >
        Carregar mais cartas
      </button>
      <p v-else class="pt-3 text-center text-sm text-muted-foreground">Todas as cartas disponíveis já foram carregadas.</p>
    </div>
  </section>
</template>
