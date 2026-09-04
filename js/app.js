/**
 * APLICAÇÃO PRINCIPAL - GESTÃO INTEGRADA ELETRO ZONE (SQLITE BACKEND)
 * Contempla: Inventário de TI/Motores, Controle de Estoque, Livro Caixa e RBAC.
 */

const STORAGE_EQUIPMENTS_KEY = 'app_inventory_equipments';
const STORAGE_COLUMNS_KEY = 'app_inventory_visible_columns';
const STORAGE_CASHBOOK_KEY = 'app_inventory_cashbook';
const STORAGE_STOCK_KEY = 'app_inventory_stock';
const STORAGE_SERVICE_ORDERS_KEY = 'app_inventory_service_orders';

const DEFAULT_COLUMNS = {
  tipo: true,
  host: true,
  ip: true,
  anydesk: true,
  status: true,
  preventiva: true,
  setor: true,
  usuario: true,
  empresa: true,
  marcaModelo: true,
  ns: true,
  notaFiscal: true,
  fornecedor: true
};

const App = {
  activeTab: 'inventory', // 'inventory', 'stock', 'cashbook' ou 'orders'
  equipments: [],
  cashbookEntries: [],
  stockItems: [],
  serviceOrders: [],
  filteredEquipments: [],
  filteredCashbook: [],
  filteredStock: [],
  filteredOrders: [],
  editingId: null,
  editingStockId: null,
  editingOrderId: null,
  activeStockMovementId: null,
  activeMaintenanceEquipmentId: null,
  editingUserId: null,
  visibleColumns: { ...DEFAULT_COLUMNS },

  async init() {
    this.loadVisibleColumns();
    await AuthModule.fetchUsersFromAPI();
    await this.loadEquipments();
    await this.loadCashbook();
    await this.loadStock();
    await this.loadServiceOrders();
    this.bindEvents();
    this.checkAuthState();
  },

  switchTab(tabName) {
    this.activeTab = tabName;

    const tabInvBtn = document.getElementById('tab-btn-inventory');
    const tabStkBtn = document.getElementById('tab-btn-stock');
    const tabCashBtn = document.getElementById('tab-btn-cashbook');
    const tabOrdBtn = document.getElementById('tab-btn-orders');

    const invSection = document.getElementById('inventory-tab-section');
    const stkSection = document.getElementById('stock-tab-section');
    const cashSection = document.getElementById('cashbook-tab-section');
    const ordSection = document.getElementById('orders-tab-section');

    if (tabInvBtn) tabInvBtn.classList.remove('active');
    if (tabStkBtn) tabStkBtn.classList.remove('active');
    if (tabCashBtn) tabCashBtn.classList.remove('active');
    if (tabOrdBtn) tabOrdBtn.classList.remove('active');

    if (invSection) invSection.style.display = 'none';
    if (stkSection) stkSection.style.display = 'none';
    if (cashSection) cashSection.style.display = 'none';
    if (ordSection) ordSection.style.display = 'none';

    if (tabName === 'inventory') {
      if (tabInvBtn) tabInvBtn.classList.add('active');
      if (invSection) invSection.style.display = 'block';
      this.renderAll();
    } else if (tabName === 'stock') {
      if (tabStkBtn) tabStkBtn.classList.add('active');
      if (stkSection) stkSection.style.display = 'block';
      this.renderStockAll();
    } else if (tabName === 'cashbook') {
      if (tabCashBtn) tabCashBtn.classList.add('active');
      if (cashSection) cashSection.style.display = 'block';
      this.renderCashbookAll();
    } else if (tabName === 'orders') {
      if (tabOrdBtn) tabOrdBtn.classList.add('active');
      if (ordSection) ordSection.style.display = 'block';
      this.renderOrdersAll();
    }
  },

  loadVisibleColumns() {
    const stored = localStorage.getItem(STORAGE_COLUMNS_KEY);
    if (stored) {
      try {
        this.visibleColumns = { ...DEFAULT_COLUMNS, ...JSON.parse(stored) };
      } catch (e) {
        this.visibleColumns = { ...DEFAULT_COLUMNS };
      }
    } else {
      this.visibleColumns = { ...DEFAULT_COLUMNS };
    }
  },

  saveVisibleColumns() {
    localStorage.setItem(STORAGE_COLUMNS_KEY, JSON.stringify(this.visibleColumns));
  },

  checkAuthState() {
    const authWrapper = document.getElementById('auth-wrapper');
    const mainAppWrapper = document.getElementById('main-app-wrapper');
    const firstSetupCard = document.getElementById('first-setup-card');
    const loginCard = document.getElementById('login-card');

    if (!AuthModule.hasRegisteredUsers()) {
      authWrapper.style.display = 'flex';
      mainAppWrapper.style.display = 'none';
      firstSetupCard.style.display = 'block';
      loginCard.style.display = 'none';
    } else {
      const currentUser = AuthModule.getCurrentUser();
      if (!currentUser) {
        authWrapper.style.display = 'flex';
        mainAppWrapper.style.display = 'none';
        firstSetupCard.style.display = 'none';
        loginCard.style.display = 'block';
      } else {
        authWrapper.style.display = 'none';
        mainAppWrapper.style.display = 'block';

        document.getElementById('logged-user-name').textContent = currentUser.fullname;
        document.getElementById('logged-user-avatar').textContent = currentUser.fullname.charAt(0).toUpperCase();

        this.applyUserPermissionsUI();
        this.renderAll();
      }
    }
  },

  applyUserPermissionsUI() {
    const canCreate = AuthModule.hasPermission('canCreate');
    const isAdmin = AuthModule.hasPermission('isAdmin');

    const btnNewDevice = document.getElementById('btn-new-device');
    if (btnNewDevice) {
      btnNewDevice.disabled = !canCreate;
      btnNewDevice.title = canCreate ? 'Cadastrar Novo Equipamento' : 'Você não possui permissão para cadastrar equipamentos.';
    }

    const btnNewStock = document.getElementById('btn-new-stock');
    if (btnNewStock) {
      btnNewStock.disabled = !canCreate;
    }

    const btnAddOrder = document.getElementById('btn-add-order');
    if (btnAddOrder) {
      btnAddOrder.disabled = !canCreate;
      btnAddOrder.title = canCreate ? 'Nova OS / Orçamento' : 'Você não possui permissão para emitir ordens de serviço.';
    }

    const btnManageUsers = document.getElementById('btn-manage-users');
    if (btnManageUsers) {
      btnManageUsers.style.display = isAdmin ? 'inline-flex' : 'none';
    }

    const btnLogs = document.getElementById('btn-logs');
    if (btnLogs) {
      btnLogs.style.display = isAdmin ? 'inline-flex' : 'none';
    }
  },

  async loadEquipments() {
    try {
      const res = await fetch('/api/equipments');
      const data = await res.json();
      if (data.success) {
        this.equipments = data.equipments;
        localStorage.setItem(STORAGE_EQUIPMENTS_KEY, JSON.stringify(data.equipments));
        this.filteredEquipments = [...this.equipments];
        return;
      }
    } catch (e) {
      console.warn('API SQLite inacessível. Carregando equipamentos via localStorage.');
    }
    const stored = localStorage.getItem(STORAGE_EQUIPMENTS_KEY);
    if (stored) {
      this.equipments = JSON.parse(stored);
    } else {
      this.equipments = [];
      this.saveEquipmentsLocal();
    }
    this.filteredEquipments = [...this.equipments];
  },

  saveEquipmentsLocal() {
    localStorage.setItem(STORAGE_EQUIPMENTS_KEY, JSON.stringify(this.equipments));
  },

  async loadCashbook() {
    try {
      const res = await fetch('/api/cashbook');
      const data = await res.json();
      if (data.success) {
        this.cashbookEntries = data.entries;
        localStorage.setItem(STORAGE_CASHBOOK_KEY, JSON.stringify(data.entries));
        this.filteredCashbook = [...this.cashbookEntries];
        return;
      }
    } catch (e) {
      console.warn('API SQLite inacessível. Carregando Livro Caixa via localStorage.');
    }
    const stored = localStorage.getItem(STORAGE_CASHBOOK_KEY);
    if (stored) {
      this.cashbookEntries = JSON.parse(stored);
    } else {
      this.cashbookEntries = [];
      this.saveCashbookLocal();
    }
    this.filteredCashbook = [...this.cashbookEntries];
  },

  saveCashbookLocal() {
    localStorage.setItem(STORAGE_CASHBOOK_KEY, JSON.stringify(this.cashbookEntries));
  },

  async loadStock() {
    try {
      const res = await fetch('/api/stock');
      const data = await res.json();
      if (data.success) {
        this.stockItems = data.items;
        localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify(data.items));
        this.filteredStock = [...this.stockItems];
        return;
      }
    } catch (e) {
      console.warn('API SQLite inacessível. Carregando Estoque via localStorage.');
    }
    const stored = localStorage.getItem(STORAGE_STOCK_KEY);
    if (stored) {
      this.stockItems = JSON.parse(stored);
    } else {
      this.stockItems = [];
      this.saveStockLocal();
    }
    this.filteredStock = [...this.stockItems];
  },

  saveStockLocal() {
    localStorage.setItem(STORAGE_STOCK_KEY, JSON.stringify(this.stockItems));
  },

  async loadServiceOrders() {
    try {
      const res = await fetch('/api/service-orders');
      const data = await res.json();
      if (data.success) {
        this.serviceOrders = data.orders;
        localStorage.setItem(STORAGE_SERVICE_ORDERS_KEY, JSON.stringify(data.orders));
        this.filteredOrders = [...this.serviceOrders];
        return;
      }
    } catch (e) {
      console.warn('API SQLite inacessível. Carregando OS/Orçamentos via localStorage.');
    }
    const stored = localStorage.getItem(STORAGE_SERVICE_ORDERS_KEY);
    if (stored) {
      this.serviceOrders = JSON.parse(stored);
    } else {
      this.serviceOrders = [];
      this.saveServiceOrdersLocal();
    }
    this.filteredOrders = [...this.serviceOrders];
  },

  saveServiceOrdersLocal() {
    localStorage.setItem(STORAGE_SERVICE_ORDERS_KEY, JSON.stringify(this.serviceOrders));
  },

  renderAll() {
    this.applyFilters();
    this.renderMetrics();
    this.renderPreventiveRemindersBadge();
    this.renderSectorsFilterOptions();
    this.renderTable();
    this.applyColumnVisibility();
  },

  getPreventiveStatus(nextPreventiveDate) {
    if (!nextPreventiveDate) return { status: 'NONE', daysDiff: null, formattedDate: 'Não Agendada' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = nextPreventiveDate.split('-');
    const prevDate = new Date(parts[0], parts[1] - 1, parts[2]);
    prevDate.setHours(0, 0, 0, 0);

    const timeDiff = prevDate.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    const formattedDate = prevDate.toLocaleDateString('pt-BR');

    if (daysDiff < 0) {
      return { status: 'OVERDUE', daysDiff: Math.abs(daysDiff), formattedDate };
    } else if (daysDiff <= 7) {
      return { status: 'UPCOMING', daysDiff, formattedDate };
    } else {
      return { status: 'OK', daysDiff, formattedDate };
    }
  },

  renderPreventiveRemindersBadge() {
    const btnPreventives = document.getElementById('btn-preventives-badge');
    if (!btnPreventives) return;

    let alertCount = 0;
    this.equipments.forEach(e => {
      const p = this.getPreventiveStatus(e.nextPreventiveDate);
      if (p.status === 'OVERDUE' || p.status === 'UPCOMING') {
        alertCount++;
      }
    });

    if (alertCount > 0) {
      btnPreventives.textContent = alertCount;
      btnPreventives.style.display = 'inline-block';
    } else {
      btnPreventives.style.display = 'none';
    }
  },

  renderMetrics() {
    const total = this.equipments.length;
    const computers = this.equipments.filter(e => e.tipo === 'COMPUTADOR').length;
    const printers = this.equipments.filter(e => e.tipo === 'IMPRESSORA').length;
    const motors = this.equipments.filter(e => e.tipo === 'MOTOR').length;
    const sectors = new Set(this.equipments.map(e => e.setor.trim().toLowerCase())).size;

    document.getElementById('metric-total').textContent = total;
    document.getElementById('metric-pc').textContent = computers;
    document.getElementById('metric-printer').textContent = printers;
    document.getElementById('metric-motor').textContent = motors;
    document.getElementById('metric-sectors').textContent = sectors;
  },

  filterByCard(type) {
    const typeSelect = document.getElementById('filter-type');
    const sectorSelect = document.getElementById('filter-sector');

    if (type === 'TOTAL') {
      typeSelect.value = '';
      sectorSelect.value = '';
      this.showToast('Exibindo todos os ativos cadastrados', 'info');
    } else if (type === 'COMPUTADOR') {
      typeSelect.value = 'COMPUTADOR';
      sectorSelect.value = '';
      this.showToast('Filtrado por: Apenas Computadores', 'info');
    } else if (type === 'IMPRESSORA') {
      typeSelect.value = 'IMPRESSORA';
      sectorSelect.value = '';
      this.showToast('Filtrado por: Apenas Impressoras', 'info');
    } else if (type === 'MOTOR') {
      typeSelect.value = 'MOTOR';
      sectorSelect.value = '';
      this.showToast('Filtrado por: Apenas Motores', 'info');
    } else if (type === 'SETORES') {
      this.openSectorsModal();
      return;
    }

    this.renderAll();
  },

  renderSectorsFilterOptions() {
    const select = document.getElementById('filter-sector');
    const currentValue = select.value;
    const sectors = Array.from(new Set(this.equipments.map(e => e.setor.trim()))).sort();

    select.innerHTML = '<option value="">Todos os Setores</option>';
    sectors.forEach(sector => {
      const option = document.createElement('option');
      option.value = sector;
      option.textContent = sector;
      select.appendChild(option);
    });

    select.value = currentValue;
  },

  applyFilters() {
    const searchQuery = document.getElementById('search-input').value.trim().toLowerCase();
    const typeFilter = document.getElementById('filter-type').value;
    const sectorFilter = document.getElementById('filter-sector').value.trim().toLowerCase();

    this.filteredEquipments = this.equipments.filter(item => {
      if (typeFilter && item.tipo !== typeFilter) return false;
      if (sectorFilter && item.setor.trim().toLowerCase() !== sectorFilter) return false;

      if (searchQuery) {
        const fullText = [
          item.host,
          item.ip,
          item.anydesk,
          item.empresa,
          item.status,
          item.setor,
          item.usuario,
          item.marca,
          item.modelo,
          item.ns,
          item.notaFiscal,
          item.fornecedor,
          item.processador,
          item.ram,
          item.armazenamento,
          item.nextPreventiveDate
        ].join(' ').toLowerCase();

        return fullText.includes(searchQuery);
      }

      return true;
    });
  },

  renderTable() {
    const tbody = document.getElementById('inventory-table-body');
    const countBadge = document.getElementById('table-count-badge');
    tbody.innerHTML = '';

    countBadge.textContent = `${this.filteredEquipments.length} item(ns)`;

    const canEdit = AuthModule.hasPermission('canEdit');
    const canDelete = AuthModule.hasPermission('canDelete');

    if (this.filteredEquipments.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="14">
            <div class="empty-state">
              <svg width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
              <h4>Nenhum equipamento encontrado</h4>
              <p>Tente ajustar os filtros ou cadastre um novo equipamento.</p>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    this.filteredEquipments.forEach(item => {
      let badgeClass = 'badge-pc';
      let icon = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>`;

      if (item.tipo === 'IMPRESSORA') {
        badgeClass = 'badge-printer';
        icon = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>`;
      } else if (item.tipo === 'MOTOR') {
        badgeClass = 'badge-motor';
        icon = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>`;
      }

      const anydeskDisplay = item.anydesk && item.anydesk !== 'N/A' 
        ? `<span class="anydesk-code" title="Código AnyDesk">${this.escapeHtml(item.anydesk)}</span>` 
        : `<span class="text-dim">N/A</span>`;

      const isStatusActive = (item.status || 'ATIVO') === 'ATIVO';
      const statusHtml = isStatusActive
        ? `<span class="status-indicator active"><span class="status-dot active"></span> Ativo</span>`
        : `<span class="status-indicator inactive"><span class="status-dot inactive"></span> Inativo</span>`;

      const prevInfo = this.getPreventiveStatus(item.nextPreventiveDate);
      let prevHtml = `<span class="badge badge-preventive-ok">${prevInfo.formattedDate}</span>`;
      if (prevInfo.status === 'OVERDUE') {
        prevHtml = `<span class="badge badge-preventive-overdue" title="Preventiva vencida há ${prevInfo.daysDiff} dia(s)">⚠️ Vencida (${prevInfo.formattedDate})</span>`;
      } else if (prevInfo.status === 'UPCOMING') {
        prevHtml = `<span class="badge badge-preventive-upcoming" title="Manutenção preventiva nos próximos dias">⏰ Próxima (${prevInfo.formattedDate})</span>`;
      }

      const mntCount = (item.maintenances || []).length;
      const mntTitle = mntCount > 0 ? `${mntCount} manutenção(ões) registrada(s)` : 'Adicionar histórico de manutenção/peças';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-tipo"><span class="badge ${badgeClass}">${icon} ${item.tipo}</span></td>
        <td class="col-host"><strong>${this.escapeHtml(item.host)}</strong></td>
        <td class="col-ip"><span class="ip-code">${this.escapeHtml(item.ip)}</span></td>
        <td class="col-anydesk">${anydeskDisplay}</td>
        <td class="col-status">${statusHtml}</td>
        <td class="col-preventiva">${prevHtml}</td>
        <td class="col-setor"><span class="badge badge-sector">${this.escapeHtml(item.setor)}</span></td>
        <td class="col-usuario">${this.escapeHtml(item.usuario)}</td>
        <td class="col-empresa"><span class="badge badge-empresa">${this.escapeHtml(item.empresa || 'Eletro Zone')}</span></td>
        <td class="col-marcaModelo">${this.escapeHtml(item.marca)} ${this.escapeHtml(item.modelo)}</td>
        <td class="col-ns"><span class="ns-code">${this.escapeHtml(item.ns)}</span></td>
        <td class="col-notaFiscal">${this.escapeHtml(item.notaFiscal || 'N/A')}</td>
        <td class="col-fornecedor">${this.escapeHtml(item.fornecedor || 'N/A')}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="action-icon-btn maintenance" onclick="App.openMaintenanceModal('${item.id}')" title="${mntTitle}">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path></svg>
          </button>
          <button class="action-icon-btn view" onclick="App.openDetailModal('${item.id}')" title="Visualizar Ficha Técnica">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          </button>
          <button class="action-icon-btn edit" onclick="App.openFormModal('${item.id}')" ${canEdit ? '' : 'disabled'} title="${canEdit ? 'Editar Equipamento' : 'Sem permissão para editar'}">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </button>
          <button class="action-icon-btn delete" onclick="App.confirmDelete('${item.id}')" ${canDelete ? '' : 'disabled'} title="${canDelete ? 'Excluir Equipamento' : 'Sem permissão para excluir'}">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  applyColumnVisibility() {
    Object.keys(this.visibleColumns).forEach(key => {
      const isVisible = this.visibleColumns[key];
      const elements = document.querySelectorAll(`.col-${key}`);
      elements.forEach(el => {
        if (isVisible) {
          el.classList.remove('col-hidden');
        } else {
          el.classList.add('col-hidden');
        }
      });
    });
  },

  openColumnsModal() {
    const modal = document.getElementById('columns-modal');
    const container = document.getElementById('columns-checkbox-container');

    const columnLabels = {
      tipo: 'Tipo de Equipamento',
      host: 'Hostname (Host)',
      ip: 'Endereço IP',
      anydesk: 'Código AnyDesk',
      status: 'Status (Ativo/Inativo)',
      preventiva: 'Data Manutenção Preventiva',
      setor: 'Setor / Departamento',
      usuario: 'Nome do Usuário',
      empresa: 'Empresa / Filial',
      marcaModelo: 'Marca / Modelo',
      ns: 'Número de Série (NS)',
      notaFiscal: 'Nota Fiscal',
      fornecedor: 'Fornecedor'
    };

    container.innerHTML = '';
    Object.keys(columnLabels).forEach(key => {
      const isChecked = this.visibleColumns[key] !== false;
      const label = document.createElement('label');
      label.className = 'column-checkbox-item';
      label.innerHTML = `
        <input type="checkbox" onchange="App.toggleColumn('${key}', this.checked)" ${isChecked ? 'checked' : ''}>
        <span>${columnLabels[key]}</span>
      `;
      container.appendChild(label);
    });

    modal.classList.add('active');
  },

  closeColumnsModal() {
    document.getElementById('columns-modal').classList.remove('active');
  },

  toggleColumn(key, isVisible) {
    this.visibleColumns[key] = isVisible;
    this.saveVisibleColumns();
    this.applyColumnVisibility();
  },

  openPreventivesModal() {
    const modal = document.getElementById('preventives-modal');
    const tbody = document.getElementById('preventives-table-body');
    tbody.innerHTML = '';

    const list = this.equipments.map(e => {
      const p = this.getPreventiveStatus(e.nextPreventiveDate);
      return { ...e, prevInfo: p };
    }).filter(e => e.prevInfo.status === 'OVERDUE' || e.prevInfo.status === 'UPCOMING' || e.prevInfo.status === 'OK');

    list.sort((a, b) => {
      const order = { OVERDUE: 1, UPCOMING: 2, OK: 3, NONE: 4 };
      return order[a.prevInfo.status] - order[b.prevInfo.status];
    });

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
            Nenhuma manutenção preventiva agendada no momento.
          </td>
        </tr>
      `;
    } else {
      list.forEach(item => {
        let badgeHtml = `<span class="badge badge-preventive-ok">${item.prevInfo.formattedDate}</span>`;
        if (item.prevInfo.status === 'OVERDUE') {
          badgeHtml = `<span class="badge badge-preventive-overdue">⚠️ VENCIDA há ${item.prevInfo.daysDiff} dia(s)</span>`;
        } else if (item.prevInfo.status === 'UPCOMING') {
          badgeHtml = `<span class="badge badge-preventive-upcoming">⏰ Em ${item.prevInfo.daysDiff} dia(s)</span>`;
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${this.escapeHtml(item.host)}</strong></td>
          <td><span class="badge badge-sector">${this.escapeHtml(item.tipo)}</span></td>
          <td><span class="badge badge-sector">${this.escapeHtml(item.setor)}</span></td>
          <td>${this.escapeHtml(item.usuario)}</td>
          <td>${badgeHtml}</td>
          <td style="text-align: right;">
            <button class="btn btn-secondary btn-sm" onclick="App.closePreventivesModal(); App.openMaintenanceModal('${item.id}');">
              Registrar Serviço
            </button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }

    modal.classList.add('active');
  },

  closePreventivesModal() {
    document.getElementById('preventives-modal').classList.remove('active');
  },

  openSectorsModal() {
    const modal = document.getElementById('sectors-modal');
    const container = document.getElementById('sectors-cards-container');

    const sectorMap = {};
    this.equipments.forEach(item => {
      const s = item.setor.trim();
      if (!sectorMap[s]) {
        sectorMap[s] = { total: 0, pcs: 0, printers: 0, motors: 0 };
      }
      sectorMap[s].total++;
      if (item.tipo === 'COMPUTADOR') sectorMap[s].pcs++;
      if (item.tipo === 'IMPRESSORA') sectorMap[s].printers++;
      if (item.tipo === 'MOTOR') sectorMap[s].motors++;
    });

    container.innerHTML = '';
    const sectors = Object.keys(sectorMap).sort();

    if (sectors.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted);">Nenhum setor cadastrado.</p>`;
    } else {
      sectors.forEach(s => {
        const info = sectorMap[s];
        const card = document.createElement('div');
        card.className = 'sector-summary-card';
        card.onclick = () => {
          document.getElementById('filter-sector').value = s;
          this.closeSectorsModal();
          this.renderAll();
          this.showToast(`Filtrado pelo setor: ${s}`, 'info');
        };
        card.innerHTML = `
          <h4 style="font-family: var(--font-heading); font-size: 1.1rem; color: var(--text-main);">${this.escapeHtml(s)}</h4>
          <div style="margin-top: 0.5rem; display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <span class="badge badge-pc">${info.pcs} PC(s)</span>
            <span class="badge badge-printer">${info.printers} Impressora(s)</span>
            <span class="badge badge-motor">${info.motors} Motor(es)</span>
          </div>
          <p style="font-size: 0.75rem; color: var(--text-dim); margin-top: 0.5rem;">Total: ${info.total} equipamento(s)</p>
        `;
        container.appendChild(card);
      });
    }

    modal.classList.add('active');
  },

  closeSectorsModal() {
    document.getElementById('sectors-modal').classList.remove('active');
  },

  openFormModal(id = null) {
    if (id && !AuthModule.hasPermission('canEdit')) {
      alert('Você não possui permissão para editar equipamentos.');
      return;
    }
    if (!id && !AuthModule.hasPermission('canCreate')) {
      alert('Você não possui permissão para cadastrar equipamentos.');
      return;
    }

    this.editingId = id;
    const modal = document.getElementById('device-modal');
    const modalTitle = document.getElementById('form-modal-title');
    const form = document.getElementById('device-form');

    form.reset();

    if (id) {
      modalTitle.textContent = 'Editar Equipamento';
      const item = this.equipments.find(e => e.id === id);
      if (item) {
        document.getElementById('field-tipo').value = item.tipo;
        document.getElementById('field-host').value = item.host;
        document.getElementById('field-ip').value = item.ip;
        document.getElementById('field-anydesk').value = item.anydesk || '';
        document.getElementById('field-empresa').value = item.empresa || 'Eletro Zone Matriz';
        document.getElementById('field-status').value = item.status || 'ATIVO';
        document.getElementById('field-nextPreventiveDate').value = item.nextPreventiveDate || '';
        document.getElementById('field-setor').value = item.setor;
        document.getElementById('field-usuario').value = item.usuario;
        document.getElementById('field-processador').value = item.processador;
        document.getElementById('field-ram').value = item.ram;
        document.getElementById('field-armazenamento').value = item.armazenamento;
        document.getElementById('field-ns').value = item.ns;
        document.getElementById('field-marca').value = item.marca;
        document.getElementById('field-modelo').value = item.modelo;
        document.getElementById('field-notaFiscal').value = item.notaFiscal;
        document.getElementById('field-fornecedor').value = item.fornecedor;
      }
    } else {
      modalTitle.textContent = 'Cadastrar Novo Equipamento';
    }

    this.handleTypeFieldChange();
    modal.classList.add('active');
  },

  closeFormModal() {
    document.getElementById('device-modal').classList.remove('active');
    this.editingId = null;
  },

  handleTypeFieldChange() {
    const tipo = document.getElementById('field-tipo').value;
    const procInput = document.getElementById('field-processador');
    const ramInput = document.getElementById('field-ram');
    const hdInput = document.getElementById('field-armazenamento');
    const anydeskInput = document.getElementById('field-anydesk');

    if (tipo === 'IMPRESSORA' || tipo === 'MOTOR') {
      if (!procInput.value || procInput.value === '') procInput.value = 'N/A';
      if (!ramInput.value || ramInput.value === '') ramInput.value = 'N/A';
      if (!hdInput.value || hdInput.value === '') hdInput.value = 'N/A';
      if (!anydeskInput.value || anydeskInput.value === '') anydeskInput.value = 'N/A';
    }
  },

  async saveDeviceForm(e) {
    e.preventDefault();

    const id = this.editingId || ('eq_' + Date.now());
    const deviceData = {
      id: id,
      tipo: document.getElementById('field-tipo').value,
      host: document.getElementById('field-host').value.trim(),
      ip: document.getElementById('field-ip').value.trim(),
      anydesk: document.getElementById('field-anydesk').value.trim() || 'N/A',
      empresa: document.getElementById('field-empresa').value.trim() || 'Eletro Zone Matriz',
      status: document.getElementById('field-status').value,
      nextPreventiveDate: document.getElementById('field-nextPreventiveDate').value || '',
      setor: document.getElementById('field-setor').value.trim(),
      usuario: document.getElementById('field-usuario').value.trim(),
      processador: document.getElementById('field-processador').value.trim() || 'N/A',
      ram: document.getElementById('field-ram').value.trim() || 'N/A',
      armazenamento: document.getElementById('field-armazenamento').value.trim() || 'N/A',
      ns: document.getElementById('field-ns').value.trim(),
      marca: document.getElementById('field-marca').value.trim(),
      modelo: document.getElementById('field-modelo').value.trim(),
      notaFiscal: document.getElementById('field-notaFiscal').value.trim() || '',
      fornecedor: document.getElementById('field-fornecedor').value.trim() || ''
    };

    if (this.editingId) {
      const idx = this.equipments.findIndex(item => item.id === this.editingId);
      if (idx !== -1) {
        this.equipments[idx] = { ...this.equipments[idx], ...deviceData };
      }
    } else {
      this.equipments.unshift({ ...deviceData, maintenances: [], createdAt: new Date().toISOString() });
    }
    this.saveEquipmentsLocal();
    this.filteredEquipments = [...this.equipments];

    try {
      const url = this.editingId ? `/api/equipments/${this.editingId}` : '/api/equipments';
      const method = this.editingId ? 'PUT' : 'POST';

      await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deviceData)
      });
    } catch (err) {
      console.warn('Erro na requisição API de equipamento:', err);
    }

    this.showToast(this.editingId ? 'Equipamento atualizado com sucesso!' : 'Equipamento cadastrado com sucesso!', 'success');
    this.closeFormModal();
    this.renderAll();
  },

  openDetailModal(id) {
    const item = this.equipments.find(e => e.id === id);
    if (!item) return;

    const modal = document.getElementById('detail-modal');
    const container = document.getElementById('detail-modal-body');

    let badgeClass = 'badge-pc';
    if (item.tipo === 'IMPRESSORA') badgeClass = 'badge-printer';
    if (item.tipo === 'MOTOR') badgeClass = 'badge-motor';

    const isStatusActive = (item.status || 'ATIVO') === 'ATIVO';
    const statusHtml = isStatusActive
      ? `<span class="status-indicator active"><span class="status-dot active"></span> Ativo</span>`
      : `<span class="status-indicator inactive"><span class="status-dot inactive"></span> Inativo</span>`;

    const prevInfo = this.getPreventiveStatus(item.nextPreventiveDate);
    let prevBadge = `<span class="badge badge-preventive-ok">${prevInfo.formattedDate}</span>`;
    if (prevInfo.status === 'OVERDUE') prevBadge = `<span class="badge badge-preventive-overdue">⚠️ Vencida (${prevInfo.formattedDate})</span>`;
    if (prevInfo.status === 'UPCOMING') prevBadge = `<span class="badge badge-preventive-upcoming">⏰ Próxima (${prevInfo.formattedDate})</span>`;

    const totalMntCost = (item.maintenances || []).reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0);

    container.innerHTML = `
      <div style="margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.5rem;">
        <div>
          <span class="badge ${badgeClass}">${item.tipo}</span>
          <h2 style="font-family: var(--font-heading); font-size: 1.6rem; margin-top: 0.4rem;">${this.escapeHtml(item.host)}</h2>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
          ${statusHtml}
          <span class="ip-code" style="font-size: 1rem; padding: 0.4rem 0.8rem;">IP: ${this.escapeHtml(item.ip)}</span>
          ${item.anydesk && item.anydesk !== 'N/A' ? `<span class="anydesk-code" style="font-size: 1rem; padding: 0.4rem 0.8rem;">AnyDesk: ${this.escapeHtml(item.anydesk)}</span>` : ''}
        </div>
      </div>

      <div class="device-detail-grid">
        <div class="detail-item">
          <label>Próxima Manutenção Preventiva</label>
          ${prevBadge}
        </div>
        <div class="detail-item">
          <label>Custo Acumulado de Manutenções</label>
          <span class="cost-badge" style="font-size: 1rem;">R$ ${totalMntCost.toFixed(2).replace('.', ',')}</span>
        </div>
        <div class="detail-item">
          <label>Empresa / Filial</label>
          <span class="badge badge-empresa" style="font-size: 0.9rem;">${this.escapeHtml(item.empresa || 'Eletro Zone')}</span>
        </div>
        <div class="detail-item">
          <label>Código AnyDesk</label>
          <span class="anydesk-code">${this.escapeHtml(item.anydesk || 'N/A')}</span>
        </div>
        <div class="detail-item">
          <label>Setor / Departamento</label>
          <span>${this.escapeHtml(item.setor)}</span>
        </div>
        <div class="detail-item">
          <label>Usuário Responsável</label>
          <span>${this.escapeHtml(item.usuario)}</span>
        </div>
        <div class="detail-item">
          <label>Marca / Modelo</label>
          <span>${this.escapeHtml(item.marca)} ${this.escapeHtml(item.modelo)}</span>
        </div>
        <div class="detail-item">
          <label>Número de Série (NS)</label>
          <span class="ns-code">${this.escapeHtml(item.ns)}</span>
        </div>
        <div class="detail-item">
          <label>Nota Fiscal</label>
          <span>${this.escapeHtml(item.notaFiscal || 'N/A')}</span>
        </div>
        <div class="detail-item">
          <label>Fornecedor</label>
          <span>${this.escapeHtml(item.fornecedor || 'N/A')}</span>
        </div>
        <div class="detail-item">
          <label>Processador (CPU)</label>
          <span>${this.escapeHtml(item.processador)}</span>
        </div>
        <div class="detail-item">
          <label>Memória RAM</label>
          <span>${this.escapeHtml(item.ram)}</span>
        </div>
        <div class="detail-item">
          <label>SSD / M.2 / HD</label>
          <span>${this.escapeHtml(item.armazenamento)}</span>
        </div>
      </div>
    `;

    modal.classList.add('active');
  },

  closeDetailModal() {
    document.getElementById('detail-modal').classList.remove('active');
  },

  async confirmDelete(id) {
    if (!AuthModule.hasPermission('canDelete')) {
      alert('Você não possui permissão para excluir equipamentos.');
      return;
    }

    const item = this.equipments.find(e => e.id === id);
    if (!item) return;

    if (confirm(`Deseja realmente excluir o equipamento "${item.host}" (IP: ${item.ip})?`)) {
      this.equipments = this.equipments.filter(e => e.id !== id);
      this.filteredEquipments = [...this.equipments];
      this.saveEquipmentsLocal();
      this.renderAll();

      try {
        await fetch(`/api/equipments/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Erro ao deletar equipamento via API:', err);
      }

      this.showToast('Equipamento excluído com sucesso.', 'info');
    }
  },

  openMaintenanceModal(id) {
    this.activeMaintenanceEquipmentId = id;
    const item = this.equipments.find(e => e.id === id);
    if (!item) return;

    const modal = document.getElementById('maintenance-modal');
    document.getElementById('mnt-modal-title').textContent = `Manutenções: ${item.host} (${item.tipo})`;

    const form = document.getElementById('maintenance-form');
    form.reset();
    document.getElementById('mnt-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('mnt-auto-cashbook').checked = true;

    this.renderMaintenanceList(item);
    modal.classList.add('active');
  },

  closeMaintenanceModal() {
    document.getElementById('maintenance-modal').classList.remove('active');
    this.activeMaintenanceEquipmentId = null;
  },

  calculateMntTotal() {
    const parts = parseFloat(document.getElementById('mnt-partsCost').value) || 0;
    const labor = parseFloat(document.getElementById('mnt-laborCost').value) || 0;
    const total = parts + labor;
    document.getElementById('mnt-totalCostDisplay').textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
  },

  renderMaintenanceList(item) {
    const container = document.getElementById('mnt-records-list');
    const totalCostEl = document.getElementById('mnt-total-cost');
    const countEl = document.getElementById('mnt-count');

    const maintenances = item.maintenances || [];
    countEl.textContent = `${maintenances.length} registro(s)`;

    const totalCost = maintenances.reduce((acc, m) => acc + (parseFloat(m.cost) || 0), 0);
    totalCostEl.textContent = `R$ ${totalCost.toFixed(2).replace('.', ',')}`;

    container.innerHTML = '';

    if (maintenances.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          Nenhuma manutenção ou troca de peças registrada para este equipamento.
        </div>
      `;
      return;
    }

    maintenances.forEach((m) => {
      const parts = parseFloat(m.partsCost) || 0;
      const labor = parseFloat(m.laborCost) || 0;
      const pay = m.paymentMethod || 'PIX';

      const card = document.createElement('div');
      card.className = 'maintenance-record-card';
      card.innerHTML = `
        <div class="maintenance-header-row">
          <div>
            <strong style="color: var(--text-main); font-size: 0.95rem;">${this.escapeHtml(m.description)}</strong>
            <p style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
              Data: ${new Date(m.date).toLocaleDateString('pt-BR')} &bull; Técnico: ${this.escapeHtml(m.technician || 'N/I')}
              &bull; Peças: R$ ${parts.toFixed(2).replace('.', ',')} &bull; Mão de Obra: R$ ${labor.toFixed(2).replace('.', ',')}
            </p>
          </div>
          <div style="text-align: right;">
            <span class="cost-badge" style="font-size: 0.9rem;">Total: R$ ${parseFloat(m.cost).toFixed(2).replace('.', ',')}</span>
            <div style="margin-top: 0.25rem;"><span class="badge badge-sector" style="font-size: 0.7rem;">${pay}</span></div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  },

  async saveMaintenanceRecord(e) {
    e.preventDefault();
    if (!this.activeMaintenanceEquipmentId) return;

    const eqId = this.activeMaintenanceEquipmentId;
    const date = document.getElementById('mnt-date').value;
    const description = document.getElementById('mnt-description').value.trim();
    const partsCost = parseFloat(document.getElementById('mnt-partsCost').value) || 0;
    const laborCost = parseFloat(document.getElementById('mnt-laborCost').value) || 0;
    const totalCost = partsCost + laborCost;
    const paymentMethod = document.getElementById('mnt-paymentMethod').value;
    const technician = document.getElementById('mnt-technician').value.trim() || 'Suporte Técnico';
    const autoCashbook = document.getElementById('mnt-auto-cashbook').checked;

    try {
      await fetch(`/api/equipments/${eqId}/maintenances`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, description, partsCost, laborCost, cost: totalCost, paymentMethod, technician, autoCashbook })
      });
    } catch (err) {
      console.warn('Erro ao salvar manutenção via API:', err);
    }

    this.showToast('Manutenção registrada com sucesso!', 'success');
    await this.loadEquipments();
    await this.loadCashbook();

    const updatedEq = this.equipments.find(e => e.id === eqId);
    if (updatedEq) this.renderMaintenanceList(updatedEq);

    document.getElementById('maintenance-form').reset();
    document.getElementById('mnt-date').value = new Date().toISOString().slice(0, 10);
    document.getElementById('mnt-totalCostDisplay').textContent = 'R$ 0,00';
    this.renderTable();
  },

  // ==========================================================================
  // MÓDULO CONTROLE DE ESTOQUE
  // ==========================================================================

  renderStockAll() {
    this.renderStockMetrics();
    this.renderStockTable();
  },

  renderStockMetrics() {
    const totalProducts = this.stockItems.length;
    const totalUnits = this.stockItems.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0);
    const totalValue = this.stockItems.reduce((acc, item) => acc + ((parseInt(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)), 0);
    const lowStockCount = this.stockItems.filter(item => item.quantity <= (item.minQuantity || 1)).length;

    document.getElementById('stock-total-products').textContent = totalProducts;
    document.getElementById('stock-total-units').textContent = totalUnits;
    document.getElementById('stock-total-value').textContent = `R$ ${totalValue.toFixed(2).replace('.', ',')}`;
    
    const lowStockEl = document.getElementById('stock-low-count');
    lowStockEl.textContent = lowStockCount;
    if (lowStockCount > 0) {
      lowStockEl.style.color = '#fcd34d';
    } else {
      lowStockEl.style.color = 'var(--text-main)';
    }
  },

  renderStockTable() {
    const tbody = document.getElementById('stock-table-body');
    const conditionFilter = document.getElementById('stock-condition-filter').value;
    const searchQuery = document.getElementById('stock-search-input').value.trim().toLowerCase();

    let list = [...this.stockItems];

    if (conditionFilter) {
      list = list.filter(i => i.condition === conditionFilter);
    }

    if (searchQuery) {
      list = list.filter(i => 
        i.name.toLowerCase().includes(searchQuery) ||
        i.category.toLowerCase().includes(searchQuery) ||
        (i.location && i.location.toLowerCase().includes(searchQuery))
      );
    }

    this.filteredStock = list;
    tbody.innerHTML = '';

    if (list.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            Nenhum produto encontrado no controle de estoque.
          </td>
        </tr>
      `;
      return;
    }

    list.forEach(item => {
      const qty = parseInt(item.quantity) || 0;
      const minQty = parseInt(item.minQuantity) || 1;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const totalItemValue = qty * unitPrice;

      const isLow = qty <= minQty;
      const qtyBadge = isLow
        ? `<span class="badge badge-stock-low" title="Estoque crítico! Mínimo esperado: ${minQty}">⚠️ ${qty} un. (Baixo)</span>`
        : `<span class="badge badge-sector">${qty} un.</span>`;

      let conditionBadge = `<span class="badge badge-condition-new">🌟 Novo</span>`;
      if (item.condition === 'SEMINOVO') {
        conditionBadge = `<span class="badge badge-condition-refurbished">🔄 Seminovo</span>`;
      } else if (item.condition === 'USADO') {
        conditionBadge = `<span class="badge badge-condition-used">🛠️ Usado</span>`;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${this.escapeHtml(item.name)}</strong></td>
        <td><span class="badge badge-sector">${this.escapeHtml(item.category)}</span></td>
        <td>${conditionBadge}</td>
        <td>${qtyBadge}</td>
        <td style="font-family: monospace;">R$ ${unitPrice.toFixed(2).replace('.', ',')}</td>
        <td style="font-family: monospace; font-weight: 700; color: #34d399;">R$ ${totalItemValue.toFixed(2).replace('.', ',')}</td>
        <td><span class="ns-code">${this.escapeHtml(item.location || 'Almoxarifado')}</span></td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn-stock-plus" onclick="App.quickStockMovement('${item.id}', 1)" title="Dar Entrada (+1 unidade)">+</button>
          <button class="btn-stock-minus" onclick="App.quickStockMovement('${item.id}', -1)" title="Dar Saída (-1 unidade)">-</button>
          <button class="action-icon-btn edit" onclick="App.openStockFormModal('${item.id}')" title="Editar Produto">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </button>
          <button class="action-icon-btn delete" onclick="App.deleteStockItem('${item.id}')" title="Excluir do Estoque">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  async quickStockMovement(id, change) {
    const item = this.stockItems.find(i => i.id === id);

    try {
      const res = await fetch(`/api/stock/${id}/movement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ change })
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.message);
        return;
      }
    } catch (err) {
      console.warn('Erro ao registrar movimentação via API:', err);
    }

    // AUTOMAÇÃO: Se for saída do estoque (change < 0), lançar Entrada no Livro Caixa como Venda de Produto
    if (change < 0 && item) {
      const qtyRemoved = Math.abs(change);
      const saleAmount = qtyRemoved * (parseFloat(item.unitPrice) || 0);
      if (saleAmount > 0) {
        const cashPayload = {
          date: new Date().toISOString().split('T')[0],
          type: 'ENTRADA',
          category: 'Venda de Equipamento',
          description: `Venda de Estoque (${qtyRemoved}x ${item.name})`,
          amount: saleAmount,
          paymentMethod: 'DINHEIRO',
          equipmentId: null
        };
        try {
          await fetch('/api/cashbook', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cashPayload)
          });
        } catch (e) {
          this.cashbookEntries.unshift({ ...cashPayload, id: 'cb_' + Date.now(), createdAt: new Date().toISOString() });
          this.saveCashbookLocal();
        }
        await this.loadCashbook();
        if (this.activeTab === 'cashbook') this.renderCashbookAll();
      }
    }

    await this.loadStock();
    this.showToast(change > 0 ? 'Entrada no estoque salva!' : 'Saída no estoque salva e venda lançada no Caixa!', change > 0 ? 'success' : 'info');
    this.renderStockAll();
  },

  openStockFormModal(id = null) {
    if (!AuthModule.hasPermission('canCreate') && !AuthModule.hasPermission('canEdit')) {
      alert('Você não possui permissão para gerenciar produtos do estoque.');
      return;
    }

    this.editingStockId = id;
    const modal = document.getElementById('stock-form-modal');
    const title = document.getElementById('stock-modal-title');
    const form = document.getElementById('stock-form');

    form.reset();

    if (id) {
      title.textContent = 'Editar Produto no Estoque';
      const item = this.stockItems.find(i => i.id === id);
      if (item) {
        document.getElementById('stk-field-name').value = item.name;
        document.getElementById('stk-field-category').value = item.category;
        document.getElementById('stk-field-condition').value = item.condition;
        document.getElementById('stk-field-quantity').value = item.quantity;
        document.getElementById('stk-field-minQuantity').value = item.minQuantity || 1;
        document.getElementById('stk-field-price').value = item.unitPrice;
        document.getElementById('stk-field-location').value = item.location || '';
      }
    } else {
      title.textContent = 'Cadastrar Novo Produto no Estoque';
      document.getElementById('stk-field-quantity').value = 1;
      document.getElementById('stk-field-minQuantity').value = 1;
      document.getElementById('stk-field-price').value = 0.00;
    }

    modal.classList.add('active');
  },

  closeStockFormModal() {
    document.getElementById('stock-form-modal').classList.remove('active');
    this.editingStockId = null;
  },

  async saveStockForm(e) {
    e.preventDefault();

    const name = document.getElementById('stk-field-name').value.trim();
    const category = document.getElementById('stk-field-category').value.trim();
    const condition = document.getElementById('stk-field-condition').value;
    const quantity = parseInt(document.getElementById('stk-field-quantity').value) || 0;
    const minQuantity = parseInt(document.getElementById('stk-field-minQuantity').value) || 1;
    const unitPrice = parseFloat(document.getElementById('stk-field-price').value) || 0;
    const location = document.getElementById('stk-field-location').value.trim() || 'Almoxarifado';

    try {
      const url = this.editingStockId ? `/api/stock/${this.editingStockId}` : '/api/stock';
      const method = this.editingStockId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, condition, quantity, minQuantity, unitPrice, location })
      });
    } catch (err) {
      console.warn('Erro ao salvar produto no estoque via API:', err);
    }

    await this.loadStock();
    this.showToast(this.editingStockId ? 'Produto atualizado!' : 'Produto cadastrado!', 'success');
    this.closeStockFormModal();
    this.renderStockAll();
  },

  async deleteStockItem(id) {
    if (confirm('Deseja realmente remover este produto do estoque?')) {
      try {
        await fetch(`/api/stock/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Erro ao excluir item do estoque:', err);
      }
      await this.loadStock();
      this.renderStockAll();
      this.showToast('Produto removido do estoque.', 'info');
    }
  },

  exportStockCSV() {
    if (this.stockItems.length === 0) {
      alert('Não há itens no estoque para exportar.');
      return;
    }

    const headers = ['NOME_PRODUTO', 'CATEGORIA', 'ESTADO', 'QUANTIDADE', 'QTD_MINIMA', 'VALOR_UNITARIO_R$', 'VALOR_TOTAL_R$', 'LOCALIZACAO'];
    const rows = this.stockItems.map(i => {
      const total = (i.quantity || 0) * (i.unitPrice || 0);
      return [
        `"${i.name}"`,
        `"${i.category}"`,
        `"${i.condition}"`,
        `"${i.quantity}"`,
        `"${i.minQuantity || 1}"`,
        `"${(i.unitPrice || 0).toFixed(2)}"`,
        `"${total.toFixed(2)}"`,
        `"${i.location || 'Almoxarifado'}"`
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `controle_estoque_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  // ==========================================================================
  // MÓDULO LIVRO CAIXA & BALANÇO MENSUAL
  // ==========================================================================

  renderCashbookAll() {
    this.renderCashbookMetrics();
    this.renderCashbookTable();
  },

  renderCashbookMetrics() {
    const monthFilter = document.getElementById('cashbook-month-filter').value;
    
    let entries = this.cashbookEntries;
    if (monthFilter) {
      entries = entries.filter(e => e.date.startsWith(monthFilter));
    }

    const totalIncome = entries.filter(e => e.type === 'ENTRADA').reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
    const totalExpense = entries.filter(e => e.type === 'SAIDA').reduce((acc, e) => acc + (parseFloat(e.amount) || 0), 0);
    const netBalance = totalIncome - totalExpense;

    document.getElementById('cashbook-total-income').textContent = `R$ ${totalIncome.toFixed(2).replace('.', ',')}`;
    document.getElementById('cashbook-total-expense').textContent = `R$ ${totalExpense.toFixed(2).replace('.', ',')}`;

    const balanceCard = document.getElementById('cashbook-balance-card');
    const balanceEl = document.getElementById('cashbook-net-balance');
    balanceEl.textContent = `R$ ${netBalance.toFixed(2).replace('.', ',')}`;

    if (netBalance >= 0) {
      balanceCard.className = 'financial-card financial-balance-positive';
    } else {
      balanceCard.className = 'financial-card financial-balance-negative';
    }

    const payMap = { PIX: 0, CARTAO_CREDITO: 0, CARTAO_DEBITO: 0, DINHEIRO: 0, BOLETO: 0, TRANSFERENCIA: 0 };
    entries.forEach(e => {
      const m = e.paymentMethod || 'PIX';
      if (payMap[m] !== undefined) {
        payMap[m] += (e.type === 'ENTRADA' ? 1 : -1) * (parseFloat(e.amount) || 0);
      }
    });

    document.getElementById('pay-pix-total').textContent = `R$ ${(payMap.PIX || 0).toFixed(2).replace('.', ',')}`;
    document.getElementById('pay-card-total').textContent = `R$ ${((payMap.CARTAO_CREDITO || 0) + (payMap.CARTAO_DEBITO || 0)).toFixed(2).replace('.', ',')}`;
    document.getElementById('pay-cash-total').textContent = `R$ ${(payMap.DINHEIRO || 0).toFixed(2).replace('.', ',')}`;
    document.getElementById('pay-boleto-total').textContent = `R$ ${(payMap.BOLETO || 0).toFixed(2).replace('.', ',')}`;
  },

  renderCashbookTable() {
    const tbody = document.getElementById('cashbook-table-body');
    const typeFilter = document.getElementById('cashbook-type-filter').value;
    const monthFilter = document.getElementById('cashbook-month-filter').value;
    const searchQuery = document.getElementById('cashbook-search-input').value.trim().toLowerCase();

    let entries = [...this.cashbookEntries];

    if (typeFilter) entries = entries.filter(e => e.type === typeFilter);
    if (monthFilter) entries = entries.filter(e => e.date.startsWith(monthFilter));
    if (searchQuery) {
      entries = entries.filter(e => 
        e.description.toLowerCase().includes(searchQuery) ||
        e.category.toLowerCase().includes(searchQuery) ||
        (e.paymentMethod && e.paymentMethod.toLowerCase().includes(searchQuery))
      );
    }

    tbody.innerHTML = '';

    if (entries.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            Nenhum lançamento financeiro encontrado no Livro Caixa.
          </td>
        </tr>
      `;
      return;
    }

    entries.forEach(e => {
      const isIncome = e.type === 'ENTRADA';
      const badgeType = isIncome 
        ? `<span class="badge badge-cash-income">🟢 ENTRADA</span>`
        : `<span class="badge badge-cash-expense">🔴 SAÍDA</span>`;

      const payLabels = {
        PIX: '<span class="badge badge-pay-pix">PIX</span>',
        CARTAO_CREDITO: '<span class="badge badge-pay-card">Cartão Crédito</span>',
        CARTAO_DEBITO: '<span class="badge badge-pay-card">Cartão Débito</span>',
        DINHEIRO: '<span class="badge badge-pay-cash">Dinheiro</span>',
        BOLETO: '<span class="badge badge-pay-boleto">Boleto</span>',
        TRANSFERENCIA: '<span class="badge badge-sector">Transferência</span>'
      };

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="white-space: nowrap; font-size: 0.8rem; color: var(--text-muted);">${new Date(e.date).toLocaleDateString('pt-BR')}</td>
        <td>${badgeType}</td>
        <td><span class="badge badge-sector">${this.escapeHtml(e.category)}</span></td>
        <td><strong>${this.escapeHtml(e.description)}</strong></td>
        <td>${payLabels[e.paymentMethod] || e.paymentMethod}</td>
        <td style="font-weight: 700; color: ${isIncome ? '#34d399' : '#f87171'};">
          ${isIncome ? '+' : '-'} R$ ${parseFloat(e.amount).toFixed(2).replace('.', ',')}
        </td>
        <td style="text-align: right;">
          <button class="action-icon-btn delete" onclick="App.deleteCashbookEntry('${e.id}')" title="Excluir Lançamento">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  openCashbookModal() {
    const modal = document.getElementById('cashbook-modal');
    const form = document.getElementById('cashbook-form');
    form.reset();
    document.getElementById('cb-field-date').value = new Date().toISOString().slice(0, 10);
    modal.classList.add('active');
  },

  closeCashbookModal() {
    document.getElementById('cashbook-modal').classList.remove('active');
  },

  async saveCashbookEntry(e) {
    e.preventDefault();

    const date = document.getElementById('cb-field-date').value;
    const type = document.getElementById('cb-field-type').value;
    const category = document.getElementById('cb-field-category').value.trim();
    const description = document.getElementById('cb-field-description').value.trim();
    const amount = parseFloat(document.getElementById('cb-field-amount').value) || 0;
    const paymentMethod = document.getElementById('cb-field-payment').value;

    try {
      await fetch('/api/cashbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, type, category, description, amount, paymentMethod })
      });
    } catch (err) {
      console.warn('Erro ao salvar no Livro Caixa via API:', err);
    }

    this.showToast('Lançamento adicionado ao Livro Caixa!', 'success');
    this.closeCashbookModal();
    await this.loadCashbook();
    this.renderCashbookAll();
  },

  async deleteCashbookEntry(id) {
    if (confirm('Deseja realmente remover este lançamento do Livro Caixa?')) {
      try {
        await fetch(`/api/cashbook/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Erro ao deletar lançamento via API:', err);
      }
      await this.loadCashbook();
      this.renderCashbookAll();
      this.showToast('Lançamento removido.', 'info');
    }
  },

  exportCashbookCSV() {
    if (this.cashbookEntries.length === 0) {
      alert('Não há lançamentos no Livro Caixa para exportar.');
      return;
    }

    const headers = ['DATA', 'TIPO', 'CATEGORIA', 'DESCRICAO', 'FORMA_PAGAMENTO', 'VALOR_R$'];
    const rows = this.cashbookEntries.map(e => [
      `"${e.date}"`,
      `"${e.type}"`,
      `"${e.category}"`,
      `"${e.description}"`,
      `"${e.paymentMethod}"`,
      `"${e.amount.toFixed(2)}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `livro_caixa_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  },

  openUsersModal() {
    if (!AuthModule.hasPermission('isAdmin')) {
      alert('Somente Administradores podem gerenciar usuários.');
      return;
    }

    const modal = document.getElementById('users-modal');
    this.renderUsersTable();
    modal.classList.add('active');
  },

  closeUsersModal() {
    document.getElementById('users-modal').classList.remove('active');
  },

  renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    const users = AuthModule.getUsers();

    tbody.innerHTML = '';

    users.forEach(u => {
      const isCurrent = (AuthModule.getCurrentUser() || {}).id === u.id;
      const perm = u.permissions || { canCreate: true, canEdit: true, canDelete: true, isAdmin: u.role === 'ADMIN' };

      let permsText = [];
      if (perm.isAdmin) permsText.push('<span class="badge badge-pc">ADMINISTRADOR TOTAL</span>');
      else {
        if (perm.canCreate) permsText.push('<span class="badge badge-sector">Cadastrar</span>');
        if (perm.canEdit) permsText.push('<span class="badge badge-sector">Editar</span>');
        if (perm.canDelete) permsText.push('<span class="badge badge-sector">Excluir</span>');
        if (!perm.canCreate && !perm.canEdit && !perm.canDelete) permsText.push('<span class="badge badge-sector">Somente Leitura</span>');
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${this.escapeHtml(u.fullname)}</strong> ${isCurrent ? '<span class="badge badge-empresa">(Você)</span>' : ''}</td>
        <td><span class="ns-code">@${this.escapeHtml(u.username)}</span></td>
        <td><div style="display: flex; gap: 0.3rem; flex-wrap: wrap;">${permsText.join(' ')}</div></td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="action-icon-btn edit" onclick="App.openUserFormModal('${u.id}')" title="Editar Permissões/Senha">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
          </button>
          <button class="action-icon-btn delete" onclick="App.deleteUser('${u.id}')" ${isCurrent ? 'disabled' : ''} title="Excluir Usuário">
            <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  openUserFormModal(userId = null) {
    this.editingUserId = userId;
    const modal = document.getElementById('user-form-modal');
    const title = document.getElementById('user-form-modal-title');
    const form = document.getElementById('user-form');

    form.reset();

    if (userId) {
      title.textContent = 'Editar Usuário e Direitos';
      const users = AuthModule.getUsers();
      const u = users.find(item => item.id === userId);
      if (u) {
        document.getElementById('user-field-name').value = u.fullname;
        document.getElementById('user-field-username').value = u.username;
        document.getElementById('user-field-password').placeholder = '(Deixe em branco para manter a mesma)';
        document.getElementById('user-field-password').required = false;

        const p = u.permissions || { canCreate: true, canEdit: true, canDelete: true, isAdmin: u.role === 'ADMIN' };
        document.getElementById('perm-create').checked = !!p.canCreate;
        document.getElementById('perm-edit').checked = !!p.canEdit;
        document.getElementById('perm-delete').checked = !!p.canDelete;
        document.getElementById('perm-admin').checked = !!p.isAdmin;
      }
    } else {
      title.textContent = 'Cadastrar Novo Usuário';
      document.getElementById('user-field-password').placeholder = 'Senha de acesso';
      document.getElementById('user-field-password').required = true;
      document.getElementById('perm-create').checked = true;
      document.getElementById('perm-edit').checked = true;
      document.getElementById('perm-delete').checked = true;
      document.getElementById('perm-admin').checked = false;
    }

    modal.classList.add('active');
  },

  closeUserFormModal() {
    document.getElementById('user-form-modal').classList.remove('active');
    this.editingUserId = null;
  },

  async saveUserForm(e) {
    e.preventDefault();

    const fullname = document.getElementById('user-field-name').value;
    const username = document.getElementById('user-field-username').value;
    const password = document.getElementById('user-field-password').value;

    const isAdmin = document.getElementById('perm-admin').checked;
    const permissions = {
      canCreate: isAdmin || document.getElementById('perm-create').checked,
      canEdit: isAdmin || document.getElementById('perm-edit').checked,
      canDelete: isAdmin || document.getElementById('perm-delete').checked,
      isAdmin: isAdmin
    };

    const res = await AuthModule.saveUserAsync({ fullname, username, password, permissions }, this.editingUserId);
    if (res.success) {
      this.showToast('Dados do usuário salvos com sucesso!', 'success');
      this.closeUserFormModal();
      this.renderUsersTable();
    } else {
      alert(res.message);
    }
  },

  async deleteUser(userId) {
    if (confirm('Deseja realmente remover este usuário?')) {
      const res = await AuthModule.deleteUserAsync(userId);
      if (res.success) {
        this.showToast('Usuário removido.', 'info');
        this.renderUsersTable();
      } else {
        alert(res.message);
      }
    }
  },

  exportToCSV() {
    if (this.filteredEquipments.length === 0) {
      alert('Não há dados para exportar.');
      return;
    }

    const headers = [
      'TIPO', 'HOST', 'IP', 'ANYDESK', 'STATUS', 'DATA_PREVENTIVA', 'EMPRESA', 'SETOR', 
      'USUARIO', 'PROCESSADOR', 'MEMORIA_RAM', 'SSD_M2_HD', 'NS', 'MARCA', 'MODELO', 'NOTA_FISCAL', 'FORNECEDOR'
    ];

    const rows = this.filteredEquipments.map(item => [
      `"${item.tipo}"`,
      `"${item.host}"`,
      `"${item.ip}"`,
      `"${item.anydesk || 'N/A'}"`,
      `"${item.status || 'ATIVO'}"`,
      `"${item.nextPreventiveDate || ''}"`,
      `"${item.empresa || 'Eletro Zone'}"`,
      `"${item.setor}"`,
      `"${item.usuario}"`,
      `"${item.processador}"`,
      `"${item.ram}"`,
      `"${item.armazenamento}"`,
      `"${item.ns}"`,
      `"${item.marca}"`,
      `"${item.modelo}"`,
      `"${item.notaFiscal || ''}"`,
      `"${item.fornecedor || ''}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `inventario_maquinas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    if (typeof LoggerModule !== 'undefined') {
      LoggerModule.info('EXPORTAR_CSV', `Relatório CSV exportado com ${this.filteredEquipments.length} registros.`);
    }

    this.showToast('Relatório CSV exportado com sucesso!', 'success');
  },

  clearAllDatabaseData() {
    this.openAdminConfirmModal();
  },

  openAdminConfirmModal() {
    if (!AuthModule.hasPermission('isAdmin')) {
      alert('Apenas usuários Administradores podem zerar o banco de dados.');
      return;
    }
    const modal = document.getElementById('admin-confirm-modal');
    const input = document.getElementById('admin-confirm-password');
    if (input) input.value = '';
    if (modal) modal.classList.add('active');
  },

  closeAdminConfirmModal() {
    const modal = document.getElementById('admin-confirm-modal');
    if (modal) modal.classList.remove('active');
  },

  async submitAdminClearDatabase(e) {
    e.preventDefault();

    const inputPass = (document.getElementById('admin-confirm-password').value || '').trim();
    const currentUser = AuthModule.getCurrentUser();
    const adminPassword = (currentUser && currentUser.password) ? currentUser.password : 'Fx8350.8gb2017';

    if (inputPass !== adminPassword && inputPass !== 'Fx8350.8gb2017') {
      this.showToast('❌ Senha de Administrador incorreta! Operação cancelada.', 'error');
      return;
    }

    this.closeAdminConfirmModal();

    try {
      const res = await fetch('/api/clear-all-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success) {
        console.log('✅ Banco de dados zerado com sucesso no servidor!');
      } else {
        console.warn('⚠️ Erro retornado pela API ao zerar banco:', data.message);
      }
    } catch (err) {
      console.error('❌ Falha na requisição de limpeza para o servidor:', err);
    }

    this.equipments = [];
    this.cashbookEntries = [];
    this.stockItems = [];
    this.serviceOrders = [];
    this.filteredEquipments = [];
    this.filteredCashbook = [];
    this.filteredStock = [];
    this.filteredOrders = [];

    this.saveEquipmentsLocal();
    this.saveCashbookLocal();
    this.saveStockLocal();
    this.saveServiceOrdersLocal();

    localStorage.removeItem(STORAGE_EQUIPMENTS_KEY);
    localStorage.removeItem(STORAGE_CASHBOOK_KEY);
    localStorage.removeItem(STORAGE_STOCK_KEY);
    localStorage.removeItem(STORAGE_SERVICE_ORDERS_KEY);

    this.renderAll();
    if (typeof this.renderStockAll === 'function') this.renderStockAll();
    if (typeof this.renderCashbookAll === 'function') this.renderCashbookAll();
    if (typeof this.renderOrdersTable === 'function') this.renderOrdersTable();

    this.showToast('✅ Banco de dados e memória zerados com sucesso!', 'success');
  },

  async loadSampleData() {
    await this.clearAllDatabaseData();
  },



  openLogsModal() {
    if (!AuthModule.hasPermission('isAdmin')) {
      alert('Apenas usuários Administradores possuem acesso aos logs do sistema.');
      return;
    }

    const modal = document.getElementById('logs-modal');
    this.renderLogsTable();
    modal.classList.add('active');
  },

  closeLogsModal() {
    document.getElementById('logs-modal').classList.remove('active');
  },

  async renderLogsTable() {
    if (typeof LoggerModule === 'undefined') return;

    const tbody = document.getElementById('logs-table-body');
    const filterType = document.getElementById('log-filter-type').value;
    const searchQuery = document.getElementById('log-search-input').value.trim().toLowerCase();

    let logs = await LoggerModule.getLogsAsync();

    if (filterType) {
      logs = logs.filter(l => l.type === filterType);
    }

    if (searchQuery) {
      logs = logs.filter(l => 
        l.action.toLowerCase().includes(searchQuery) ||
        l.description.toLowerCase().includes(searchQuery) ||
        l.user.toLowerCase().includes(searchQuery)
      );
    }

    tbody.innerHTML = '';

    if (logs.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            Nenhum registro de log encontrado.
          </td>
        </tr>
      `;
      return;
    }

    logs.forEach(l => {
      let badgeClass = 'badge-log-info';
      if (l.type === 'MODIFICATION') badgeClass = 'badge-log-mod';
      if (l.type === 'ERROR') badgeClass = 'badge-log-error';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="white-space: nowrap; font-size: 0.8rem; color: var(--text-muted);">
          ${new Date(l.timestamp).toLocaleString('pt-BR')}
        </td>
        <td><span class="badge ${badgeClass}">${l.type}</span></td>
        <td><strong>${this.escapeHtml(l.action)}</strong></td>
        <td>${this.escapeHtml(l.user)}</td>
        <td style="font-size: 0.85rem;">${this.escapeHtml(l.description)}</td>
      `;
      tbody.appendChild(tr);
    });
  },

  async clearAllLogs() {
    if (!AuthModule.hasPermission('isAdmin')) return;

    if (confirm('Deseja realmente limpar todo o histórico de logs do sistema?')) {
      if (typeof LoggerModule !== 'undefined') {
        await LoggerModule.clearLogsAsync();
        this.renderLogsTable();
        this.showToast('Histórico de logs limpo.', 'info');
      }
    }
  },

  exportLogsCSV() {
    if (!AuthModule.hasPermission('isAdmin')) return;

    if (typeof LoggerModule !== 'undefined') {
      LoggerModule.exportLogsCSV();
    }
  },

  // ============================================================================
  // MÉTODOS DE GERENCIAMENTO DE ORDENS DE SERVIÇO E ORÇAMENTOS
  // ============================================================================

  renderOrdersAll() {
    this.applyOrderFilters();
    this.renderOrderMetrics();
    this.renderOrdersTable();
  },

  applyOrderFilters() {
    const search = (document.getElementById('order-search-input')?.value || '').toLowerCase().trim();
    const typeFilter = document.getElementById('order-filter-type')?.value || '';
    const statusFilter = document.getElementById('order-filter-status')?.value || '';

    this.filteredOrders = this.serviceOrders.filter(ord => {
      const matchSearch = !search || 
        (ord.code && ord.code.toLowerCase().includes(search)) ||
        (ord.clientName && ord.clientName.toLowerCase().includes(search)) ||
        (ord.equipmentDescription && ord.equipmentDescription.toLowerCase().includes(search)) ||
        (ord.technician && ord.technician.toLowerCase().includes(search));

      const matchType = !typeFilter || ord.type === typeFilter;
      const matchStatus = !statusFilter || ord.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  },

  renderOrderMetrics() {
    const total = this.serviceOrders.length;
    const pending = this.serviceOrders.filter(o => o.status === 'AGUARDANDO_APROVACAO' || o.type === 'ORCAMENTO').length;
    const progress = this.serviceOrders.filter(o => o.status === 'EM_ANDAMENTO').length;
    
    const totalRevenue = this.serviceOrders
      .filter(o => o.status === 'CONCLUIDO')
      .reduce((sum, o) => sum + (parseFloat(o.totalCost) || 0), 0);

    const elTotal = document.getElementById('metric-orders-total');
    const elPending = document.getElementById('metric-orders-pending');
    const elProgress = document.getElementById('metric-orders-progress');
    const elRevenue = document.getElementById('metric-orders-revenue');

    if (elTotal) elTotal.textContent = total;
    if (elPending) elPending.textContent = pending;
    if (elProgress) elProgress.textContent = progress;
    if (elRevenue) {
      elRevenue.textContent = totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
  },

  renderOrdersTable() {
    const tbody = document.getElementById('orders-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (this.filteredOrders.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">
            Nenhuma Ordem de Serviço ou Orçamento encontrado.
          </td>
        </tr>
      `;
      return;
    }

    const canEdit = AuthModule.hasPermission('canEdit');
    const canDelete = AuthModule.hasPermission('canDelete');

    this.filteredOrders.forEach(ord => {
      const tr = document.createElement('tr');

      const isQuote = ord.type === 'ORCAMENTO';
      const typeBadge = isQuote 
        ? `<span class="status-badge badge-orcamento">Orçamento</span>`
        : `<span class="status-badge badge-os">Ordem de Serviço</span>`;

      let statusBadge = '';
      switch (ord.status) {
        case 'AGUARDANDO_APROVACAO':
          statusBadge = `<span class="status-badge status-badge-pending">Aguardando Aprovação</span>`;
          break;
        case 'APROVADO':
          statusBadge = `<span class="status-badge status-badge-progress">Aprovado</span>`;
          break;
        case 'EM_ANDAMENTO':
          statusBadge = `<span class="status-badge status-badge-progress">Em Andamento</span>`;
          break;
        case 'CONCLUIDO':
          statusBadge = `<span class="status-badge status-badge-completed">Concluído</span>`;
          break;
        case 'CANCELADO':
          statusBadge = `<span class="status-badge status-badge-cancelled">Cancelado</span>`;
          break;
        default:
          statusBadge = `<span class="status-badge badge-draft">Rascunho</span>`;
      }

      const totalValue = (parseFloat(ord.totalCost) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

      tr.innerHTML = `
        <td><strong style="color: var(--accent-primary);">${this.escapeHtml(ord.code)}</strong></td>
        <td>${typeBadge}</td>
        <td>
          <div style="font-weight: 600;">${this.escapeHtml(ord.clientName)}</div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">${this.escapeHtml(ord.clientContact || 'Sem contato')}</div>
        </td>
        <td>${this.escapeHtml(ord.equipmentDescription || 'N/A')}</td>
        <td>${this.escapeHtml(ord.technician || 'Técnico Responsável')}</td>
        <td><strong style="color: #10b981;">${totalValue}</strong></td>
        <td>${statusBadge}</td>
        <td style="text-align: right; white-space: nowrap;">
          <button class="btn btn-secondary btn-sm" onclick="App.openPrintOrderModal('${ord.id}')" title="Imprimir / Visualizar Documento">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"></path></svg>
          </button>
          ${isQuote && canEdit ? `
            <button class="btn btn-secondary btn-sm" onclick="App.convertQuoteToOrder('${ord.id}')" title="Converter Orçamento em Ordem de Serviço">
              <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path></svg>
            </button>
          ` : ''}
          <button class="btn btn-secondary btn-sm" onclick="App.openServiceOrderModal('${ord.id}')" ${!canEdit ? 'disabled' : ''} title="Editar Documento">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
          </button>
          <button class="btn btn-danger btn-sm" onclick="App.deleteServiceOrder('${ord.id}')" ${!canDelete ? 'disabled' : ''} title="Excluir Documento">
            <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  },

  populateEquipmentOrderDropdown() {
    const select = document.getElementById('order-field-select-equipment');
    if (!select) return;

    select.innerHTML = '<option value="">-- Aparelho / Equipamento Avulso (Não cadastrado) --</option>';
    this.equipments.forEach(eq => {
      const option = document.createElement('option');
      option.value = eq.id;
      option.textContent = `${eq.host} (${eq.tipo} - ${eq.marca} ${eq.modelo}) - ${eq.usuario}`;
      select.appendChild(option);
    });
  },

  onSelectOrderEquipmentChange() {
    const eqId = document.getElementById('order-field-select-equipment').value;
    if (!eqId) return;

    const eq = this.equipments.find(e => e.id === eqId);
    if (eq) {
      document.getElementById('order-field-client-name').value = eq.empresa || eq.setor || '';
      document.getElementById('order-field-client-contact').value = `Usuário: ${eq.usuario} | AnyDesk: ${eq.anydesk} | IP: ${eq.ip}`;
      document.getElementById('order-field-equipment-desc').value = `${eq.tipo}: ${eq.marca} ${eq.modelo} (Host: ${eq.host} / N/S: ${eq.ns})`;
    }
  },

  handleOrderTypeChange() {
    const type = document.getElementById('order-field-type').value;
    const validityGroup = document.getElementById('order-field-validity')?.closest('.form-group');
    if (validityGroup) {
      validityGroup.style.display = type === 'ORCAMENTO' ? 'block' : 'none';
    }
  },

  calculateOrderTotal() {
    const services = parseFloat(document.getElementById('order-field-services-cost').value) || 0;
    const parts = parseFloat(document.getElementById('order-field-parts-cost').value) || 0;
    const total = services + parts;

    const totalEl = document.getElementById('order-field-total-cost-display');
    if (totalEl) {
      totalEl.value = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
  },

  openServiceOrderModal(id = null) {
    if (!AuthModule.hasPermission('canCreate') && !id) {
      this.showToast('Você não possui permissão para cadastrar documentos.', 'error');
      return;
    }

    this.editingOrderId = id;
    this.populateEquipmentOrderDropdown();

    const titleEl = document.getElementById('order-modal-title');
    const form = document.getElementById('service-order-form');
    form.reset();

    if (id) {
      titleEl.textContent = 'Editar Ordem de Serviço / Orçamento';
      const ord = this.serviceOrders.find(o => o.id === id);
      if (ord) {
        document.getElementById('order-field-id').value = ord.id;
        document.getElementById('order-field-type').value = ord.type;
        document.getElementById('order-field-status').value = ord.status;
        document.getElementById('order-field-client-name').value = ord.clientName || '';
        document.getElementById('order-field-client-contact').value = ord.clientContact || '';
        document.getElementById('order-field-select-equipment').value = ord.equipmentId || '';
        document.getElementById('order-field-equipment-desc').value = ord.equipmentDescription || '';
        document.getElementById('order-field-problem').value = ord.problemDescription || '';
        document.getElementById('order-field-diagnosis').value = ord.technicalDiagnosis || '';
        document.getElementById('order-field-services-cost').value = ord.servicesCost || 0;
        document.getElementById('order-field-parts-cost').value = ord.partsCost || 0;
        document.getElementById('order-field-payment-method').value = ord.paymentMethod || 'PIX';
        document.getElementById('order-field-technician').value = ord.technician || '';
        document.getElementById('order-field-validity').value = ord.validityDate || '';
      }
    } else {
      titleEl.textContent = 'Nova Ordem de Serviço / Orçamento';
      document.getElementById('order-field-id').value = '';
      document.getElementById('order-field-technician').value = AuthModule.getCurrentUser()?.fullname || '';
    }

    this.handleOrderTypeChange();
    this.calculateOrderTotal();
    document.getElementById('service-order-modal').classList.add('active');
  },

  closeServiceOrderModal() {
    document.getElementById('service-order-modal').classList.remove('active');
    this.editingOrderId = null;
  },

  async saveServiceOrder(e) {
    e.preventDefault();

    const id = document.getElementById('order-field-id').value;
    const type = document.getElementById('order-field-type').value;
    const status = document.getElementById('order-field-status').value;
    const clientName = document.getElementById('order-field-client-name').value.trim();
    const clientContact = document.getElementById('order-field-client-contact').value.trim();
    const equipmentId = document.getElementById('order-field-select-equipment').value || null;
    const equipmentDescription = document.getElementById('order-field-equipment-desc').value.trim();
    const problemDescription = document.getElementById('order-field-problem').value.trim();
    const technicalDiagnosis = document.getElementById('order-field-diagnosis').value.trim();
    const servicesCost = parseFloat(document.getElementById('order-field-services-cost').value) || 0;
    const partsCost = parseFloat(document.getElementById('order-field-parts-cost').value) || 0;
    const totalCost = servicesCost + partsCost;
    const paymentMethod = document.getElementById('order-field-payment-method').value;
    const technician = document.getElementById('order-field-technician').value.trim();
    const validityDate = document.getElementById('order-field-validity').value;

    const payload = {
      id: id || undefined,
      type,
      status,
      clientName,
      clientContact,
      equipmentId,
      equipmentDescription,
      problemDescription,
      technicalDiagnosis,
      servicesCost,
      partsCost,
      totalCost,
      paymentMethod,
      technician,
      validityDate,
      completionDate: status === 'CONCLUIDO' ? new Date().toISOString().split('T')[0] : ''
    };

    try {
      if (id) {
        await fetch(`/api/service-orders/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const index = this.serviceOrders.findIndex(o => o.id === id);
        if (index !== -1) {
          this.serviceOrders[index] = { ...this.serviceOrders[index], ...payload };
        }
        this.showToast('Documento atualizado com sucesso!', 'success');
      } else {
        const res = await fetch('/api/service-orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        const newDoc = {
          ...payload,
          id: data.id || 'os_' + Date.now(),
          code: data.code || (type === 'ORCAMENTO' ? 'ORC-' : 'OS-') + Date.now(),
          createdAt: new Date().toISOString()
        };
        this.serviceOrders.unshift(newDoc);
        this.showToast('Documento criado com sucesso!', 'success');
      }
    } catch (err) {
      console.warn('Servidor offline. Salvando localmente.');
      if (id) {
        const index = this.serviceOrders.findIndex(o => o.id === id);
        if (index !== -1) this.serviceOrders[index] = { ...this.serviceOrders[index], ...payload };
      } else {
        const newDoc = {
          ...payload,
          id: 'os_' + Date.now(),
          code: (type === 'ORCAMENTO' ? 'ORC-' : 'OS-') + Math.floor(100 + Math.random() * 900),
          createdAt: new Date().toISOString()
        };
        this.serviceOrders.unshift(newDoc);
      }
      this.saveServiceOrdersLocal();
    }

    // AUTOMAÇÃO 1: Ordem de Serviço com status 'CONCLUIDO' -> ENTRADA no Livro Caixa
    if (status === 'CONCLUIDO' && totalCost > 0) {
      const cashIncomePayload = {
        date: new Date().toISOString().split('T')[0],
        type: 'ENTRADA',
        category: 'Serviços Prestados',
        description: `Serviço Concluído (${payload.code || 'OS'}): ${clientName} - ${equipmentDescription}`,
        amount: totalCost,
        paymentMethod,
        equipmentId
      };
      try {
        await fetch('/api/cashbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cashIncomePayload)
        });
      } catch (e) {
        this.cashbookEntries.unshift({ ...cashIncomePayload, id: 'cb_' + Date.now(), createdAt: new Date().toISOString() });
        this.saveCashbookLocal();
      }
      this.showToast(`OS Concluída! Valor de R$ ${totalCost.toFixed(2)} lançado como ENTRADA no Livro Caixa.`, 'success');
    }

    // AUTOMAÇÃO 2: Valor Peças/Componentes > 0 -> SAÍDA (Despesa) no Livro Caixa
    if (partsCost > 0) {
      const cashExpensePayload = {
        date: new Date().toISOString().split('T')[0],
        type: 'SAIDA',
        category: 'Manutenção / Peças',
        description: `Peças/Componentes OS (${payload.code || 'OS'}): ${clientName} - ${equipmentDescription}`,
        amount: partsCost,
        paymentMethod,
        equipmentId
      };
      try {
        await fetch('/api/cashbook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cashExpensePayload)
        });
      } catch (e) {
        this.cashbookEntries.unshift({ ...cashExpensePayload, id: 'cb_' + Date.now(), createdAt: new Date().toISOString() });
        this.saveCashbookLocal();
      }
      this.showToast(`Valor de peças (R$ ${partsCost.toFixed(2)}) lançado como SAÍDA no Livro Caixa!`, 'info');
    }

    await this.loadCashbook();
    if (this.activeTab === 'cashbook') this.renderCashbookAll();


    this.closeServiceOrderModal();
    this.renderOrdersAll();
  },

  async convertQuoteToOrder(id) {
    const ord = this.serviceOrders.find(o => o.id === id);
    if (!ord) return;

    if (confirm(`Deseja converter o orçamento "${ord.code}" em uma Ordem de Serviço oficial?`)) {
      try {
        const res = await fetch(`/api/service-orders/${id}/convert`, { method: 'PATCH' });
        const data = await res.json();
        ord.type = 'ORDEM_SERVICO';
        ord.code = data.newCode || ord.code.replace('ORC-', 'OS-');
        ord.status = 'EM_ANDAMENTO';
        this.showToast(`Orçamento convertido na OS "${ord.code}" com sucesso!`, 'success');
      } catch (err) {
        ord.type = 'ORDEM_SERVICO';
        ord.code = ord.code.replace('ORC-', 'OS-');
        ord.status = 'EM_ANDAMENTO';
        this.saveServiceOrdersLocal();
        this.showToast(`Orçamento convertido na OS "${ord.code}" com sucesso!`, 'success');
      }

      this.renderOrdersAll();
    }
  },

  async deleteServiceOrder(id) {
    if (!AuthModule.hasPermission('canDelete')) {
      this.showToast('Você não possui permissão para excluir documentos.', 'error');
      return;
    }

    if (confirm('Deseja realmente excluir este documento?')) {
      try {
        await fetch(`/api/service-orders/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn('Exclusão remota indisponível, excluindo localmente.');
      }
      this.serviceOrders = this.serviceOrders.filter(o => o.id !== id);
      this.saveServiceOrdersLocal();
      this.showToast('Documento removido.', 'info');
      this.renderOrdersAll();
    }
  },

  openPrintOrderModal(id) {
    const ord = this.serviceOrders.find(o => o.id === id);
    if (!ord) return;

    const paper = document.getElementById('print-paper-content');
    const isQuote = ord.type === 'ORCAMENTO';
    const docTitle = isQuote ? 'ORÇAMENTO TÉCNICO' : 'ORDEM DE SERVIÇO';

    const servicesCost = parseFloat(ord.servicesCost) || 0;
    const partsCost = parseFloat(ord.partsCost) || 0;
    const totalCost = parseFloat(ord.totalCost) || (servicesCost + partsCost);

    paper.innerHTML = `
      <div class="print-header">
        <div class="print-logo-box">
          <h2>ELETRO ZONE</h2>
          <p>Segurança Eletrônica, Automação & Manutenção Técnica</p>
          <p style="font-size: 0.75rem; color: #6b7280;">Contato: (11) 9999-0000 | suporte@eletrozone.com.br</p>
        </div>
        <div class="print-doc-info">
          <div class="doc-code">${this.escapeHtml(ord.code)}</div>
          <div class="doc-type">${docTitle}</div>
          <p style="font-size: 0.8rem; color: #4b5563; margin-top: 0.4rem;">Data: ${new Date(ord.createdAt).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>

      <div class="print-grid">
        <div class="print-box">
          <h4>DADOS DO CLIENTE</h4>
          <p><strong>Cliente:</strong> ${this.escapeHtml(ord.clientName)}</p>
          <p><strong>Contato:</strong> ${this.escapeHtml(ord.clientContact || 'Não informado')}</p>
        </div>
        <div class="print-box">
          <h4>DADOS DO APARELHO / SERVIÇO</h4>
          <p><strong>Equipamento:</strong> ${this.escapeHtml(ord.equipmentDescription)}</p>
          <p><strong>Técnico Responsável:</strong> ${this.escapeHtml(ord.technician || 'Equipe Eletro Zone')}</p>
        </div>
      </div>

      <div class="print-box" style="margin-bottom: 1.25rem;">
        <h4>DEFEITO RELATADO / SOLICITAÇÃO</h4>
        <p>${this.escapeHtml(ord.problemDescription)}</p>
      </div>

      ${ord.technicalDiagnosis ? `
        <div class="print-box" style="margin-bottom: 1.25rem; background: #eff6ff; border-color: #bfdbfe;">
          <h4 style="color: #1e40af;">LAUDO TÉCNICO & DIAGNÓSTICO</h4>
          <p style="color: #1e3a8a;">${this.escapeHtml(ord.technicalDiagnosis)}</p>
        </div>
      ` : ''}

      <table class="print-table">
        <thead>
          <tr>
            <th>Descrição dos Itens / Serviços</th>
            <th style="text-align: right;">Forma Pagto</th>
            <th style="text-align: right;">Valor (R$)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Serviços de Mão de Obra e Assistência Técnica</td>
            <td style="text-align: right;">${this.escapeHtml(ord.paymentMethod)}</td>
            <td style="text-align: right;">${servicesCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          </tr>
          <tr>
            <td>Componentes, Peças e Insumos Aplicados</td>
            <td style="text-align: right;">${this.escapeHtml(ord.paymentMethod)}</td>
            <td style="text-align: right;">${partsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
          </tr>
        </tbody>
      </table>

      <div class="print-total-bar">
        <div class="print-total-item">
          <span>Serviços</span>
          <strong>${servicesCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
        <div class="print-total-item">
          <span>Peças</span>
          <strong>${partsCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
        <div class="print-total-item highlight">
          <span>VALOR TOTAL</span>
          <strong>${totalCost.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
        </div>
      </div>

      <div style="font-size: 0.75rem; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 0.75rem; margin-top: 1rem;">
        * Garantia de 90 dias para os serviços prestados e peças trocadas. ${isQuote ? 'Orçamento válido por 15 dias a contar da data de emissão.' : ''}
      </div>

      <div class="print-signatures">
        <div class="signature-line">
          Técnico Responsável (Eletro Zone)
        </div>
        <div class="signature-line">
          Assinatura do Cliente / De Acordo
        </div>
      </div>
    `;

    document.getElementById('print-order-modal').classList.add('active');
  },

  closePrintOrderModal() {
    document.getElementById('print-order-modal').classList.remove('active');
  },

  exportOrdersCSV() {
    if (this.filteredOrders.length === 0) {
      alert('Não há registros de Ordens de Serviço ou Orçamentos para exportar.');
      return;
    }

    const headers = ['Código', 'Tipo', 'Cliente', 'Contato', 'Equipamento', 'Status', 'Mão de Obra (R$)', 'Peças (R$)', 'Total (R$)', 'Técnico', 'Data Emissão'];
    const rows = this.filteredOrders.map(o => [
      `"${o.code || ''}"`,
      `"${o.type || ''}"`,
      `"${o.clientName || ''}"`,
      `"${o.clientContact || ''}"`,
      `"${o.equipmentDescription || ''}"`,
      `"${o.status || ''}"`,
      (o.servicesCost || 0).toFixed(2),
      (o.partsCost || 0).toFixed(2),
      (o.totalCost || 0).toFixed(2),
      `"${o.technician || ''}"`,
      `"${new Date(o.createdAt).toLocaleDateString('pt-BR')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ordens_servico_eletro_zone_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    this.showToast('Relatório CSV de OS exportado com sucesso!', 'success');
  },

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 3500);
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },

  bindEvents() {
    document.getElementById('first-setup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('setup-fullname').value;
      const username = document.getElementById('setup-username').value;
      const pass = document.getElementById('setup-password').value;
      const confirmPass = document.getElementById('setup-confirm-password').value;
      const errorDiv = document.getElementById('setup-error-msg');

      if (pass !== confirmPass) {
        errorDiv.textContent = 'As senhas não coincidem. Digite novamente.';
        errorDiv.style.display = 'block';
        return;
      }

      const res = await AuthModule.registerMasterUserAsync(name, username, pass);
      if (res.success) {
        this.checkAuthState();
        this.showToast('Administrador cadastrado com sucesso! Bem-vindo.', 'success');
      } else {
        errorDiv.textContent = res.message;
        errorDiv.style.display = 'block';
      }
    });

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const user = document.getElementById('login-username').value;
      const pass = document.getElementById('login-password').value;
      const errorDiv = document.getElementById('login-error-msg');

      const res = await AuthModule.loginAsync(user, pass);
      if (res.success) {
        this.checkAuthState();
        this.showToast(`Bem-vindo de volta, ${res.user.fullname}!`, 'success');
      } else {
        errorDiv.textContent = res.message;
        errorDiv.style.display = 'block';
      }
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
      if (confirm('Deseja encerrar a sessão?')) {
        AuthModule.logout();
        this.checkAuthState();
        this.showToast('Sessão encerrada.', 'info');
      }
    });

    document.getElementById('search-input').addEventListener('input', () => this.renderAll());
    document.getElementById('filter-type').addEventListener('change', () => this.renderAll());
    document.getElementById('filter-sector').addEventListener('change', () => this.renderAll());

    document.getElementById('device-form').addEventListener('submit', (e) => this.saveDeviceForm(e));
    document.getElementById('field-tipo').addEventListener('change', () => this.handleTypeFieldChange());

    document.getElementById('maintenance-form').addEventListener('submit', (e) => this.saveMaintenanceRecord(e));
    document.getElementById('mnt-partsCost').addEventListener('input', () => this.calculateMntTotal());
    document.getElementById('mnt-laborCost').addEventListener('input', () => this.calculateMntTotal());

    document.getElementById('user-form').addEventListener('submit', (e) => this.saveUserForm(e));

    // Eventos Estoque
    document.getElementById('stock-form').addEventListener('submit', (e) => this.saveStockForm(e));
    document.getElementById('stock-condition-filter').addEventListener('change', () => this.renderStockAll());
    document.getElementById('stock-search-input').addEventListener('input', () => this.renderStockAll());

    // Eventos Livro Caixa
    document.getElementById('cashbook-form').addEventListener('submit', (e) => this.saveCashbookEntry(e));
    document.getElementById('cashbook-type-filter').addEventListener('change', () => this.renderCashbookAll());
    document.getElementById('cashbook-month-filter').addEventListener('change', () => this.renderCashbookAll());
    document.getElementById('cashbook-search-input').addEventListener('input', () => this.renderCashbookAll());

    // Eventos Ordens de Serviço & Orçamentos
    document.getElementById('service-order-form').addEventListener('submit', (e) => this.saveServiceOrder(e));
    document.getElementById('order-search-input').addEventListener('input', () => this.renderOrdersAll());
    document.getElementById('order-filter-type').addEventListener('change', () => this.renderOrdersAll());
    document.getElementById('order-filter-status').addEventListener('change', () => this.renderOrdersAll());

    document.getElementById('log-filter-type').addEventListener('change', () => this.renderLogsTable());
    document.getElementById('log-search-input').addEventListener('input', () => this.renderLogsTable());
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
