# CardFlow Marketplace

SPA para marketplace de troca de cartas, desenvolvida para o teste técnico INMETA.

## Stack

- Vue 3 + Vite + TypeScript
- Pinia para gerenciamento de estado
- Vue Router para navegação SPA
- Tailwind CSS + configuração base do shadcn-vue
- Contexto global com `provide/inject` para toasts e configuração da aplicação

## Funcionalidades implementadas

- Cadastro de usuário
- Login de usuário
- Visualização pública de solicitações de troca
- Adição de cartas à conta autenticada
- Criação de solicitação de troca com cartas oferecidas e desejadas
- Exclusão de solicitações criadas pelo próprio usuário
- Tratamento de erros de API
- Validação de formulários no front-end
- Cache simples de páginas de cartas e trocas em stores

## Configuração

Crie o arquivo `.env` com base em `.env.example`.

```bash
cp .env.example .env
```

## Execução

```bash
npm install
npm run dev
```

A aplicação abre em `http://localhost:5173`.

## Build de produção

```bash
npm run build
npm run preview
```

## API

Base URL padrão:

`https://cards-marketplace-api.onrender.com`

A API pode demorar para responder no primeiro acesso após inatividade.
