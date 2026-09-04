/**
 * MÓDULO DE BANCO DE DADOS SQLITE / TURSO CLOUD (ELETRO ZONE)
 * Inicialização do banco relacional, criação de tabelas e auto-seeding de dados.
 * Suporta Turso Cloud (libsql://) via variáveis de ambiente e SQLite local (database.sqlite).
 */

const path = require('path');

const TURSO_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

let tursoClient = null;
let sqliteDb = null;

if (TURSO_URL) {
  console.log('☁️ Conectando ao Banco de Dados Turso Cloud (LibSQL):', TURSO_URL);
  const { createClient } = require('@libsql/client');
  tursoClient = createClient({
    url: TURSO_URL,
    authToken: TURSO_AUTH_TOKEN || ''
  });
} else {
  const DB_PATH = path.join(__dirname, 'database.sqlite');
  console.log('🗄️ Conectando ao Banco de Dados SQLite Local:', DB_PATH);
  const sqlite3 = require('sqlite3').verbose();
  sqliteDb = new sqlite3.Database(DB_PATH);
}

// Sanitizador para converter undefined em null antes de passar ao banco (evita erros no @libsql/client)
const sanitizeParams = (params = []) => {
  return params.map(p => (p === undefined ? null : p));
};

// Wrappers assíncronos compatíveis com Turso Cloud e SQLite Local
const dbRun = async (sql, params = []) => {
  const args = sanitizeParams(params);
  if (tursoClient) {
    return await tursoClient.execute({ sql, args });
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(sql, args, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
};

const dbAll = async (sql, params = []) => {
  const args = sanitizeParams(params);
  if (tursoClient) {
    const res = await tursoClient.execute({ sql, args });
    return res.rows.map(row => (typeof row === 'object' && row !== null ? { ...row } : row));
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(sql, args, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

const dbGet = async (sql, params = []) => {
  const args = sanitizeParams(params);
  if (tursoClient) {
    const res = await tursoClient.execute({ sql, args });
    if (!res.rows || res.rows.length === 0) return null;
    const first = res.rows[0];
    return typeof first === 'object' && first !== null ? { ...first } : first;
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(sql, args, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

async function initDatabase() {
  if (TURSO_URL) {
    console.log('⚡ Inicializando esquema no Turso Cloud...');
  } else {
    console.log('🗄️ Inicializando esquema no SQLite Local...');
  }

  // 1. Tabela de Usuários e Permissões
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      fullname TEXT NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      permissions TEXT NOT NULL,
      createdAt TEXT NOT NULL
    )
  `);

  // 2. Tabela de Equipamentos (Ativos)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS equipments (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL,
      host TEXT NOT NULL,
      ip TEXT NOT NULL,
      anydesk TEXT,
      empresa TEXT,
      status TEXT NOT NULL,
      setor TEXT NOT NULL,
      usuario TEXT NOT NULL,
      processador TEXT,
      ram TEXT,
      armazenamento TEXT,
      ns TEXT NOT NULL,
      marca TEXT NOT NULL,
      modelo TEXT NOT NULL,
      notaFiscal TEXT,
      fornecedor TEXT,
      nextPreventiveDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    )
  `);

  // 3. Tabela de Manutenções e Peças Trocadas
  await dbRun(`
    CREATE TABLE IF NOT EXISTS maintenances (
      id TEXT PRIMARY KEY,
      equipmentId TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT NOT NULL,
      partsCost REAL DEFAULT 0,
      laborCost REAL DEFAULT 0,
      cost REAL DEFAULT 0,
      paymentMethod TEXT NOT NULL,
      technician TEXT,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (equipmentId) REFERENCES equipments(id) ON DELETE CASCADE
    )
  `);

  // 4. Tabela do Controle de Estoque
  await dbRun(`
    CREATE TABLE IF NOT EXISTS stock_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      condition TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 0,
      minQuantity INTEGER NOT NULL DEFAULT 1,
      unitPrice REAL NOT NULL DEFAULT 0,
      location TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    )
  `);

  // 5. Tabela do Livro Caixa (Movimentações Financeiras)
  await dbRun(`
    CREATE TABLE IF NOT EXISTS cashbook (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      paymentMethod TEXT NOT NULL,
      equipmentId TEXT,
      createdAt TEXT NOT NULL
    )
  `);

  // 6. Tabela de Logs e Auditoria
  await dbRun(`
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      type TEXT NOT NULL,
      action TEXT NOT NULL,
      user TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `);

  // 7. Tabela de Ordens de Serviço e Orçamentos
  await dbRun(`
    CREATE TABLE IF NOT EXISTS service_orders (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      clientName TEXT NOT NULL,
      clientContact TEXT,
      equipmentId TEXT,
      equipmentDescription TEXT NOT NULL,
      status TEXT NOT NULL,
      problemDescription TEXT NOT NULL,
      technicalDiagnosis TEXT,
      servicesCost REAL DEFAULT 0,
      partsCost REAL DEFAULT 0,
      totalCost REAL DEFAULT 0,
      paymentMethod TEXT,
      technician TEXT,
      validityDate TEXT,
      completionDate TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT
    )
  `);

  await seedInitialData();
  console.log('✅ Banco de dados SQLite pronto para uso!');
}

async function seedInitialData() {
  // Verificação e População do Usuário Administrador Mestre Padrão
  const adminUser = await dbGet('SELECT * FROM users WHERE LOWER(username) = ?', ['willian.barbosa']);
  const adminPermissions = JSON.stringify({ canCreate: true, canEdit: true, canDelete: true, isAdmin: true });
  if (!adminUser) {
    console.log('👤 Criando usuário Administrador Mestre (willian.barbosa)...');
    await dbRun(
      `INSERT INTO users (id, username, fullname, password, role, permissions, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['usr_admin_willian', 'willian.barbosa', 'Willian Barbosa', 'Fx8350.8gb2017', 'ADMIN', adminPermissions, new Date().toISOString()]
    );
  } else {
    await dbRun(
      `UPDATE users SET fullname = ?, password = ?, role = 'ADMIN', permissions = ? WHERE LOWER(username) = ?`,
      ['Willian Barbosa', 'Fx8350.8gb2017', adminPermissions, 'willian.barbosa']
    );
  }
}


module.exports = {
  db: sqliteDb,
  dbRun,
  dbAll,
  dbGet,
  initDatabase
};
