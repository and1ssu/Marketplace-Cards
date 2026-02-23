<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppContext } from '@/context/app-context'
import { validateRegisterForm } from '@/lib/validation'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const { notify } = useAppContext()

const form = reactive({
  name: '',
  email: '',
  password: ''
})

const errors = reactive<Partial<Record<'name' | 'email' | 'password', string>>>({})
const formError = ref('')

const submit = async () => {
  Object.assign(errors, { name: undefined, email: undefined, password: undefined })
  formError.value = ''

  const validation = validateRegisterForm(form)
  Object.assign(errors, validation)

  if (Object.keys(validation).length > 0) {
    return
  }

  try {
    await authStore.register({
      name: form.name,
      email: form.email,
      password: form.password
    })

    await authStore.login({
      email: form.email,
      password: form.password
    })

    notify('Cadastro concluido com sucesso.', 'success')
    await router.push('/dashboard')
  } catch {
    formError.value = authStore.error ?? 'Nao foi possivel criar a conta.'
  }
}
</script>

<template>
  <section class="mx-auto max-w-md rounded-3xl border border-border/70 bg-card/90 p-6 backdrop-blur">
    <h1 class="font-display text-3xl font-bold">Criar conta</h1>
    <p class="mt-2 text-sm text-muted-foreground">Registre-se para iniciar suas trocas no marketplace.</p>

    <form class="mt-6 space-y-4" @submit.prevent="submit">
      <div>
        <label class="mb-1 block text-sm font-medium" for="register-name">Nome</label>
        <input
          id="register-name"
          v-model="form.name"
          type="text"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none transition focus:border-foreground"
          autocomplete="name"
        />
        <p v-if="errors.name" class="mt-1 text-xs text-destructive">{{ errors.name }}</p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium" for="register-email">E-mail</label>
        <input
          id="register-email"
          v-model="form.email"
          type="email"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none transition focus:border-foreground"
          autocomplete="email"
        />
        <p v-if="errors.email" class="mt-1 text-xs text-destructive">{{ errors.email }}</p>
      </div>

      <div>
        <label class="mb-1 block text-sm font-medium" for="register-password">Senha</label>
        <input
          id="register-password"
          v-model="form.password"
          type="password"
          class="w-full rounded-lg border border-border bg-background px-3 py-2 outline-none transition focus:border-foreground"
          autocomplete="new-password"
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
        {{ authStore.loading ? 'Criando conta...' : 'Criar conta' }}
      </button>
    </form>
  </section>
</template>
