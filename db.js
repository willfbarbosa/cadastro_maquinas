/**
 * MÓDULO DE BANCO DE DADOS SQLITE (ELETRO ZONE)
 * Inicialização do banco relacional, criação de tabelas e auto-seeding de dados.
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

// Wrappers com Promises para faciliar async/await
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function initDatabase() {
  console.log('🗄️ Inicializando Banco de Dados SQLite:', DB_PATH);

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
  // Verificação e População Inicial de Equipamentos
  const countEq = await dbGet('SELECT COUNT(*) as count FROM equipments');
  if (countEq.count === 0) {
    console.log('📦 Inserindo dados iniciais de Equipamentos no SQLite...');

    const initialEquipments = [
      {
        id: 'eq_1001',
        tipo: 'COMPUTADOR',
        host: 'PC-TI-ADM01',
        ip: '192.168.1.105',
        anydesk: '982 411 709',
        empresa: 'Eletro Zone - Matriz',
        status: 'ATIVO',
        setor: 'Tecnologia da Informação',
        usuario: 'Carlos Eduardo Silva',
        processador: 'Intel Core i7-12700 (12ª Geração)',
        ram: '32 GB DDR4',
        armazenamento: '512 GB SSD NVMe M.2',
        ns: 'SN-DELL-9823411',
        marca: 'Dell',
        modelo: 'OptiPlex 7090 Tower',
        notaFiscal: 'NF-89210',
        fornecedor: 'Dell Computadores do Brasil',
        nextPreventiveDate: '2026-08-25',
        createdAt: new Date().toISOString()
      },
      {
        id: 'eq_1002',
        tipo: 'COMPUTADOR',
        host: 'NOTE-RH-02',
        ip: '192.168.1.112',
        anydesk: '441 092 312',
        empresa: 'Eletro Zone - Matriz',
        status: 'ATIVO',
        setor: 'Recursos Humanos',
        usuario: 'Mariana Oliveira',
        processador: 'Intel Core i5-1135G7',
        ram: '16 GB DDR4',
        armazenamento: '256 GB SSD NVMe',
        ns: 'SN-LEN-441092',
        marca: 'Lenovo',
        modelo: 'ThinkPad E14 Gen 2',
        notaFiscal: 'NF-89245',
        fornecedor: 'Kalunga S/A',
        nextPreventiveDate: '2026-09-08',
        createdAt: new Date().toISOString()
      },
      {
        id: 'eq_1003',
        tipo: 'IMPRESSORA',
        host: 'IMP-FIN-COLOR',
        ip: '192.168.1.200',
        anydesk: 'N/A',
        empresa: 'Eletro Zone - Filial 1',
        status: 'ATIVO',
        setor: 'Financeiro',
        usuario: 'Uso Compartilhado - Setor Financeiro',
        processador: 'N/A',
        ram: 'N/A',
        armazenamento: 'N/A',
        ns: 'SN-EPS-77109',
        marca: 'Epson',
        modelo: 'EcoTank L3250 Multifuncional',
        notaFiscal: 'NF-90112',
        fornecedor: 'Magazine Luiza Corporativo',
        nextPreventiveDate: '2026-10-15',
        createdAt: new Date().toISOString()
      },
      {
        id: 'eq_1004',
        tipo: 'MOTOR',
        host: 'MTR-BOMBA-01',
        ip: '192.168.1.220',
        anydesk: 'N/A',
        empresa: 'Eletro Zone - Matriz',
        status: 'ATIVO',
        setor: 'Operações / Manutenção',
        usuario: 'Técnico de Operações',
        processador: 'N/A',
        ram: 'N/A',
        armazenamento: 'N/A',
        ns: 'SN-WEG-881290',
        marca: 'WEG',
        modelo: 'Motor Elétrico Trifásico 5CV 220V',
        notaFiscal: 'NF-92100',
        fornecedor: 'WEG Equipamentos Elétricos',
        nextPreventiveDate: '2026-09-05',
        createdAt: new Date().toISOString()
      }
    ];

    for (const e of initialEquipments) {
      await dbRun(
        `INSERT INTO equipments (id, tipo, host, ip, anydesk, empresa, status, setor, usuario, processador, ram, armazenamento, ns, marca, modelo, notaFiscal, fornecedor, nextPreventiveDate, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [e.id, e.tipo, e.host, e.ip, e.anydesk, e.empresa, e.status, e.setor, e.usuario, e.processador, e.ram, e.armazenamento, e.ns, e.marca, e.modelo, e.notaFiscal, e.fornecedor, e.nextPreventiveDate, e.createdAt]
      );
    }

    // Inserir Manutenções Iniciais
    await dbRun(
      `INSERT INTO maintenances (id, equipmentId, date, description, partsCost, laborCost, cost, paymentMethod, technician, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['mnt_1', 'eq_1001', '2026-08-15', 'Troca da fonte de alimentação 500W 80 Plus e limpeza interna preventiva', 250.00, 100.00, 350.00, 'PIX', 'Suporte Técnico Eletro Zone', new Date().toISOString()]
    );

    await dbRun(
      `INSERT INTO maintenances (id, equipmentId, date, description, partsCost, laborCost, cost, paymentMethod, technician, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ['mnt_3', 'eq_1004', '2026-08-20', 'Rebobinamento de estator e substituição dos rolamentos dianteiro/traseiro SKF', 450.00, 400.00, 850.00, 'BOLETO', 'Eletrotécnica Central', new Date().toISOString()]
    );
  }

  // Verificação e População Inicial do Estoque
  const countStock = await dbGet('SELECT COUNT(*) as count FROM stock_items');
  if (countStock.count === 0) {
    console.log('🏷️ Inserindo dados iniciais do Estoque no SQLite...');
    const initialStock = [
      { id: 'stk_1', name: 'SSD NVMe 512GB Kingston M.2', category: 'Hardware', condition: 'NOVO', quantity: 12, minQuantity: 3, unitPrice: 230.00, location: 'Prateleira A-01' },
      { id: 'stk_2', name: 'Fonte de Alimentação ATX 500W 80 Plus Redragon', category: 'Fontes / Energia', condition: 'NOVO', quantity: 8, minQuantity: 2, unitPrice: 220.00, location: 'Prateleira A-02' },
      { id: 'stk_3', name: 'Rolamento Blindado SKF 6205-2RSH (para Motores)', category: 'Motores / Elétrica', condition: 'NOVO', quantity: 15, minQuantity: 5, unitPrice: 45.00, location: 'Prateleira B-04' },
      { id: 'stk_4', name: 'Placa Mãe LGA 1200 Asus Prime H510M-E', category: 'Hardware', condition: 'SEMINOVO', quantity: 3, minQuantity: 1, unitPrice: 380.00, location: 'Prateleira A-03' },
      { id: 'stk_5', name: 'Toner Monocromático Brother TN-660', category: 'Impressão', condition: 'NOVO', quantity: 1, minQuantity: 3, unitPrice: 85.00, location: 'Armário C-01' },
      { id: 'stk_6', name: 'Motor Elétrico WEG 3CV 220V Revisado', category: 'Motores / Elétrica', condition: 'USADO', quantity: 2, minQuantity: 1, unitPrice: 550.00, location: 'Galpão B' }
    ];

    for (const item of initialStock) {
      await dbRun(
        `INSERT INTO stock_items (id, name, category, condition, quantity, minQuantity, unitPrice, location, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.name, item.category, item.condition, item.quantity, item.minQuantity, item.unitPrice, item.location, new Date().toISOString()]
      );
    }
  }

  // Verificação e População Inicial do Livro Caixa
  const countCash = await dbGet('SELECT COUNT(*) as count FROM cashbook');
  if (countCash.count === 0) {
    console.log('💰 Inserindo dados iniciais do Livro Caixa no SQLite...');
    const initialCash = [
      { id: 'cb_101', date: '2026-09-01', type: 'ENTRADA', category: 'Serviços Prestados', description: 'Instalação de Sistema de Câmeras CFTV - Cliente Condomínio Solar', amount: 3500.00, paymentMethod: 'PIX', equipmentId: null },
      { id: 'cb_102', date: '2026-09-02', type: 'SAIDA', category: 'Manutenção / Peças', description: 'Manutenção Motor MTR-BOMBA-01: Rolamentos e Rebobinamento', amount: 850.00, paymentMethod: 'BOLETO', equipmentId: 'eq_1004' },
      { id: 'cb_103', date: '2026-09-02', type: 'ENTRADA', category: 'Venda de Equipamento', description: 'Venda de Nobreak 1200VA Eletro Zone', amount: 780.00, paymentMethod: 'CARTAO_CREDITO', equipmentId: null },
      { id: 'cb_104', date: '2026-09-03', type: 'SAIDA', category: 'Compra de Peças', description: 'Aquisição de 5x SSD NVMe 512GB Kingston para estoque', amount: 1150.00, paymentMethod: 'PIX', equipmentId: null }
    ];

    for (const c of initialCash) {
      await dbRun(
        `INSERT INTO cashbook (id, date, type, category, description, amount, paymentMethod, equipmentId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c.id, c.date, c.type, c.category, c.description, c.amount, c.paymentMethod, c.equipmentId, new Date().toISOString()]
      );
    }
  }

  // Verificação e População Inicial de Ordens de Serviço e Orçamentos
  const countOrders = await dbGet('SELECT COUNT(*) as count FROM service_orders');
  if (countOrders.count === 0) {
    console.log('📋 Inserindo dados iniciais de OS & Orçamentos no SQLite...');
    const initialOrders = [
      {
        id: 'os_2001',
        code: 'ORC-2026-001',
        type: 'ORCAMENTO',
        clientName: 'Empresa Alfa Soluções Digital',
        clientContact: '(11) 98822-1044 / contato@alfasolucoes.com',
        equipmentId: 'eq_1001',
        equipmentDescription: 'PC-TI-ADM01 (Dell OptiPlex 7090 Tower)',
        status: 'AGUARDANDO_APROVACAO',
        problemDescription: 'Computador desliga sozinho durante uso intenso e apresenta lentidão extrema.',
        technicalDiagnosis: 'Superaquecimento do processador devido a pasta térmica ressecada e necessidade de upgrade para SSD NVMe 1TB.',
        servicesCost: 150.00,
        partsCost: 380.00,
        totalCost: 530.00,
        paymentMethod: 'PIX',
        technician: 'Carlos Eduardo (TI)',
        validityDate: '2026-09-15',
        completionDate: '',
        createdAt: new Date().toISOString()
      },
      {
        id: 'os_2002',
        code: 'OS-2026-002',
        type: 'ORDEM_SERVICO',
        clientName: 'Condomínio Residencial Solar',
        clientContact: '(11) 3456-7890 / gerencia@condominiosolar.com',
        equipmentId: 'eq_1004',
        equipmentDescription: 'MTR-BOMBA-01 (Motor WEG Trifásico 5CV)',
        status: 'EM_ANDAMENTO',
        problemDescription: 'Motor elétrico da bomba d\'água fazendo ruído excessivo de rolamento travando.',
        technicalDiagnosis: 'Troca dos rolamentos dianteiro/traseiro blindados SKF e alinhamento mecânico do eixo.',
        servicesCost: 300.00,
        partsCost: 180.00,
        totalCost: 480.00,
        paymentMethod: 'BOLETO',
        technician: 'Técnico Especialista em Motores',
        validityDate: '',
        completionDate: '',
        createdAt: new Date().toISOString()
      },
      {
        id: 'os_2003',
        code: 'OS-2026-003',
        type: 'ORDEM_SERVICO',
        clientName: 'Setor de Recursos Humanos - Matriz',
        clientContact: 'Ramal 204 (Mariana)',
        equipmentId: 'eq_1002',
        equipmentDescription: 'NOTE-RH-02 (Lenovo ThinkPad E14 Gen 2)',
        status: 'CONCLUIDO',
        problemDescription: 'Tela piscando e sistema operacional não iniciando após atualização corrompida.',
        technicalDiagnosis: 'Reinstalação limpa do Windows 11 Pro, backup de arquivos e restauração dos drivers de vídeo.',
        servicesCost: 200.00,
        partsCost: 0.00,
        totalCost: 200.00,
        paymentMethod: 'PIX',
        technician: 'Lucas Silva',
        validityDate: '',
        completionDate: '2026-09-02',
        createdAt: new Date().toISOString()
      }
    ];

    for (const ord of initialOrders) {
      await dbRun(
        `INSERT INTO service_orders (id, code, type, clientName, clientContact, equipmentId, equipmentDescription, status, problemDescription, technicalDiagnosis, servicesCost, partsCost, totalCost, paymentMethod, technician, validityDate, completionDate, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [ord.id, ord.code, ord.type, ord.clientName, ord.clientContact, ord.equipmentId, ord.equipmentDescription, ord.status, ord.problemDescription, ord.technicalDiagnosis, ord.servicesCost, ord.partsCost, ord.totalCost, ord.paymentMethod, ord.technician, ord.validityDate, ord.completionDate, ord.createdAt]
      );
    }
  }
}

module.exports = {
  db,
  dbRun,
  dbAll,
  dbGet,
  initDatabase
};
