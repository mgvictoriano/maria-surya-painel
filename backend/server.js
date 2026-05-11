import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { initDatabase } from './src/database/init.js';
import authRoutes from './src/routes/auth.js';
import transacaoRoutes from './src/routes/transacoes.js';
import { autenticar } from './src/middleware/auth.js';

dotenv.config();

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

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Painel Maria Surya - Pronto para usar`);
});
