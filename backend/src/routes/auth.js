import express from 'express';
import { registrar, login, perfil } from '../controllers/authController.js';
import { autenticar } from '../middleware/auth.js';

const router = express.Router();

router.post('/registrar', registrar);
router.post('/login', login);
router.get('/perfil', autenticar, perfil);

export default router;
