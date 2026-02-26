<script setup lang="ts">
import CardImagePreview from '@/components/app/CardImagePreview.vue'
import type { Card } from '@/types/marketplace'

defineProps<{
  myCards: Card[]
  allOfferingSelected: boolean
  offeringIds: string[]
  allReceivingSelected: boolean
  receivingIds: string[]
  receivableCards: Card[]
  offeringError?: string
  receivingError?: string
  isCatalogInitialLoading: boolean
  shouldShowTradeReceivingEmptyState: boolean
  catalogLoadingMore: boolean
  catalogHasMore: boolean
  actionLoading: boolean
}>()

const emit = defineEmits<{
  toggleAllOffering: []
  toggleOffering: [cardId: string]
  toggleAllReceiving: []
  toggleReceiving: [cardId: string]
  scrollReceiving: [event: Event]
  loadMoreReceiving: []
  openTradeConfirmation: []
}>()
</script>

<template>
  <section class="grid gap-4 lg:grid-cols-2">
    <article class="rounded-2xl border border-border/70 bg-card/90 p-4">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-semibold">1. Selecione o que você oferece</h2>
        <button class="rounded-lg border border-border px-3 py-1.5 text-xs" @click="emit('toggleAllOffering')">
          {{ allOfferingSelected ? 'Desmarcar todos' : 'Marcar todos' }}
        </button>
      </div>
      <p v-if="offeringError" class="mt-2 text-xs text-destructive">{{ offeringError }}</p>

      <div class="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-2">
        <label
          v-for="card in myCards"
          :key="card.id"
          class="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-2"
        >
          <input type="checkbox" :checked="offeringIds.includes(card.id)" @change="emit('toggleOffering', card.id)" />
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
        <button class="rounded-lg border border-border px-3 py-1.5 text-xs" @click="emit('toggleAllReceiving')">
          {{ allReceivingSelected ? 'Desmarcar todas carregadas' : 'Marcar todas carregadas' }}
        </button>
      </div>
      <p v-if="receivingError" class="mt-2 text-xs text-destructive">{{ receivingError }}</p>

      <div class="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-2" @scroll.passive="emit('scrollReceiving', $event)">
        <p v-if="isCatalogInitialLoading" class="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Carregando cartas para receber...
        </p>
        <p
          v-else-if="shouldShowTradeReceivingEmptyState"
          class="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground"
        >
          Não há cartas disponíveis para receber no momento.
        </p>
        <label
          v-else
          v-for="card in receivableCards"
          :key="card.id"
          class="flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 p-2"
        >
          <input type="checkbox" :checked="receivingIds.includes(card.id)" @change="emit('toggleReceiving', card.id)" />
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
          @click="emit('loadMoreReceiving')"
        >
          Carregar mais cartas
        </button>
        <p v-else class="pt-2 text-center text-xs text-muted-foreground">Todas as cartas disponíveis foram carregadas.</p>
      </div>
    </article>

    <button
      class="rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60 lg:col-span-2"
      :disabled="actionLoading"
      @click="emit('openTradeConfirmation')"
    >
      {{ actionLoading ? 'Criando solicitação...' : 'Publicar solicitação de troca' }}
    </button>
  </section>
</template>
