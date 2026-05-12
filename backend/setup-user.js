import sqlite3Module from 'sqlite3';
import bcryptjs from 'bcryptjs';

const sqlite3 = sqlite3Module;
const db = new (sqlite3.verbose()).Database('./data/maria-surya.db');

const hash = bcryptjs.hashSync('teste123', 10);

db.run(
  `INSERT OR IGNORE INTO socios (nome, email, senha_hash, ativo, criado_em, atualizado_em) 
   VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))`,
  ['User Teste', 'teste@teste.com', hash],
  function(err) {
    if (err) {
      console.error('Erro:', err);
    } else {
      console.log('✅ Usuário: teste@teste.com / senha: teste123');
    }
    db.close();
  }
);
