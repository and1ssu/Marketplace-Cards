<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import lightThemeIcon from '@/assets/img/horus-sol-vetor.jpg'
import darkThemeIcon from '@/assets/img/piramide-lua-vetor.jpg'

const { theme, toggleTheme } = useTheme()

const themeIcon = computed(() => (theme.value === 'dark' ? darkThemeIcon : lightThemeIcon))
const themeIconAlt = computed(() => (theme.value === 'dark' ? 'Ícone de tema escuro' : 'Ícone de tema claro'))
const themeTooltip = computed(() => (theme.value === 'dark' ? 'Tema dark' : 'Tema light'))
</script>

<template>
  <button
    type="button"
    class="group relative inline-flex items-center justify-center rounded-lg border border-border bg-background p-2.5 text-sm font-medium text-foreground transition hover:border-ygo-accent/50 hover:bg-ygo-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    :aria-label="themeTooltip"
    @click="toggleTheme"
  >
    <span
      class="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-border/70 bg-card px-2 py-1 text-xs text-foreground opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      aria-hidden="true"
    >
      {{ themeTooltip }}
    </span>
    <span class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-ygo-accent/45 bg-ygo-accent/15 shadow-sm">
      <img :src="themeIcon" :alt="themeIconAlt" class="h-8 w-8 rounded-full object-contain" />
    </span>
  </button>
</template>
