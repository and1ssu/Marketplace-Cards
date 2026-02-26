# CardFlow Marketplace

SPA para marketplace de troca de cartas, desenvolvida para o teste técnico INMETA.

## Stack

- Vue 3 + Vite + TypeScript
- Pinia para gerenciamento de estado
- Vue Router para navegação SPA
- Tailwind CSS + configuração base do shadcn-vue
- GSAP para animações de interface
- Contexto global com `provide/inject` para toasts e configuração da aplicação

## Funcionalidades implementadas

- Cadastro de usuário
- Login de usuário
- Login com Google (quando `VITE_GOOGLE_CLIENT_ID` estiver configurado)
- Visualização pública de solicitações de troca
- Adição de cartas à conta autenticada
- No catálogo de adição, cartas já existentes na conta não aparecem novamente
- Criação de solicitação de troca com cartas oferecidas e desejadas
- Exclusão de solicitações criadas pelo próprio usuário
- Página de perfil com avatar salvo localmente no navegador
- Modo claro/escuro (light/dark) com alternância de tema
- Contadores no menu para total de cartas da conta e trocas abertas
- Tratamento de erros de API
- Validação de formulários no front-end
- Cache simples de páginas de cartas e trocas em stores

## Destaques da implementação

- Paginação customizada para catálogo e trocas:
  não foi usada paginação com total de itens, pois a API não retorna total de cartas/trocas.
  O fluxo usa o campo `more` da API para carregar próximas páginas.
- Uso de GSAP como estudo:
  foi a primeira vez utilizando GSAP no projeto, aplicado nas animações da página de marketplace.
- Badge `NEW` em cartas recém-adicionadas:
  ao adicionar carta em "Minhas cartas", ela recebe destaque visual de nova.
- Autenticação com Google:
  fluxo adicional de login social, mantendo login tradicional por e-mail e senha.
- Área do usuário com avatar:
  página de perfil com upload/atualização de foto e reflexo no layout.
- Tema light/dark:
  alternância de tema disponível na interface para melhor experiência visual.
- Contadores no menu:
  badges mostram quantidade de cartas da conta e número de trocas abertas no marketplace.
- Regra de troca por `id`:
  carta que já está na sua coleção não pode ser selecionada em "cartas que quero receber".
- Regra no catálogo de adição:
  cartas que já estão na conta do usuário são ocultadas em "Adicionar cartas".

## Limitações conhecidas

- Contador de "Trocas abertas" no menu:
  devido a limitações do contrato da API (sem endpoint de total consolidado), o badge usa uma chamada dedicada em `/trades?page=1&rpp=999` para estimar a quantidade.
  Ainda assim, a contagem continua limitada ao teto de itens retornados por página e ao comportamento de paginação da API, podendo divergir do total real em alguns cenários.
  Essa implementação foi mantida como melhoria de UX para agregar valor ao projeto, não como métrica oficial de volume.

## Deploy

- Produção (Vercel): [https://marketplace-cards-rho.vercel.app/](https://marketplace-cards-rho.vercel.app/)

## Configuração (.env)

Para este teste, use o `.env` com os valores abaixo:

```bash
VITE_API_BASE_URL=https://cards-marketplace-api.onrender.com
VITE_GOOGLE_CLIENT_ID=262441028705-ija0pksm10uhjs1kj65i071ms11rkh9c.apps.googleusercontent.com
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
