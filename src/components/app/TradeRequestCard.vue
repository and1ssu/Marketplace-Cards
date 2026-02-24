<script setup lang="ts">
import { computed } from 'vue'
import CardImagePreview from '@/components/app/CardImagePreview.vue'
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
  <article class="flex min-h-[14rem] max-h-[34rem] flex-col rounded-2xl border border-border/70 bg-card/90 p-5 backdrop-blur">
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

    <div class="mt-5 grid min-h-0 gap-4 md:grid-cols-2">
      <section class="flex min-h-[8rem] min-w-0 flex-col rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600">Oferecendo</p>
        <ul class="mt-2 min-h-[3.5rem] max-h-[18rem] space-y-2 overflow-y-auto pr-1">
          <li v-for="tradeCard in offeringCards" :key="tradeCard.id" class="flex items-center gap-3">
            <CardImagePreview
              :src="tradeCard.card.imageUrl"
              :alt="tradeCard.card.name"
              thumb-class="h-16 w-12 rounded-md border border-border/60 bg-white/70 p-0.5"
              image-class="h-full w-full object-contain"
              modal-image-class="max-h-[90vh] w-auto max-w-[92vw] object-contain"
            />
            <span class="text-sm">{{ tradeCard.card.name }}</span>
          </li>
        </ul>
      </section>

      <section class="flex min-h-[8rem] min-w-0 flex-col rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">Recebendo</p>
        <ul class="mt-2 min-h-[3.5rem] max-h-[18rem] space-y-2 overflow-y-auto pr-1">
          <li v-for="tradeCard in receivingCards" :key="tradeCard.id" class="flex items-center gap-3">
            <CardImagePreview
              :src="tradeCard.card.imageUrl"
              :alt="tradeCard.card.name"
              thumb-class="h-16 w-12 rounded-md border border-border/60 bg-white/70 p-0.5"
              image-class="h-full w-full object-contain"
              modal-image-class="max-h-[90vh] w-auto max-w-[92vw] object-contain"
            />
            <span class="text-sm">{{ tradeCard.card.name }}</span>
          </li>
        </ul>
      </section>
    </div>
  </article>
</template>
