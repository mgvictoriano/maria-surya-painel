import mysql from 'mysql2/promise';

let db = null;

export function getDatabase() {
  return db;
}

function validateMySqlEnv() {
  const required = ['MYSQL_HOST', 'MYSQL_USER', 'MYSQL_PASSWORD', 'MYSQL_DATABASE'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Variáveis MySQL ausentes: ${missing.join(', ')}`);
  }
}

export async function initDatabase() {
  validateMySqlEnv();

  db = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await db.query(`
    CREATE TABLE IF NOT EXISTS socios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      senha_hash VARCHAR(255) NOT NULL,
      ativo TINYINT(1) DEFAULT 1,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS transacoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      tipo ENUM('receita', 'despesa') NOT NULL,
      categoria VARCHAR(255) NOT NULL,
      descricao TEXT NOT NULL,
      valor DECIMAL(12, 2) NOT NULL,
      data_transacao DATE NOT NULL,
      soco_id INT NOT NULL,
      criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_transacoes_socio FOREIGN KEY (soco_id) REFERENCES socios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS saldos (
      id INT PRIMARY KEY,
      saldo_atual DECIMAL(14, 2) DEFAULT 0,
      atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  await db.query(`
    INSERT INTO saldos (id, saldo_atual)
    VALUES (1, 0)
    ON DUPLICATE KEY UPDATE id = id
  `);
  console.log('✅ Banco de dados inicializado: MySQL');
  console.log('📋 Tabelas criadas com sucesso');
}

export async function runAsync(sql, params = []) {
  const [result] = await db.execute(sql, params);
  return {
    lastID: result.insertId || 0,
    changes: result.affectedRows || 0
  };
}

export async function getAsync(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows[0];
}

export async function allAsync(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows;
}
