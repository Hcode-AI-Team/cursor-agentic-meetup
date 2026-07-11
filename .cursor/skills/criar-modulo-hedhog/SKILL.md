---
name: criar-modulo-hedhog
description: Cria um módulo completo no HedHog (tabela + migration + API CRUD + permissões RBAC) a partir de um YAML declarativo. Use quando o usuário pedir uma nova entidade, tabela, cadastro ou CRUD.
---

# Criar módulo HedHog

Neste projeto, módulos NUNCA são gerados à mão. Eles são DECLARADOS em YAML e
o framework executa a geração (migration + CRUD tipado + permissões de rota).

## Quando usar

- O usuário pede "cadastro de X", "tabela de X", "CRUD de X" ou "nova entidade X".
- Uma feature exige persistir um novo tipo de dado.

## Instruções

1. Defina o nome da entidade em `snake_case` singular (ex.: `product`).
2. Crie `hedhog/table/<entidade>.yaml` seguindo o formato de referência
   (ver `references/REFERENCE.md` — abra apenas se precisar de tipos além dos básicos).
3. Valide o YAML antes de gerar: `bash scripts/scaffold-modulo.sh --validate hedhog/table/<entidade>.yaml`
4. Gere o módulo: `bash scripts/scaffold-modulo.sh hedhog/table/<entidade>.yaml`
5. Confirme que `route.yaml` e `role.yaml` foram sincronizados com os papéis admin.
6. Rode `pnpm test` e reporte o resultado.

## Importante

- NÃO escreva SQL de migration manualmente.
- NÃO crie controllers/services de CRUD manualmente — o gerador cobre list, get,
  create, update e delete. Escreva código apenas para regra de negócio ALÉM do CRUD.
- Se o usuário pedir campos sensíveis (CPF, cartão), acione a rule de segurança
  e proponha criptografia em repouso ANTES de gerar.
