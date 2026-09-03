/**
 * SERVIDOR EXPRESS BACKEND COM BANCO DE DADOS SQLITE (ELETRO ZONE)
 * Serve os arquivos estáticos do WebApp e disponibiliza rotas REST API completas.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, dbAll, dbRun, dbGet } = require('./db');

const app = express();
let PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend (HTML, CSS, JS, Img)
app.use(express.static(path.join(__dirname)));

// ============================================================================
// ROTAS DE AUTENTICAÇÃO E GERENCIAMENTO DE USUÁRIOS
// ============================================================================

app.get('/api/auth/users', async (req, res) => {
  try {
    const rows = await dbAll('SELECT id, username, fullname, role, permissions, createdAt FROM users ORDER BY createdAt DESC');
    const users = rows.map(u => ({
      ...u,
      permissions: JSON.parse(u.permissions)
    }));
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/setup', async (req, res) => {
  try {
    const { fullname, username, password } = req.body;
    const count = await dbGet('SELECT COUNT(*) as count FROM users');
    if (count.count > 0) {
      return res.status(400).json({ success: false, message: 'Administrador mestre já cadastrado.' });
    }

    const userId = 'usr_' + Date.now();
    const permissions = JSON.stringify({ canCreate: true, canEdit: true, canDelete: true, isAdmin: true });
    const createdAt = new Date().toISOString();

    await dbRun(
      `INSERT INTO users (id, username, fullname, password, role, permissions, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, username.trim().toLowerCase(), fullname.trim(), password, 'ADMIN', permissions, createdAt]
    );

    const user = { id: userId, username: username.trim().toLowerCase(), fullname: fullname.trim(), role: 'ADMIN', permissions: JSON.parse(permissions) };
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE LOWER(username) = ?', [username.trim().toLowerCase()]);
    
    if (!user || user.password !== password) {
      return res.status(401).json({ success: false, message: 'Usuário ou senha incorretos.' });
    }

    const userObj = {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      permissions: JSON.parse(user.permissions)
    };

    res.json({ success: true, user: userObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/auth/users', async (req, res) => {
  try {
    const { id, fullname, username, password, permissions } = req.body;
    const permStr = JSON.stringify(permissions);

    if (id) {
      if (password && password.trim() !== '') {
        await dbRun(
          `UPDATE users SET fullname = ?, username = ?, password = ?, permissions = ? WHERE id = ?`,
          [fullname.trim(), username.trim().toLowerCase(), password, permStr, id]
        );
      } else {
        await dbRun(
          `UPDATE users SET fullname = ?, username = ?, permissions = ? WHERE id = ?`,
          [fullname.trim(), username.trim().toLowerCase(), permStr, id]
        );
      }
    } else {
      const newId = 'usr_' + Date.now();
      await dbRun(
        `INSERT INTO users (id, username, fullname, password, role, permissions, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [newId, username.trim().toLowerCase(), fullname.trim(), password || '123456', permissions.isAdmin ? 'ADMIN' : 'USER', permStr, new Date().toISOString()]
      );
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/auth/users/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// ROTAS DE EQUIPAMENTOS (INVENTÁRIO DE ATIVOS & MOTORES)
// ============================================================================

app.get('/api/equipments', async (req, res) => {
  try {
    const equipments = await dbAll('SELECT * FROM equipments ORDER BY createdAt DESC');
    const maintenances = await dbAll('SELECT * FROM maintenances ORDER BY date DESC');

    const result = equipments.map(eq => ({
      ...eq,
      maintenances: maintenances.filter(m => m.equipmentId === eq.id)
    }));

    res.json({ success: true, equipments: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/equipments', async (req, res) => {
  try {
    const data = req.body;
    const id = data.id || 'eq_' + Date.now();
    const createdAt = new Date().toISOString();

    await dbRun(
      `INSERT INTO equipments (id, tipo, host, ip, anydesk, empresa, status, setor, usuario, processador, ram, armazenamento, ns, marca, modelo, notaFiscal, fornecedor, nextPreventiveDate, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.tipo, data.host, data.ip, data.anydesk || 'N/A', data.empresa || 'Eletro Zone Matriz', data.status || 'ATIVO', data.setor, data.usuario, data.processador || 'N/A', data.ram || 'N/A', data.armazenamento || 'N/A', data.ns, data.marca, data.modelo, data.notaFiscal || '', data.fornecedor || '', data.nextPreventiveDate || '', createdAt]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/equipments/:id', async (req, res) => {
  try {
    const data = req.body;
    const updatedAt = new Date().toISOString();

    await dbRun(
      `UPDATE equipments SET tipo = ?, host = ?, ip = ?, anydesk = ?, empresa = ?, status = ?, setor = ?, usuario = ?, processador = ?, ram = ?, armazenamento = ?, ns = ?, marca = ?, modelo = ?, notaFiscal = ?, fornecedor = ?, nextPreventiveDate = ?, updatedAt = ?
       WHERE id = ?`,
      [data.tipo, data.host, data.ip, data.anydesk || 'N/A', data.empresa || 'Eletro Zone Matriz', data.status || 'ATIVO', data.setor, data.usuario, data.processador || 'N/A', data.ram || 'N/A', data.armazenamento || 'N/A', data.ns, data.marca, data.modelo, data.notaFiscal || '', data.fornecedor || '', data.nextPreventiveDate || '', updatedAt, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/equipments/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM equipments WHERE id = ?', [req.params.id]);
    await dbRun('DELETE FROM maintenances WHERE equipmentId = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/equipments/:id/maintenances', async (req, res) => {
  try {
    const { date, description, partsCost, laborCost, cost, paymentMethod, technician, autoCashbook } = req.body;
    const mntId = 'mnt_' + Date.now();
    const createdAt = new Date().toISOString();

    await dbRun(
      `INSERT INTO maintenances (id, equipmentId, date, description, partsCost, laborCost, cost, paymentMethod, technician, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [mntId, req.params.id, date, description, partsCost || 0, laborCost || 0, cost || 0, paymentMethod, technician || 'Suporte Técnico', createdAt]
    );

    if (autoCashbook && cost > 0) {
      const eq = await dbGet('SELECT host FROM equipments WHERE id = ?', [req.params.id]);
      const hostName = eq ? eq.host : req.params.id;
      const cbId = 'cb_' + Date.now();
      await dbRun(
        `INSERT INTO cashbook (id, date, type, category, description, amount, paymentMethod, equipmentId, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [cbId, date, 'SAIDA', 'Manutenção / Peças', `Manutenção ${hostName}: ${description}`, cost, paymentMethod, req.params.id, createdAt]
      );
    }

    res.json({ success: true, mntId });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// ROTAS DO CONTROLE DE ESTOQUE
// ============================================================================

app.get('/api/stock', async (req, res) => {
  try {
    const items = await dbAll('SELECT * FROM stock_items ORDER BY createdAt DESC');
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/stock', async (req, res) => {
  try {
    const data = req.body;
    const id = 'stk_' + Date.now();
    const createdAt = new Date().toISOString();

    await dbRun(
      `INSERT INTO stock_items (id, name, category, condition, quantity, minQuantity, unitPrice, location, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.name, data.category, data.condition, data.quantity || 0, data.minQuantity || 1, data.unitPrice || 0, data.location || 'Almoxarifado', createdAt]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/stock/:id', async (req, res) => {
  try {
    const data = req.body;
    const updatedAt = new Date().toISOString();

    await dbRun(
      `UPDATE stock_items SET name = ?, category = ?, condition = ?, quantity = ?, minQuantity = ?, unitPrice = ?, location = ?, updatedAt = ?
       WHERE id = ?`,
      [data.name, data.category, data.condition, data.quantity, data.minQuantity, data.unitPrice, data.location, updatedAt, req.params.id]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/stock/:id/movement', async (req, res) => {
  try {
    const { change } = req.body;
    const item = await dbGet('SELECT quantity FROM stock_items WHERE id = ?', [req.params.id]);
    if (!item) return res.status(404).json({ success: false, message: 'Produto não encontrado.' });

    const newQty = item.quantity + change;
    if (newQty < 0) return res.status(400).json({ success: false, message: 'Quantidade não pode ser negativa.' });

    await dbRun('UPDATE stock_items SET quantity = ?, updatedAt = ? WHERE id = ?', [newQty, new Date().toISOString(), req.params.id]);
    res.json({ success: true, newQty });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/stock/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM stock_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// ROTAS DO LIVRO CAIXA
// ============================================================================

app.get('/api/cashbook', async (req, res) => {
  try {
    const entries = await dbAll('SELECT * FROM cashbook ORDER BY date DESC, createdAt DESC');
    res.json({ success: true, entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/cashbook', async (req, res) => {
  try {
    const data = req.body;
    const id = 'cb_' + Date.now();
    const createdAt = new Date().toISOString();

    await dbRun(
      `INSERT INTO cashbook (id, date, type, category, description, amount, paymentMethod, equipmentId, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, data.date, data.type, data.category, data.description, data.amount, data.paymentMethod, data.equipmentId || null, createdAt]
    );

    res.json({ success: true, id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/cashbook/:id', async (req, res) => {
  try {
    await dbRun('DELETE FROM cashbook WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// ROTAS DE LOGS DO SISTEMA
// ============================================================================

app.get('/api/logs', async (req, res) => {
  try {
    const logs = await dbAll('SELECT * FROM logs ORDER BY timestamp DESC LIMIT 500');
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/logs', async (req, res) => {
  try {
    const { type, action, user, description } = req.body;
    const id = 'log_' + Date.now();
    const timestamp = new Date().toISOString();

    await dbRun(
      `INSERT INTO logs (id, timestamp, type, action, user, description) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, timestamp, type || 'INFO', action, user || 'Sistema', description]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/logs', async (req, res) => {
  try {
    await dbRun('DELETE FROM logs');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

function startServer(portToUse) {
  const server = app.listen(portToUse, () => {
    console.log(`🚀 Servidor Eletro Zone Backend (SQLite) rodando na porta ${portToUse}`);
    console.log(`👉 Acesse a aplicação no navegador em: http://localhost:${portToUse}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Porta ${portToUse} em uso. Tentando porta ${portToUse + 1}...`);
      startServer(portToUse + 1);
    } else {
      console.error('❌ Erro no servidor:', err);
    }
  });
}

// Inicialização do Banco de Dados e Servidor Express
initDatabase().then(() => {
  startServer(PORT);
}).catch(err => {
  console.error('❌ Erro fatal ao iniciar banco de dados:', err);
});
