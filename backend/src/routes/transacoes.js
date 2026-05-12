import express from 'express';
import {
  criarTransacao,
  listarTransacoes,
  obterResumoFinanceiro,
  obterDashboard,
  atualizarTransacao,
  deletarTransacao
} from '../controllers/transacaoController.js';

const router = express.Router();

router.post('/', criarTransacao);
router.get('/', listarTransacoes);
router.get('/resumo', obterResumoFinanceiro);
router.get('/dashboard', obterDashboard);
router.put('/:id', atualizarTransacao);
router.delete('/:id', deletarTransacao);

export default router;
