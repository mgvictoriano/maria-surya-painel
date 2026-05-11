# Maria Surya - Painel Financeiro

Sistema de gestão financeira para o restaurante árabe Maria Surya.

## Estrutura

```
├── backend/           (Node.js + Express)
├── frontend/          (React + Vite)
└── README.md
```

## Quick Start

### Backend

```bash
cd backend
npm install
npm run dev
```

Servidor roda em `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplicação roda em `http://localhost:5173`

## Features

- ✅ Autenticação JWT (login/registrar)
- ✅ Dashboard financeiro
- ✅ Registro de receitas e despesas
- ✅ Resumo por período (mês/ano)
- ✅ Histórico de transações
- ✅ Cálculo automático de saldo

## Banco de Dados

SQLite local (arquivo `data/maria-surya.db`)

### Tabelas

- `socios` - usuários do sistema
- `transacoes` - registro de receitas/despesas
- `saldos` - saldo geral

## Deploy na Hostinger

1. Crie um repositório GitHub
2. Push do código
3. Na Hostinger, use "Web app Node.js"
4. Configure as variáveis de ambiente (`.env`)
5. Deploy automático via GitHub

## Variáveis de Ambiente

Crie um arquivo `.env` no backend:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=sua_chave_secreta_super_segura
DATABASE_PATH=./data/maria-surya.db
```

## API Endpoints

### Auth
- `POST /api/auth/registrar` - Registrar novo sócio
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/perfil` - Obter perfil (autenticado)

### Transações (requer autenticação)
- `POST /api/transacoes` - Criar transação
- `GET /api/transacoes` - Listar transações
- `GET /api/transacoes/resumo` - Obter resumo financeiro
- `DELETE /api/transacoes/:id` - Deletar transação

## Desenvolvimento

```bash
# Backend - modo watch
npm run dev

# Frontend - modo watch
npm run dev

# Build frontend
npm run build
```
