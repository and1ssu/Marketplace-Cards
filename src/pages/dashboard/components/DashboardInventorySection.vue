<script setup lang="ts">
import CardImagePreview from '@/components/app/CardImagePreview.vue'
import type { Card } from '@/types/marketplace'

defineProps<{
  cards: Card[]
  loading: boolean
  isCardNew: (cardId: string) => boolean
}>()

const emit = defineEmits<{
  refresh: []
}>()
</script>

<template>
  <section class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-semibold">Minha coleção</h2>
      <button
        class="rounded-lg border border-border px-3 py-2 text-sm transition hover:border-foreground"
        :disabled="loading"
        @click="emit('refresh')"
      >
        Atualizar
      </button>
    </div>

    <p v-if="loading" class="text-sm text-muted-foreground">Carregando coleção...</p>
    <p v-else-if="cards.length === 0" class="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
      Você ainda não adicionou cartas na sua conta.
    </p>

    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="card in cards"
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
</template>
