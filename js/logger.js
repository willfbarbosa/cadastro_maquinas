/**
 * MÓDULO DE LOGS, AUDITORIA E CAPTURA DE ERROS
 * Registra modificações de inventário, acessos e captura erros em tempo de execução.
 */

const STORAGE_LOGS_KEY = 'app_inventory_logs';

const LoggerModule = {
  /**
   * Inicializa o módulo e instala capturadores globais de erros
   */
  init() {
    this.setupGlobalErrorCatchers();
  },

  /**
   * Obtém a lista de logs ordenados do mais recente para o mais antigo
   */
  getLogs() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_LOGS_KEY) || '[]');
    } catch (e) {
      console.error('Erro ao ler logs do localStorage:', e);
      return [];
    }
  },

  /**
   * Adiciona um novo registro de log
   * @param {'INFO' | 'MODIFICATION' | 'ERROR'} type Tipo do registro
   * @param {string} action Ação executada (ex: "CADASTRAR_EQUIPAMENTO", "LOGIN")
   * @param {string} description Descrição detalhada amigável
   * @param {object|null} details Dados adicionais/metadata
   */
  addLog(type, action, description, details = null) {
    const logs = this.getLogs();
    const currentUser = (typeof AuthModule !== 'undefined' && AuthModule.getCurrentUser) 
      ? AuthModule.getCurrentUser() 
      : null;

    const newLog = {
      id: 'log_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString(),
      type: type || 'INFO',
      action: action || 'ACAO_DESCONHECIDA',
      description: description || '',
      user: currentUser ? `${currentUser.fullname} (@${currentUser.username})` : 'Sistema / Visitante',
      details: details ? JSON.stringify(details) : null
    };

    // Limita a 500 registros para evitar estourar o localStorage
    logs.unshift(newLog);
    if (logs.length > 500) {
      logs.pop();
    }

    try {
      localStorage.setItem(STORAGE_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
      console.error('Erro ao salvar log:', e);
    }

    return newLog;
  },

  /**
   * Atalhos específicos para facilidade de uso
   */
  info(action, description, details = null) {
    return this.addLog('INFO', action, description, details);
  },

  modification(action, description, details = null) {
    return this.addLog('MODIFICATION', action, description, details);
  },

  error(action, description, details = null) {
    return this.addLog('ERROR', action, description, details);
  },

  /**
   * Captura erros globais de runtime do navegador
   */
  setupGlobalErrorCatchers() {
    window.addEventListener('error', (event) => {
      const errorMsg = event.message || 'Erro de Execução Desconhecido';
      const errorSource = `${event.filename || 'script'}:${event.lineno || 0}:${event.colno || 0}`;
      this.error(
        'ERRO_RUNTIME_JS',
        `Erro de JavaScript detectado: ${errorMsg}`,
        { source: errorSource, stack: event.error ? event.error.stack : null }
      );
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason ? (event.reason.message || String(event.reason)) : 'Promise rejeitada';
      this.error(
        'PROMISE_REJEITADA',
        `Promessa não tratada rejeitada: ${reason}`,
        { reason }
      );
    });
  },

  /**
   * Limpa todo o histórico de logs
   */
  clearLogs() {
    localStorage.removeItem(STORAGE_LOGS_KEY);
    this.info('LIMPEZA_LOGS', 'O histórico de logs foi limpo pelo administrador.');
  },

  /**
   * Exporta o log em formato CSV
   */
  exportLogsCSV() {
    const logs = this.getLogs();
    if (logs.length === 0) {
      alert('Não há registros de logs para exportar.');
      return;
    }

    const headers = ['DATA_HORA', 'TIPO', 'ACAO', 'USUARIO', 'DESCRICAO', 'DETALHES'];
    const rows = logs.map(l => [
      `"${new Date(l.timestamp).toLocaleString('pt-BR')}"`,
      `"${l.type}"`,
      `"${l.action}"`,
      `"${l.user}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `log_modificacoes_erros_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }
};

// Inicialização automática
LoggerModule.init();
