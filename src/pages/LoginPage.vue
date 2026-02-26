<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppContext } from '@/context/app-context'
import { mountGoogleSignInButton } from '@/lib/google-auth'
import { validateLoginForm } from '@/lib/validation'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const { notify } = useAppContext()
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
const hasGoogleClientId = computed(() => Boolean(googleClientId))
const googleButtonRef = ref<HTMLElement | null>(null)

const form = reactive({
  email: '',
  password: ''
})

const errors = reactive<Partial<Record<'email' | 'password', string>>>({})
const formError = ref('')
const googleError = ref('')

const getRedirectPath = () => (typeof route.query.redirect === 'string' ? route.query.redirect : '/dashboard')

const submit = async () => {
  Object.assign(errors, { email: undefined, password: undefined })
  formError.value = ''
  googleError.value = ''

  const validation = validateLoginForm(form)
  Object.assign(errors, validation)

  if (Object.keys(validation).length > 0) {
    return
  }

  try {
    await authStore.login({ email: form.email, password: form.password })
    notify('Login realizado com sucesso.', 'success')
    await router.push(getRedirectPath())
  } catch {
    formError.value = authStore.error ?? 'Nao foi possivel entrar.'
  }
}

const submitGoogle = async (credential: string) => {
  formError.value = ''
  googleError.value = ''

  try {
    await authStore.loginWithGoogleCredential(credential)
    notify('Login com Google realizado com sucesso.', 'success')
    await router.push(getRedirectPath())
  } catch {
    googleError.value = authStore.error ?? 'Nao foi possivel entrar com Google.'
  }
}

onMounted(async () => {
  if (!hasGoogleClientId.value || !googleButtonRef.value) {
    return
  }

  try {
    await mountGoogleSignInButton(googleButtonRef.value, googleClientId as string, (credential) => {
      void submitGoogle(credential)
    })
  } catch {
    googleError.value = 'Nao foi possivel carregar o login com Google.'
  }
})
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

    <div class="mt-5">
      <div class="flex items-center gap-3 text-xs uppercase tracking-[0.14em] text-muted-foreground">
        <span class="h-px flex-1 bg-border/70"></span>
        <span>ou</span>
        <span class="h-px flex-1 bg-border/70"></span>
      </div>

      <div class="mt-4 flex min-h-11 justify-center">
        <div v-if="hasGoogleClientId" ref="googleButtonRef"></div>
        <p v-else class="text-xs text-muted-foreground">Login com Google indisponivel neste ambiente.</p>
      </div>

      <p v-if="googleError" class="mt-3 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {{ googleError }}
      </p>
    </div>
  </section>
</template>
