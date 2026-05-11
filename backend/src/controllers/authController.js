import bcrypt from 'bcryptjs';
import { getAsync, runAsync } from '../database/init.js';
import { gerarToken } from '../middleware/auth.js';

export async function registrar(req, res) {
  try {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: 'Nome, email e senha são obrigatórios' });
    }

    // Verificar se sócio já existe
    const socioExistente = await getAsync('SELECT id FROM socios WHERE email = ?', [email]);
    if (socioExistente) {
      return res.status(409).json({ erro: 'Email já registrado' });
    }

    // Hash da senha
    const senhaHash = bcrypt.hashSync(senha, 10);

    // Inserir novo sócio
    const result = await runAsync(
      'INSERT INTO socios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome, email, senhaHash]
    );

    const token = gerarToken(result.lastID);

    res.status(201).json({
      sucesso: true,
      mensagem: 'Sócio registrado com sucesso',
      socoId: result.lastID,
      token
    });
  } catch (erro) {
    console.error('Erro ao registrar:', erro);
    res.status(500).json({ erro: 'Erro ao registrar sócio' });
  }
}

export async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: 'Email e senha são obrigatórios' });
    }

    // Buscar sócio por email
    const soco = await getAsync('SELECT id, nome, email, senha_hash FROM socios WHERE email = ? AND ativo = 1', [email]);
    
    if (!soco) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    // Validar senha
    const senhaValida = bcrypt.compareSync(senha, soco.senha_hash);
    if (!senhaValida) {
      return res.status(401).json({ erro: 'Email ou senha incorretos' });
    }

    // Gerar token
    const token = gerarToken(soco.id);

    res.json({
      sucesso: true,
      mensagem: 'Login realizado com sucesso',
      socoId: soco.id,
      nome: soco.nome,
      email: soco.email,
      token
    });
  } catch (erro) {
    console.error('Erro ao fazer login:', erro);
    res.status(500).json({ erro: 'Erro ao fazer login' });
  }
}

export async function perfil(req, res) {
  try {
    const soco = await getAsync('SELECT id, nome, email FROM socios WHERE id = ?', [req.socoId]);
    
    if (!soco) {
      return res.status(404).json({ erro: 'Sócio não encontrado' });
    }

    res.json(soco);
  } catch (erro) {
    console.error('Erro ao buscar perfil:', erro);
    res.status(500).json({ erro: 'Erro ao buscar perfil' });
  }
}
