# Referência do HedHog YAML (carregada sob demanda)

## Tipos de coluna
| Tipo | Uso |
|---|---|
| `pk` | primary key autoincremento |
| `name: <campo>` (sem type) | varchar padrão |
| `decimal` + `precision`/`scale` | valores monetários |
| `boolean`, `int`, `text`, `date` | tipos básicos |
| `fk` + `references` | chave estrangeira |
| `created_at` / `updated_at` | timestamps automáticos |

## Exemplo completo
```yaml
columns:
  - type: pk
  - name: name
  - name: price
    type: decimal
    precision: 12
    scale: 2
  - name: active
    type: boolean
  - type: created_at
  - type: updated_at
```

## O que o gerador produz
1. Migration PostgreSQL versionada (migration-first)
2. Endpoints REST: list, get, create, update, delete
3. `route.yaml` + `role.yaml` sincronizados com RBAC do admin
