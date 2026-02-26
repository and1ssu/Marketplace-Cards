<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAppContext } from '@/context/app-context'
import { getStoredAvatar, removeStoredAvatar, setStoredAvatar } from '@/lib/profile-avatar'
import { useAuthStore } from '@/stores/auth'

const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024

const authStore = useAuthStore()
const { notify } = useAppContext()

const avatarUrl = ref<string | null>(null)
const avatarBusy = ref(false)
const avatarError = ref('')

const user = computed(() => authStore.user)
const userInitial = computed(() => user.value?.name?.trim().charAt(0).toUpperCase() || 'U')

const loadStoredAvatar = () => {
  if (!user.value?.id) {
    avatarUrl.value = null
    return
  }

  avatarUrl.value = getStoredAvatar(user.value.id)
}

const onAvatarSelected = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  avatarError.value = ''

  if (!user.value?.id || !file) {
    return
  }

  if (!file.type.startsWith('image/')) {
    avatarError.value = 'Selecione um arquivo de imagem valido.'
    return
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    avatarError.value = 'A imagem deve ter no maximo 2MB.'
    return
  }

  avatarBusy.value = true
  const reader = new FileReader()

  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : null

    if (!result) {
      avatarBusy.value = false
      avatarError.value = 'Nao foi possivel processar a imagem.'
      return
    }

    const saved = setStoredAvatar(user.value?.id ?? '', result)
    avatarBusy.value = false

    if (!saved) {
      avatarError.value = 'Falha ao salvar avatar no navegador.'
      return
    }

    avatarUrl.value = result
    notify('Avatar salvo no navegador.', 'success')
  }

  reader.onerror = () => {
    avatarBusy.value = false
    avatarError.value = 'Nao foi possivel ler o arquivo.'
  }

  reader.readAsDataURL(file)
  input.value = ''
}

const clearAvatar = () => {
  if (!user.value?.id) {
    return
  }

  avatarError.value = ''
  const removed = removeStoredAvatar(user.value.id)

  if (!removed) {
    avatarError.value = 'Falha ao remover avatar do navegador.'
    return
  }

  avatarUrl.value = null
  notify('Avatar removido.', 'info')
}

watch(
  () => user.value?.id,
  () => {
    loadStoredAvatar()
  }
)

onMounted(() => {
  loadStoredAvatar()
})
</script>

<template>
  <section class="space-y-6">
    <header class="rounded-3xl border border-border/70 bg-card/90 p-6 backdrop-blur">
      <p class="text-xs uppercase tracking-[0.18em] text-muted-foreground">Conta</p>
      <h1 class="mt-2 font-display text-4xl font-bold">Meu perfil</h1>
      <p class="mt-2 text-muted-foreground">
        Dados da conta autenticada e avatar salvo somente neste navegador.
      </p>
    </header>

    <div class="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <article class="rounded-2xl border border-border/70 bg-card/90 p-4">
        <h2 class="text-lg font-semibold">Avatar</h2>

        <div class="mt-4 flex justify-center">
          <div class="flex h-36 w-36 items-center justify-center overflow-hidden rounded-full border border-border/70 bg-accent/50">
            <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar do usuario" class="h-full w-full object-cover" />
            <span v-else class="text-5xl font-semibold text-muted-foreground">{{ userInitial }}</span>
          </div>
        </div>

        <p class="mt-4 text-xs text-muted-foreground">
          Formatos aceitos: imagens em geral. Tamanho maximo: 2MB.
        </p>

        <div class="mt-3 flex flex-wrap gap-2">
          <label
            class="inline-flex cursor-pointer items-center rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
            :class="avatarBusy ? 'pointer-events-none opacity-60' : ''"
          >
            {{ avatarBusy ? 'Salvando...' : 'Selecionar imagem' }}
            <input type="file" accept="image/*" class="hidden" @change="onAvatarSelected" />
          </label>
          <button
            type="button"
            class="rounded-lg border border-border px-3 py-2 text-sm transition hover:border-foreground disabled:opacity-50"
            :disabled="!avatarUrl || avatarBusy"
            @click="clearAvatar"
          >
            Remover avatar
          </button>
        </div>

        <p v-if="avatarError" class="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ avatarError }}
        </p>
      </article>

      <article class="rounded-2xl border border-border/70 bg-card/90 p-4">
        <h2 class="text-lg font-semibold">Dados do usuario</h2>

        <dl class="mt-4 space-y-3">
          <div class="rounded-xl border border-border/70 bg-background/50 p-3">
            <dt class="text-xs uppercase tracking-[0.12em] text-muted-foreground">Nome</dt>
            <dd class="mt-1 text-sm font-medium">{{ user?.name ?? '-' }}</dd>
          </div>
          <div class="rounded-xl border border-border/70 bg-background/50 p-3">
            <dt class="text-xs uppercase tracking-[0.12em] text-muted-foreground">E-mail</dt>
            <dd class="mt-1 text-sm font-medium">{{ user?.email ?? '-' }}</dd>
          </div>
          <div class="rounded-xl border border-border/70 bg-background/50 p-3">
            <dt class="text-xs uppercase tracking-[0.12em] text-muted-foreground">ID</dt>
            <dd class="mt-1 break-all text-sm font-medium">{{ user?.id ?? '-' }}</dd>
          </div>
        </dl>

        <p class="mt-4 text-xs text-muted-foreground">
          Edicao de nome/e-mail/avatar no backend nao esta disponivel nesta versao da API.
        </p>
      </article>
    </div>
  </section>
</template>
