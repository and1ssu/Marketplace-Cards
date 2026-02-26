<script setup lang="ts">
import type { CSSProperties } from 'vue'

defineProps<{
  heroStyle: CSSProperties
  groupedTradesCount: number
  tradesCount: number
  isAuthenticated: boolean
}>()
</script>

<template>
  <header
    data-gsap="marketplace-hero"
    class="relative overflow-hidden rounded-3xl border border-border/60 shadow-xl shadow-black/10"
  >
    <div class="absolute inset-0 bg-cover bg-center bg-no-repeat" :style="heroStyle"></div>
    <div class="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/35 to-slate-950/10"></div>
    <div class="relative p-6 sm:p-8" style="text-shadow: 0 2px 14px rgba(0, 0, 0, 0.5)">
      <p class="text-xs uppercase tracking-[0.2em] text-slate-100">Marketplace</p>
      <h1 class="mt-2 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-5xl">
        Trocas de cartas abertas
      </h1>
      <p class="mt-3 max-w-2xl text-sm text-slate-100/95 sm:text-base">
        Explore as ofertas da comunidade. Visitantes podem visualizar tudo e usuários logados podem gerenciar suas solicitações.
      </p>
      <div class="mt-5 flex flex-wrap gap-2">
        <span class="rounded-full border border-white/45 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {{ groupedTradesCount }} solicitantes
        </span>
        <span class="rounded-full border border-white/45 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {{ tradesCount }} trocas carregadas
        </span>
        <span class="rounded-full border border-white/45 bg-white/20 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
          {{ isAuthenticated ? 'Modo autenticado' : 'Modo visitante' }}
        </span>
      </div>
    </div>
  </header>
</template>
