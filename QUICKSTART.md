# 🚀 Quick Start - Maria Surya Painel

Comece a desenvolver em 2 minutos.

## Instalação

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

✅ Backend rodando: `http://localhost:3000`

### 2. Frontend (nova janela do terminal)

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend rodando: `http://localhost:5173`

## Teste Rápido

1. Abra `http://localhost:5173` no navegador
2. Clique em "Não tem conta? Registre-se"
3. Registre com:
   - Nome: Maria Surya
   - Email: admin@mariasurya.com.br
   - Senha: 123456
4. ✅ Você está logado!

## Estrutura do Projeto

```
Maria-Surya-Painel/
├── backend/
│   ├── server.js           (entry point)
│   ├── src/
│   │   ├── routes/         (rotas da API)
│   │   ├── controllers/    (lógica)
│   │   ├── middleware/     (autenticação)
│   │   └── database/       (SQLite)
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx         (componente raiz)
│   │   ├── pages/          (Login, Dashboard)
│   │   ├── components/     (Navbar, etc)
│   │   ├── services/       (API calls)
│   │   ├── constants/      (cores)
│   │   └── utils/          (formatters)
│   └── package.json
│
├── README.md
├── DEPLOY_HOSTINGER.md
└── QUICKSTART.md (este arquivo)
```

## Comandos Úteis

### Backend

```bash
# Desenvolvimento (with auto-reload)
npm run dev

# Produção
npm start
```

### Frontend

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview
```

## Variáveis de Ambiente

### Backend (`.env`)

```
NODE_ENV=development
PORT=3000
JWT_SECRET=sua_chave_secreta_aqui
DATABASE_PATH=./data/maria-surya.db
```

### Frontend (opcional)

```
VITE_API_URL=http://localhost:3000
```

## API Endpoints

```
POST   /api/auth/registrar       (email, nome, senha)
POST   /api/auth/login           (email, senha)
GET    /api/auth/perfil          (autenticado)

POST   /api/transacoes           (criar)
GET    /api/transacoes           (listar)
GET    /api/transacoes/resumo    (resumo mensal)
DELETE /api/transacoes/:id       (deletar)
```

## Debugging

### Backend
- Logs diretos no terminal
- Arquivo: `data/maria-surya.db` (SQLite)

### Frontend
- DevTools do navegador (F12)
- Console.log
- Token salvo em `localStorage` (chave: `ms_token`)

## Próximos Passos

1. Faça um commit inicial
2. Crie um repositório no GitHub
3. Siga as instruções em `DEPLOY_HOSTINGER.md`
4. Deploy!

## Suporte

Erros comuns:

- **PORT 3000 já em uso**: `lsof -i :3000` e mate o processo
- **npm install demora**: use `npm install --legacy-peer-deps`
- **CORS error**: certifique-se que backend está rodando em 3000

Pronto! 🎉 Qualquer dúvida, consulte os arquivos `.md` na raiz.
