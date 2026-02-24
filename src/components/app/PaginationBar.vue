<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    page: number
    rpp: number
    count: number
    hasMore: boolean
    loading?: boolean
    totalItems?: number | null
    totalPages?: number | null
    label?: string
    rppOptions?: number[]
  }>(),
  {
    loading: false,
    totalItems: null,
    totalPages: null,
    label: 'itens',
    rppOptions: () => [6, 10, 12, 24]
  }
)

const emit = defineEmits<{
  changePage: [page: number]
  changeRpp: [rpp: number]
}>()

const canGoPrev = computed(() => props.page > 1 && !props.loading)
const canGoFirst = canGoPrev
const canGoNext = computed(() => props.hasMore && !props.loading)
const canGoLast = computed(() => Boolean(props.totalPages && props.page < props.totalPages && !props.loading))

const summaryText = computed(() => {
  if (props.totalItems && props.totalPages) {
    return `Mostrando ${props.count} de ${props.totalItems} ${props.label} - Pagina ${props.page} de ${props.totalPages}`
  }

  return `Mostrando ${props.count} ${props.label} - Pagina ${props.page}`
})

const onRppChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  const value = Number(target.value)

  if (!Number.isNaN(value) && value > 0) {
    emit('changeRpp', value)
  }
}
</script>

<template>
  <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-card/80 p-3">
    <p class="text-sm text-muted-foreground">{{ summaryText }}</p>

    <div class="flex items-center gap-2">
      <label class="mr-1 text-sm font-medium">Itens por pagina</label>
      <select
        :value="rpp"
        class="rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none"
        @change="onRppChange"
      >
        <option v-for="option in rppOptions" :key="option" :value="option">{{ option }}</option>
      </select>

      <button
        type="button"
        class="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        :disabled="!canGoFirst"
        @click="emit('changePage', 1)"
      >
        «
      </button>
      <button
        type="button"
        class="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        :disabled="!canGoPrev"
        @click="emit('changePage', page - 1)"
      >
        ‹
      </button>
      <button
        type="button"
        class="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        :disabled="!canGoNext"
        @click="emit('changePage', page + 1)"
      >
        ›
      </button>
      <button
        type="button"
        class="rounded-lg border border-border px-3 py-1.5 text-sm disabled:opacity-40"
        :disabled="!canGoLast"
        @click="totalPages && emit('changePage', totalPages)"
      >
        »
      </button>
    </div>
  </div>
</template>
