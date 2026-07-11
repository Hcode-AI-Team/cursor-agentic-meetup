# Demo — Agentic Engineering na prática com Cursor
Projeto de demonstração para a palestra (Cursor Meetup Rio). Abra esta pasta no
Cursor e siga a sequência abaixo. Cada arquivo segue o formato OFICIAL da doc do Cursor.

## O que tem aqui

```
demo-agentic-cursor/
├── AGENTS.md                          ← o "crachá de boas-vindas" (padrão aberto)
├── .cursor/
│   ├── rules/
│   │   ├── 00-core.mdc                ← a ÚNICA rule alwaysApply (curta de propósito)
│   │   ├── backend-nestjs.mdc         ← modo "Specific Files" (globs)
│   │   ├── frontend-next.mdc          ← modo "Specific Files" (globs)
│   │   └── seguranca.mdc              ← modo "Apply Intelligently" (só description)
│   ├── agents/                        ← a SQUAD (formato oficial de subagentes)
│   │   ├── arquiteto.md               ← model: inherit  · readonly: true
│   │   ├── implementador-backend.md   ← model: composer-2 (a ESCALAÇÃO no frontmatter)
│   │   ├── qa-verificador.md          ← readonly: true (o juiz cético — padrão oficial)
│   │   ├── auditor-seguranca.md       ← readonly: true
│   │   └── auditor-tokens.md          ← readonly + is_background (o gancho GenAIFinOps)
│   ├── skills/
│   │   ├── criar-modulo-hedhog/       ← SKILL.md + scripts/ + references/ (3 camadas)
│   │   └── gerar-changelog/           ← disable-model-invocation: true (o "command")
│   └── commands/
│       └── revisar-pr.md              ← command LEGADO (mostrar /migrate-to-skills)
└── hedhog/table/product.yaml          ← 10 linhas → migration + CRUD + RBAC
```

## Sequência de demonstração no palco (encaixada no Bloco 2)

**Demo 1 — Rules (Peça 1):** abra os 4 arquivos de `.cursor/rules/` lado a lado.
Mostre os 3 modos no frontmatter (alwaysApply / globs / só description). Frase:
"quatro arquivos, três estratégias de custo".

**Demo 2 — Memórias (Peça 2):** abra Settings → Rules e mostre a seção de
Memórias geradas automaticamente (não são arquivos!). Ao lado, mostre
`00-core.mdc` no git. "Memória é rascunho; rule é constituição."

**Demo 3 — Skills (Peça 3):** abra `criar-modulo-hedhog/SKILL.md` e depois
`scripts/scaffold-modulo.sh`. Rode no terminal:
`bash .cursor/skills/criar-modulo-hedhog/scripts/scaffold-modulo.sh hedhog/table/product.yaml`
→ "o agente declara 10 linhas; o script executa. Zero tokens de geração."
Depois digite `/` no chat e mostre `gerar-changelog` aparecendo no menu.

**Demo 4 — Subagentes (Peça 4):** abra `qa-verificador.md` e aponte
`readonly: true` ("isso teria salvado o banco da SaaStr") e
`implementador-backend.md` apontando `model: composer-2` ("a escalação mora
num campo de frontmatter"). Invoque ao vivo: `/qa-verificador confirme se o
módulo product está completo`.

**Demo 5 — Loop com juiz (Peça 5):** peça ao agente "crie o cadastro de
categoria" e mostre: a rule 00-core força o caminho do YAML → a skill dispara →
o script valida (juiz determinístico) → o QA reprova/aprova.

## Nota sobre Memórias
Memórias não são arquivos deste repositório — o Cursor as gera automaticamente
das suas sessões (Settings → Rules). Para a demo, trabalhe alguns dias antes
neste projeto corrigindo o agente 2–3 vezes na mesma coisa, e a memória estará
lá para mostrar ao vivo. Depois, encene a "promoção": copie o texto da memória
para uma rule versionada.

## Fontes oficiais dos formatos
- Subagentes: cursor.com/docs/subagents (frontmatter name/description/model/readonly/is_background)
- Skills: cursor.com/docs/skills (padrão aberto agentskills.io; paths; disable-model-invocation)
- Rules: cursor.com/docs/rules (Always / Apply Intelligently / Specific Files / Manual)
- HedHog YAML: hedhog.com/pt-br (Crie Módulos)
