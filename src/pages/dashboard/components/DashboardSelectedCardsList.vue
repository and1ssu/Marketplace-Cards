<script setup lang="ts">
import type { Card } from '@/types/marketplace'

defineProps<{
  title: string
  cards: Card[]
  sectionClass?: string
  titleClass?: string
}>()
</script>

<template>
  <section :class="sectionClass ?? 'rounded-xl border border-border/70 bg-card/70 p-3'">
    <p :class="titleClass ?? 'text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'">
      {{ title }} ({{ cards.length }})
    </p>
    <ul class="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
      <li v-for="card in cards" :key="card.id" class="flex items-center gap-3">
        <img :src="card.imageUrl" :alt="card.name" class="h-14 w-10 rounded-md border border-border/60 bg-white/70 object-contain p-0.5" />
        <span class="text-sm">{{ card.name }}</span>
      </li>
    </ul>
  </section>
</template>
