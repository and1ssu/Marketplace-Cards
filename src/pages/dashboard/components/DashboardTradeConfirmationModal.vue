<script setup lang="ts">
import DashboardSelectedCardsList from '@/pages/dashboard/components/DashboardSelectedCardsList.vue'
import type { Card } from '@/types/marketplace'

defineProps<{
  visible: boolean
  offeringCards: Card[]
  receivingCards: Card[]
  loading: boolean
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4"
    @click.self="emit('close')"
  >
    <article class="w-full max-w-3xl rounded-2xl border border-border/70 bg-background p-5 shadow-2xl">
      <header class="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 class="text-xl font-semibold">Confirmar solicitação de troca</h3>
          <p class="mt-1 text-sm text-muted-foreground">
            Revise as cartas selecionadas antes de publicar.
          </p>
        </div>
        <button class="rounded-md border border-border px-2.5 py-1 text-xs" @click="emit('close')">Fechar</button>
      </header>

      <div class="grid gap-4 md:grid-cols-2">
        <DashboardSelectedCardsList
          title="Oferecendo"
          :cards="offeringCards"
          section-class="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"
          title-class="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600"
        />

        <DashboardSelectedCardsList
          title="Recebendo"
          :cards="receivingCards"
          section-class="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-3"
          title-class="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-600"
        />
      </div>

      <footer class="mt-5 flex flex-wrap justify-end gap-2">
        <button class="rounded-lg border border-border px-4 py-2 text-sm" @click="emit('close')">Cancelar</button>
        <button
          class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          :disabled="loading"
          @click="emit('confirm')"
        >
          {{ loading ? 'Criando solicitação...' : 'Confirmar e publicar' }}
        </button>
      </footer>
    </article>
  </div>
</template>
