interface RegisterForm {
  name: string
  email: string
  password: string
}

interface LoginForm {
  email: string
  password: string
}

interface TradeForm {
  offeringIds: string[]
  receivingIds: string[]
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateRegisterForm = (form: RegisterForm) => {
  const errors: Partial<Record<keyof RegisterForm, string>> = {}

  if (!form.name.trim()) {
    errors.name = 'Informe seu nome.'
  }

  if (!emailRegex.test(form.email)) {
    errors.email = 'Informe um e-mail valido.'
  }

  if (form.password.length < 6) {
    errors.password = 'A senha precisa ter no minimo 6 caracteres.'
  }

  return errors
}

export const validateLoginForm = (form: LoginForm) => {
  const errors: Partial<Record<keyof LoginForm, string>> = {}

  if (!emailRegex.test(form.email)) {
    errors.email = 'Informe um e-mail valido.'
  }

  if (!form.password.trim()) {
    errors.password = 'Informe sua senha.'
  }

  return errors
}

export const validateTradeForm = (form: TradeForm) => {
  const errors: Partial<Record<keyof TradeForm, string>> = {}

  if (form.offeringIds.length === 0) {
    errors.offeringIds = 'Selecione ao menos uma carta para oferecer.'
  }

  if (form.receivingIds.length === 0) {
    errors.receivingIds = 'Selecione ao menos uma carta para receber.'
  }

  const offeringSet = new Set(form.offeringIds)
  const hasOverlap = form.receivingIds.some((cardId) => offeringSet.has(cardId))

  if (hasOverlap) {
    errors.receivingIds = 'Nao e permitido receber a mesma carta que esta sendo oferecida.'
  }

  return errors
}
