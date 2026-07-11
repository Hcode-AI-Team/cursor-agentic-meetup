#!/usr/bin/env bash
# scaffold-modulo.sh — valida e gera um módulo HedHog a partir do YAML declarativo.
# Demonstra o princípio "gerar vs executar": o agente DECLARA (YAML pequeno),
# o script EXECUTA (geração determinística, zero tokens de geração, zero variação).
set -euo pipefail

MODE="generate"
if [ "${1:-}" = "--validate" ]; then MODE="validate"; shift; fi
YAML_FILE="${1:?Uso: scaffold-modulo.sh [--validate] hedhog/table/<entidade>.yaml}"

[ -f "$YAML_FILE" ] || { echo "ERRO: arquivo não encontrado: $YAML_FILE"; exit 1; }

ENT="$(basename "$YAML_FILE" .yaml)"
echo "→ Entidade: $ENT"

# Validações determinísticas (o 'juiz' roda aqui, não no modelo)
grep -q "columns:" "$YAML_FILE" || { echo "ERRO: YAML sem bloco 'columns:'"; exit 1; }
grep -q "type: pk" "$YAML_FILE"  || { echo "ERRO: defina a primary key (- type: pk)"; exit 1; }
echo "✓ YAML válido"

[ "$MODE" = "validate" ] && exit 0

# Geração via CLI oficial do HedHog (demo: eco dos passos)
echo "→ hedhog add ... (migration PostgreSQL para '$ENT')"
echo "→ gerando API CRUD tipada: list, get, create, update, delete"
echo "→ sincronizando route.yaml e role.yaml (papéis admin e admin-$ENT)"
echo "✓ Módulo '$ENT' gerado. Rode: pnpm test"
