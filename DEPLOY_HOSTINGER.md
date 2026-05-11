# Deploy na Hostinger - Web app Node.js

## Pré-requisitos

1. Repositório GitHub com o código
2. Conta na Hostinger com acesso a "Web app Node.js"

## Passos para Deploy

### 1. Preparar o repositório

```bash
# Na raiz do projeto, crie .gitignore global
node_modules/
.env
.env.local
dist/
*.log
.DS_Store
.vite/
data/
```

### 2. Criar estrutura para Hostinger

Na Hostinger, o comando de start deve estar em `package.json`:

**Backend (`backend/package.json`)** - já está configurado:
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  }
}
```

### 3. Variáveis de Ambiente

Na dashboard da Hostinger, crie as variáveis:

```
NODE_ENV=production
PORT=3000
JWT_SECRET=GERE_UMA_CHAVE_SUPER_SEGURA_AQUI
DATABASE_PATH=./data/maria-surya.db
```

**Para gerar uma chave JWT segura:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Procedimento de Deploy

1. Vá em Sites → Adicionar site → Web app Node.js
2. Conecte seu repositório GitHub
3. Configure:
   - **App Location**: `backend/`
   - **Install command**: `npm install`
   - **Build command**: deixe em branco ou `npm run build`
   - **Start command**: `npm start`
4. Adicione as variáveis de ambiente
5. Deploy (automático via GitHub push)

### 5. Após o Deploy

- Seu backend roda em: `https://seu-dominio.com/api`
- Crie um segundo Web app para o Frontend (React)
  - App Location: `frontend/`
  - Build command: `npm run build`
  - Start command: deixe em branco (será estático)

### 6. Configurar Proxy no Frontend

No `frontend/vite.config.js`, ajuste para produção:

```javascript
proxy: {
  '/api': {
    target: 'https://seu-dominio-backend.com',
    changeOrigin: true
  }
}
```

Ou configure uma variável de ambiente:

```javascript
// frontend/src/services/api.js
const BASE_URL = process.env.VITE_API_URL || '/api';
```

## Troubleshooting

**Erro 502 Bad Gateway**
- Verifique se o servidor está rodando: curl http://localhost:3000/health
- Verifique as variáveis de ambiente

**Erro de autenticação (401)**
- Verifique se JWT_SECRET está correto em ambos os serviços

**Banco de dados não persiste**
- Certifique-se que o diretório `data/` existe e tem permissões de escrita

## Monitoramento

Acesse os logs na Hostinger:
- Dashboard → Seu site → Logs

```bash
# Localmente, veja os logs do servidor
npm run dev
```

## Backup do Banco de Dados

O arquivo `data/maria-surya.db` contém todos os dados. Faça backup regularmente:

```bash
# Localmente
cp backend/data/maria-surya.db backup-maria-surya-$(date +%Y%m%d).db
```

Na Hostinger, considere usar um banco PostgreSQL profissional para produção.
