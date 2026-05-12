import express from 'express';
import {
  criarTransacao,
  listarTransacoes,
  obterResumoFinanceiro,
  obterDashboard,
  deletarTransacao
} from '../controllers/transacaoController.js';

const router = express.Router();

router.post('/', criarTransacao);
router.get('/', listarTransacoes);
router.get('/resumo', obterResumoFinanceiro);
router.get('/dashboard', obterDashboard);
router.delete('/:id', deletarTransacao);

export default router;
