/**
 * DADOS DE DEMONSTRAÇÃO PRÉ-CARREGADOS (ELETRO ZONE)
 * Inclui equipamentos, manutenções, livro caixa e itens do controle de estoque.
 */

const MOCK_EQUIPMENTS = [
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
    createdAt: new Date().toISOString(),
    maintenances: [
      {
        id: 'mnt_1',
        date: '2026-08-15',
        description: 'Troca da fonte de alimentação 500W 80 Plus e limpeza interna preventiva',
        partsCost: 250.00,
        laborCost: 100.00,
        cost: 350.00,
        paymentMethod: 'PIX',
        technician: 'Suporte Técnico Eletro Zone'
      }
    ]
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
    createdAt: new Date().toISOString(),
    maintenances: []
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
    createdAt: new Date().toISOString(),
    maintenances: [
      {
        id: 'mnt_2',
        date: '2026-07-10',
        description: 'Limpeza dos cabeçotes de impressão e substituição da almofada de feltro',
        partsCost: 80.00,
        laborCost: 100.00,
        cost: 180.00,
        paymentMethod: 'DINHEIRO',
        technician: 'Oficina Autorizada Epson'
      }
    ]
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
    createdAt: new Date().toISOString(),
    maintenances: [
      {
        id: 'mnt_3',
        date: '2026-08-20',
        description: 'Rebobinamento de estator e substituição dos rolamentos dianteiro/traseiro SKF',
        partsCost: 450.00,
        laborCost: 400.00,
        cost: 850.00,
        paymentMethod: 'BOLETO',
        technician: 'Eletrotécnica Central'
      }
    ]
  }
];

const MOCK_CASHBOOK = [
  {
    id: 'cb_101',
    date: '2026-09-01',
    type: 'ENTRADA',
    category: 'Serviços Prestados',
    description: 'Instalação de Sistema de Câmeras CFTV - Cliente Condomínio Solar',
    amount: 3500.00,
    paymentMethod: 'PIX',
    equipmentId: null,
    createdAt: new Date().toISOString()
  },
  {
    id: 'cb_102',
    date: '2026-09-02',
    type: 'SAIDA',
    category: 'Manutenção / Peças',
    description: 'Manutenção Motor MTR-BOMBA-01: Rolamentos e Rebobinamento',
    amount: 850.00,
    paymentMethod: 'BOLETO',
    equipmentId: 'eq_1004',
    createdAt: new Date().toISOString()
  },
  {
    id: 'cb_103',
    date: '2026-09-02',
    type: 'ENTRADA',
    category: 'Venda de Equipamento',
    description: 'Venda de Nobreak 1200VA Eletro Zone',
    amount: 780.00,
    paymentMethod: 'CARTAO_CREDITO',
    equipmentId: null,
    createdAt: new Date().toISOString()
  },
  {
    id: 'cb_104',
    date: '2026-09-03',
    type: 'SAIDA',
    category: 'Compra de Peças',
    description: 'Aquisição de 5x SSD NVMe 512GB Kingston para estoque',
    amount: 1150.00,
    paymentMethod: 'PIX',
    equipmentId: null,
    createdAt: new Date().toISOString()
  }
];

const MOCK_STOCK = [
  {
    id: 'stk_1',
    name: 'SSD NVMe 512GB Kingston M.2',
    category: 'Hardware',
    condition: 'NOVO',
    quantity: 12,
    minQuantity: 3,
    unitPrice: 230.00,
    location: 'Prateleira A-01',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_2',
    name: 'Fonte de Alimentação ATX 500W 80 Plus Redragon',
    category: 'Fontes / Energia',
    condition: 'NOVO',
    quantity: 8,
    minQuantity: 2,
    unitPrice: 220.00,
    location: 'Prateleira A-02',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_3',
    name: 'Rolamento Blindado SKF 6205-2RSH (para Motores)',
    category: 'Motores / Elétrica',
    condition: 'NOVO',
    quantity: 15,
    minQuantity: 5,
    unitPrice: 45.00,
    location: 'Prateleira B-04',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_4',
    name: 'Placa Mãe LGA 1200 Asus Prime H510M-E',
    category: 'Hardware',
    condition: 'SEMINOVO',
    quantity: 3,
    minQuantity: 1,
    unitPrice: 380.00,
    location: 'Prateleira A-03',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_5',
    name: 'Toner Monocromático Brother TN-660',
    category: 'Impressão',
    condition: 'NOVO',
    quantity: 1, // Estoque Baixo!
    minQuantity: 3,
    unitPrice: 85.00,
    location: 'Armário C-01',
    createdAt: new Date().toISOString()
  },
  {
    id: 'stk_6',
    name: 'Motor Elétrico WEG 3CV 220V Revisado',
    category: 'Motores / Elétrica',
    condition: 'USADO',
    quantity: 2,
    minQuantity: 1,
    unitPrice: 550.00,
    location: 'Galpão B',
    createdAt: new Date().toISOString()
  }
];
