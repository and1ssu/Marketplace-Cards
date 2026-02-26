<script setup lang="ts">
import TradeRequestCard from '@/components/app/TradeRequestCard.vue'
import type { Trade } from '@/types/marketplace'

defineProps<{
  trades: Trade[]
  actionLoading: boolean
  loadingMore: boolean
  hasMore: boolean
}>()

const emit = defineEmits<{
  deleteTrade: [tradeId: string]
  loadMore: []
  scroll: [event: Event]
}>()
</script>

<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">Solicitações criadas por você</h2>

    <div class="max-h-[74vh] space-y-4 overflow-y-auto rounded-xl border border-border/70 bg-card/70 p-3" @scroll.passive="emit('scroll', $event)">
      <p v-if="trades.length === 0" class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
        Você ainda não publicou solicitações de troca.
      </p>

      <TradeRequestCard
        v-for="trade in trades"
        :key="trade.id"
        :trade="trade"
        can-delete
        :busy="actionLoading"
        @delete="emit('deleteTrade', $event)"
      />

      <p v-if="loadingMore" class="pt-2 text-center text-sm text-muted-foreground">Carregando mais solicitações...</p>
      <button
        v-else-if="hasMore"
        type="button"
        class="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium"
        @click="emit('loadMore')"
      >
        Carregar mais solicitações
      </button>
      <p v-else-if="trades.length > 0" class="pt-2 text-center text-sm text-muted-foreground">
        Você já chegou ao fim das suas solicitações.
      </p>
    </div>
  </section>
</template>
