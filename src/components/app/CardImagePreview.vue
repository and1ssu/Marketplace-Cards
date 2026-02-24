<script setup lang="ts">
import { ref } from 'vue'

withDefaults(
  defineProps<{
    src: string
    alt: string
    thumbClass?: string
    imageClass?: string
    modalImageClass?: string
    actionLabel?: string
    actionDisabled?: boolean
    actionBusy?: boolean
  }>(),
  {
    thumbClass: 'rounded-lg border border-border/60 bg-muted/30 p-2',
    imageClass: 'h-52 w-full object-contain',
    modalImageClass: 'max-h-[88vh] w-auto max-w-[92vw] object-contain',
    actionLabel: '',
    actionDisabled: false,
    actionBusy: false
  }
)

const emit = defineEmits<{
  action: []
}>()

const isOpen = ref(false)

const open = () => {
  isOpen.value = true
}

const close = () => {
  isOpen.value = false
}

const runAction = () => {
  emit('action')
}
</script>

<template>
  <div>
    <button type="button" :class="['w-full overflow-hidden transition hover:opacity-95', thumbClass]" @click="open">
      <img :src="src" :alt="alt" :class="imageClass" loading="lazy" />
    </button>

    <Teleport to="body">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"
        @click="close"
      >
        <div class="flex flex-col items-center gap-3" @click.stop>
          <img :src="src" :alt="alt" :class="modalImageClass" />

          <div class="flex items-center gap-2">
            <button
              v-if="actionLabel"
              type="button"
              class="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
              :disabled="actionDisabled || actionBusy"
              @click="runAction"
            >
              {{ actionBusy ? 'Adicionando...' : actionLabel }}
            </button>
            <button
              type="button"
              class="rounded-lg border border-white/40 bg-black/60 px-3 py-1.5 text-sm text-white"
              @click="close"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
