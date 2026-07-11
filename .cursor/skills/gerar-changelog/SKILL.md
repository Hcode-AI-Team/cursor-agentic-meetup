---
name: gerar-changelog
description: Gera a seção de changelog da release a partir dos commits desde a última tag. Invocação explícita via /gerar-changelog.
disable-model-invocation: true
---

# Gerar changelog

Skill de invocação explícita (equivale ao antigo slash command): o agente NUNCA
a aplica sozinho — só quando o usuário digita `/gerar-changelog`.

## Instruções

1. Liste os commits desde a última tag: `git log $(git describe --tags --abbrev=0)..HEAD --oneline`
2. Agrupe por prefixo de conventional commit: `feat:` → Novidades, `fix:` → Correções, `chore:`/`docs:` → Interno.
3. Escreva cada item em uma linha, voz ativa, começando por verbo, sem jargão interno.
4. Formato de saída:

```markdown
## vX.Y.Z — AAAA-MM-DD
### Novidades
- ...
### Correções
- ...
```

5. NÃO invente itens: se um commit não for claro, liste-o em "Revisar manualmente".
