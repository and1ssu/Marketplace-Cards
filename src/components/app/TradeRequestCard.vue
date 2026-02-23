<script setup lang="ts">
import { computed } from 'vue'
import type { Trade } from '@/types/marketplace'

const props = defineProps<{
  trade: Trade
  canDelete?: boolean
  busy?: boolean
}>()

const emit = defineEmits<{
  delete: [tradeId: string]
}>()

const offeringCards = computed(() =>
  props.trade.tradeCards.filter((tradeCard) => tradeCard.type === 'OFFERING')
)

const receivingCards = computed(() =>
  props.trade.tradeCards.filter((tradeCard) => tradeCard.type === 'RECEIVING')
)

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(props.trade.createdAt))
)
</script>

<template>
  <article class="rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur">
    <header class="flex items-start justify-between gap-4">
      <div>
        <p class="text-sm text-muted-foreground">Solicitante</p>
        <h3 class="font-semibold">{{ trade.user.name }}</h3>
      </div>
      <div class="text-right text-xs text-muted-foreground">
        <p>{{ formattedDate }}</p>
        <button
          v-if="canDelete"
          class="mt-2 rounded-md bg-destructive px-3 py-1.5 text-xs font-medium text-destructive-foreground transition hover:opacity-90 disabled:opacity-60"
          :disabled="busy"
          @click="emit('delete', trade.id)"
        >
          Excluir
        </button>
      </div>
    </header>

    <div class="mt-5 grid gap-4 md:grid-cols-2">
      <section class="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Oferecendo</p>
        <ul class="mt-2 space-y-2">
          <li v-for="tradeCard in offeringCards" :key="tradeCard.id" class="flex items-center gap-2">
            <img
              :src="tradeCard.card.imageUrl"
              :alt="tradeCard.card.name"
              class="h-10 w-8 rounded object-cover"
              loading="lazy"
            />
            <span class="text-sm">{{ tradeCard.card.name }}</span>
          </li>
        </ul>
      </section>

      <section class="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Recebendo</p>
        <ul class="mt-2 space-y-2">
          <li v-for="tradeCard in receivingCards" :key="tradeCard.id" class="flex items-center gap-2">
            <img
              :src="tradeCard.card.imageUrl"
              :alt="tradeCard.card.name"
              class="h-10 w-8 rounded object-cover"
              loading="lazy"
            />
            <span class="text-sm">{{ tradeCard.card.name }}</span>
          </li>
        </ul>
      </section>
    </div>
  </article>
</template>
