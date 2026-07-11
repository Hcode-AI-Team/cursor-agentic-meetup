# Loja SaaS — instruções para agentes

SaaS de e-commerce B2B construído sobre HedHog (open-core NestJS + Next.js,
PostgreSQL/Prisma, monorepo pnpm + Turborepo).

## Comandos
- Instalar: `pnpm install`
- Dev (API + admin): `pnpm dev`
- Testes: `pnpm test` · um arquivo: `pnpm test -- caminho/do/arquivo.spec.ts`
- Lint + tipos: `pnpm lint && pnpm typecheck`
- Migrations: geradas a partir de YAML em `hedhog/table/` (NUNCA editar SQL de migration na mão)

## Arquitetura
- `apps/api/` — NestJS. Handlers finos; regra de negócio em services.
- `apps/admin/` — Next.js (App Router). Server Components por padrão.
- `libraries/*` — lógica de negócio library-first do HedHog.
- Novas tabelas/CRUD: declarar YAML em `hedhog/table/` e rodar o scaffold
  (skill `criar-modulo-hedhog`). NÃO gerar CRUD à mão.

## Regras inegociáveis
- NUNCA tocar em `apps/api/prisma/migrations/` diretamente.
- NUNCA commitar `.env*`. Segredos só via variáveis de ambiente.
- NUNCA alterar contratos de rotas em `libraries/core/*` sem plano aprovado.
- Toda mudança multi-arquivo: apresentar plano ANTES de editar.

## Fluxo de trabalho
- Uma tarefa por vez; commits pequenos com conventional commits (feat:, fix:, chore:).
- Ao concluir, delegar validação ao subagente `/qa-verificador`.
