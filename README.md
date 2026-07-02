# Sistema de Acervos Técnicos — app_cats

Sistema web interno para gestão de CATs CREA e Atestados de Capacidade Técnica.

## Estrutura do Projeto

```
app_cats/
├── backend/              # API FastAPI + PostgreSQL
│   ├── api/routes/       # Endpoints: cats, servicos, dashboard
│   ├── core/             # Configurações e conexão com banco
│   ├── models/           # Modelos SQLAlchemy e schemas Pydantic
│   ├── main.py           # Ponto de entrada da API
│   └── requirements.txt  # Dependências Python
├── frontend/             # Interface Next.js + TailwindCSS
│   ├── app/              # Páginas (consulta, dashboard)
│   └── lib/api.ts        # Cliente de API centralizado
├── outputs_json/         # JSONs extraídos das CATs
├── ingestao_acervos_v3.py # Script de ingestão dos PDFs
└── apelidos.json         # Mapeamento de apelidos internos
```

## Como Rodar Localmente

### 1. Backend (FastAPI)

```bash
cd backend

# Instalar dependências
pip install -r requirements.txt

# Copiar e configurar o .env
cp .env.example .env
# Edite o .env com sua senha do PostgreSQL

# Rodar o servidor
uvicorn main:app --reload --port 8000
```

A API ficará disponível em: http://localhost:8000
Documentação automática: http://localhost:8000/docs

### 2. Frontend (Next.js)

```bash
cd frontend

# Copiar e configurar o .env
cp .env.local.example .env.local

# Instalar dependências
pnpm install

# Rodar o servidor de desenvolvimento
pnpm dev
```

A interface ficará disponível em: http://localhost:3000

## Endpoints Principais da API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/v1/dashboard/stats` | Estatísticas gerenciais |
| GET | `/api/v1/cats` | Listar CATs com filtros |
| GET | `/api/v1/cats/{id}` | Detalhe de uma CAT |
| GET | `/api/v1/servicos` | Buscar serviços com filtros e paginação |
| GET | `/api/v1/servicos/grupos` | Listar grupos disponíveis |
| GET | `/api/v1/servicos/somar` | Somar quantitativos por serviço |

## Tecnologias

- **Backend:** Python, FastAPI, SQLAlchemy, PostgreSQL
- **Frontend:** Next.js 16, React 19, TypeScript, TailwindCSS
- **Tabela:** TanStack Table v8 + TanStack Virtual (suporte a 16k+ linhas)
- **IA:** Gemini 2.5 Flash via OpenRouter (ingestão dos PDFs)
