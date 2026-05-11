import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');
const dbPath = join(dataDir, 'maria-surya.db');

// Garantir que a pasta data existe
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let db = null;

export function getDatabase() {
  return db;
}

export function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Erro ao conectar ao banco:', err);
        reject(err);
        return;
      }
      
      console.log('✅ Banco de dados inicializado:', dbPath);
      
      // Criar tabelas se não existirem
      db.serialize(() => {
        // Tabela de sócios
        db.run(`
          CREATE TABLE IF NOT EXISTS socios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            senha_hash TEXT NOT NULL,
            ativo BOOLEAN DEFAULT 1,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Tabela de transações (receitas e despesas)
        db.run(`
          CREATE TABLE IF NOT EXISTS transacoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tipo TEXT NOT NULL CHECK(tipo IN ('receita', 'despesa')),
            categoria TEXT NOT NULL,
            descricao TEXT NOT NULL,
            valor DECIMAL(10, 2) NOT NULL,
            data_transacao DATE NOT NULL,
            soco_id INTEGER NOT NULL,
            criado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (soco_id) REFERENCES socios(id) ON DELETE CASCADE
          )
        `);

        // Tabela de saldo
        db.run(`
          CREATE TABLE IF NOT EXISTS saldos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            saldo_atual DECIMAL(12, 2) DEFAULT 0,
            atualizado_em DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Inserir saldo inicial se não existir
        db.run(`
          INSERT OR IGNORE INTO saldos (id, saldo_atual)
          VALUES (1, 0)
        `);

        console.log('📋 Tabelas criadas com sucesso');
      });

      resolve();
    });
  });
}

export function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

export function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

export function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}
