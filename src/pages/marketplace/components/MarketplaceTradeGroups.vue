<script setup lang="ts">
import TradeRequestCard from '@/components/app/TradeRequestCard.vue'
import type { Trade } from '@/types/marketplace'

type TradeGroup = {
  userId: string
  userName: string
  trades: Trade[]
}

const props = defineProps<{
  groups: TradeGroup[]
  openGroups: Record<string, boolean>
  currentUserId?: string
  actionLoading: boolean
  onEnter: (element: Element, done: () => void) => void
  onLeave: (element: Element, done: () => void) => void
}>()

const emit = defineEmits<{
  toggleGroup: [userId: string]
  deleteTrade: [tradeId: string]
}>()
</script>

<template>
  <div class="grid gap-4">
    <article
      v-for="group in groups"
      :key="group.userId"
      data-gsap="trade-group"
      class="rounded-2xl border border-border/70 bg-card/80 p-3"
    >
      <button
        type="button"
        class="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left transition hover:bg-accent/60"
        @click="emit('toggleGroup', group.userId)"
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

      <Transition :css="false" @enter="props.onEnter" @leave="props.onLeave">
        <div v-if="openGroups[group.userId]" class="mt-3 grid gap-4">
          <TradeRequestCard
            v-for="trade in group.trades"
            :key="trade.id"
            :trade="trade"
            :can-delete="props.currentUserId === trade.userId"
            :busy="actionLoading"
            @delete="emit('deleteTrade', $event)"
          />
        </div>
      </Transition>
    </article>
  </div>
</template>
