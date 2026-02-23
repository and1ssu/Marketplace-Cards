<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppContext } from '@/context/app-context'
import { validateLoginForm } from '@/lib/validation'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { notify } = useAppContext()

const form = reactive({
  email: '',
  password: ''
})

const errors = reactive<Partial<Record<'email' | 'password', string>>>({})
const formError = ref('')

const submit = async () => {
  Object.assign(errors, { email: undefined, password: undefined })
  formError.value = ''

  const validation = validateLoginForm(form)
  Object.assign(errors, validation)

  if (Object.keys(validation).length > 0) {
    return
  }

  try {
    await authStore.login({ email: form.email, password: form.password })
    notify('Login realizado com sucesso.', 'success')

    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard'
    await router.push(redirect)
  } catch {
    formError.value = authStore.error ?? 'Nao foi possivel entrar.'
  }
}
</script>

<template>
  <section class="mx-auto max-w-md rounded-3xl border border-border/70 bg-card/90 p-6 backdrop-blur">
    <h1 class="font-display text-3xl font-bold">Entrar</h1>
    <p class="mt-2 text-sm text-muted-foreground">Acesse sua conta para gerenciar cartas e trocas.</p>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <div>
        <label class="mb-1 block text-sm font-medium" for="login-email">E-mail</label>
        <input
          id="login-email"
          v-model="form.email"
          type="email"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none transition focus:border-foreground"
          autocomplete="email"
        />
        <p v-if="errors.email" class="mt-1 text-xs text-destructive">{{ errors.email }}</p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium" for="login-password">Senha</label>
        <input
          id="login-password"
          v-model="form.password"
          type="password"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none transition focus:border-foreground"
          autocomplete="current-password"
        />
        <p v-if="errors.password" class="mt-1 text-xs text-destructive">{{ errors.password }}</p>
      </div>

      <p v-if="formError" class="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ formError }}
      </p>

      <button
        class="w-full rounded-lg bg-primary px-4 py-2 font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
        :disabled="authStore.loading"
      >
        {{ authStore.loading ? 'Entrando...' : 'Entrar' }}
      </button>
    </form>
  </section>
</template>
