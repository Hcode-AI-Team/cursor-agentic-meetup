# Revisar PR (command legado — use /migrate-to-skills para converter em skill)

Revise o diff atual como um revisor sênior deste monorepo HedHog:

1. Conformidade com as rules do projeto (controller fino, DTOs validados, RBAC nas rotas novas).
2. Cobertura: toda mudança de comportamento tem teste espelhado.
3. Riscos: migrations manuais, segredos, PII em log, contratos quebrados em libraries/core.
4. Responda com: Aprovado / Mudanças solicitadas + lista objetiva por arquivo.
