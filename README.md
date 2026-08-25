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


## Auditoria resumida de CATs

A aba **CATs** abre inicialmente no modo **Resumo**, que mostra somente o apelido da obra, a quantidade de itens cadastrados e os checkmarks de **CAO**, **Autenticado** e **Desmaterializado**. Uma CAT com zero serviços aparece destacada como `CAT sem serviços`, facilitando a auditoria manual. O modo **Detalhado** continua disponível para consultar os metadados completos.

O campo `cao` é criado automaticamente com valor `TRUE` na inicialização da API. CATs já existentes recebem CAO habilitado pela migração idempotente, e o valor passa a ser mantido tanto no PostgreSQL quanto no JSON correspondente em `outputs_json`.

## Ingestão auditável

A aba **Ingestão** permite selecionar um PDF, acompanhar o job na fila e visualizar logs com timestamp, nível e mensagem. O backend usa o prompt oficial `prompt_master_v2.txt` e o modelo configurado em `OPENROUTER_MODEL`, cujo padrão é `google/gemini-3.7-flash`.

O processamento não grava imediatamente no PostgreSQL. Primeiro, o JSON extraído fica salvo como `draft_json` no job e aparece em uma tela de revisão editável. A aprovação manual cria ou atualiza a CAT, substitui sua lista de serviços e atualiza o snapshot em `outputs_json`. A aba também possui a ação **Sincronizar JSONs**, que força o espelhamento de todas as CATs do PostgreSQL para os arquivos de backup.

Para habilitar a ingestão, inclua no `backend/.env`:

```env
OPENROUTER_API_KEY=sua_chave_real
OPENROUTER_URL=https://openrouter.ai/api/v1/chat/completions
OPENROUTER_MODEL=google/gemini-3.7-flash
INGESTION_SOURCE_DIR=sources_pdf
INGESTION_OUTPUT_DIR=outputs_json
INGESTION_MAX_FILE_MB=50
```

### Endpoints de ingestão

| Método | Endpoint | Descrição |
|---|---|---|
| `POST` | `/api/v1/ingestion/jobs` | Recebe um PDF e inicia o processamento assíncrono |
| `GET` | `/api/v1/ingestion/jobs` | Lista o histórico de jobs |
| `GET` | `/api/v1/ingestion/jobs/{id}` | Consulta status, logs e rascunho |
| `POST` | `/api/v1/ingestion/jobs/{id}/retry` | Reprocessa um job falho |
| `POST` | `/api/v1/ingestion/jobs/{id}/approve` | Aprova o rascunho revisado e persiste a CAT |
| `POST` | `/api/v1/cats/sync-json` | Atualiza os backups JSON a partir do PostgreSQL |
