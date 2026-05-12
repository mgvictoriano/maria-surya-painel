import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initDatabase } from './src/database/init.js';
import authRoutes from './src/routes/auth.js';
import transacaoRoutes from './src/routes/transacoes.js';
import { autenticar } from './src/middleware/auth.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globais
app.use(cors());
app.use(bodyParser.json());

// Inicializar banco de dados
initDatabase();

// Rotas públicas
app.use('/api/auth', authRoutes);

// Rotas protegidas
app.use('/api/transacoes', autenticar, transacaoRoutes);

// Servir arquivos estáticos do frontend (React)
const distPath = join(__dirname, './public');
app.use(express.static(distPath));

// Health check (antes do catch-all)
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Catch-all para React Router: se não for /api, serve index.html
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(distPath, 'index.html'));
  } else {
    res.status(404).json({ erro: 'Endpoint não encontrado' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Painel Maria Surya - Pronto para usar`);
});
