<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { theme, toggleTheme } = useTheme()

const label = computed(() => (theme.value === 'dark' ? 'Dark' : 'Light'))
</script>

<template>
  <button
    type="button"
    class="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    :title="theme === 'dark' ? 'Trocar para Pergaminho Dourado' : 'Trocar para Duel Arcano'"
    @click="toggleTheme"
  >
    <span class="h-2 w-2 rounded-full bg-ygo-accent"></span>
    <span>{{ label }}</span>
  </button>
</template>
