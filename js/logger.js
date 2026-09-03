/**
 * MÓDULO DE LOGS E AUDITORIA - ELETRO ZONE
 * Persiste registros de alteração e erros no banco de dados SQLite / API REST.
 */

const STORAGE_LOGS_KEY = 'app_inventory_logs';

const LoggerModule = {
  async logAsync(type, action, description, details = null) {
    const currentUser = AuthModule.getCurrentUser();
    const username = currentUser ? currentUser.username : 'Sistema';

    try {
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, action, user: username, description })
      });
    } catch (e) {
      console.warn('Servidor SQLite offline. Salvando log localmente.');
    }

    const logEntry = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      type: type,
      action: action,
      user: username,
      description: description,
      details: details
    };

    const logs = this.getLogs();
    logs.unshift(logEntry);
    if (logs.length > 500) logs.pop();
    localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs));

    return logEntry;
  },

  info(action, description, details = null) {
    return this.logAsync('INFO', action, description, details);
  },

  modification(action, description, details = null) {
    return this.logAsync('MODIFICATION', action, description, details);
  },

  error(action, description, errorObj = null) {
    const details = errorObj ? { message: errorObj.message, stack: errorObj.stack } : null;
    return this.logAsync('ERROR', action, description, details);
  },

  getLogs() {
    const stored = localStorage.getItem(STORAGE_LOGS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  async getLogsAsync() {
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(data.logs));
        return data.logs;
      }
    } catch (e) {
      console.warn('API SQLite inacessível.');
    }
    return this.getLogs();
  },

  async clearLogsAsync() {
    try {
      await fetch('/api/logs', { method: 'DELETE' });
    } catch (e) {
      console.warn('Erro ao deletar logs via API:', e);
    }
    localStorage.removeItem(STORAGE_LOGS_KEY);
  },

  clearLogs() {
    localStorage.removeItem(STORAGE_LOGS_KEY);
  },

  exportLogsCSV() {
    const logs = this.getLogs();
    if (logs.length === 0) {
      alert('Não há logs registrados para exportar.');
      return;
    }

    const headers = ['TIMESTAMP', 'TIPO', 'ACAO', 'USUARIO', 'DESCRICAO'];
    const rows = logs.map(l => [
      `"${l.timestamp}"`,
      `"${l.type}"`,
      `"${l.action}"`,
      `"${l.user}"`,
      `"${l.description.replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logs_auditoria_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

window.addEventListener('error', (event) => {
  if (typeof LoggerModule !== 'undefined') {
    LoggerModule.error('ERRO_JAVASCRIPT_RUNTIME', `Erro global: ${event.message} em ${event.filename}:${event.lineno}`, event.error);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  if (typeof LoggerModule !== 'undefined') {
    LoggerModule.error('PROMISE_NAO_TRATADA', `Rejeição assíncrona: ${event.reason}`, event.reason);
  }
});
