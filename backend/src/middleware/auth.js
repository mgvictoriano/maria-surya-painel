import jwt from 'jsonwebtoken';

export function autenticar(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ erro: 'Token não fornecido' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.socoId = decoded.socoId;
    next();
  } catch (err) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

export function gerarToken(socoId) {
  return jwt.sign(
    { socoId },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
}
