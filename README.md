# ⚡ Eletro Zone • Sistema de Gestão Integrada v2.0

> **Plataforma completa de Gestão de Ativos (TI & Motores), Controle de Estoque, Livro Caixa, Ordens de Serviço/Orçamentos e Contratos Mensais Recorrentes.**

![Versão](https://img.shields.io/badge/vers%C3%A3o-2.0.0-red.svg)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)
![Express](https://img.shields.io/badge/Express-v4.19-blue.svg)
![SQLite](https://img.shields.io/badge/SQLite3-Turso-skyblue.svg)
![Licença](https://img.shields.io/badge/licen%C3%A7a-ISC-brightgreen.svg)

---

## 📋 Sobre o Projeto

O **Eletro Zone Gestão Integrada** foi desenvolvido para centralizar toda a operação e controle financeiro de segurança eletrônica, manutenção e ativos de TI/motores. O sistema possui suporte duplo a banco de dados **SQLite local** (`database.sqlite`) e sincronização nuvem via **Turso Cloud Database**, contando também com suporte a fallback de armazenamento local (`localStorage`) para resiliência operacional.

---

## 🔥 Módulos e Funcionalidades

### 🖥️ 1. Inventário de Ativos (TI & Motores)
- Cadastro completo de equipamentos (Host, IP, AnyDesk, Setor, Usuário, Marca/Modelo, Número de Série, Nota Fiscal e Fornecedor).
- Status operacional (*Ativo*, *Em Manutenção*, *Reserva*, *Inativo*).
- Agendamento e alertas de manutenções preventivas com distintivo e notificações.
- Filtros em tempo real por tipo, setor e busca textual.
- Escolha dinâmica de colunas visíveis e exportação de relatórios em CSV.

### 📦 2. Controle de Estoque & Peças
- Gerenciamento de componentes, peças e ferramentas (*Quantidade*, *Estoque Mínimo*, *Preço Unitário*, *Condição*).
- Alertas de estoque crítico quando a quantidade atinge o limite mínimo.
- Movimentação de **Entrada** e **Saída**.
- **Integração Automática com Caixa**: Ao dar saída para venda de um produto, o valor é automaticamente lançado como **ENTRADA** no Livro Caixa.

### 💰 3. Livro Caixa & Controle Financeiro
- Registro detalhado de **Entradas** e **Saídas** financeiras.
- Resumo com Receita Total, Despesas Totais e Saldo Atual em tempo real.
- Filtros por tipo de movimentação e por mês/ano.
- Detalhamento de responsável, categoria, forma de pagamento e observações.

### 📑 4. Ordens de Serviço (OS) & Orçamentos
- Criação e acompanhamento de **Orçamentos** e **Ordens de Serviço**.
- Status de acompanhamento (*Pendente*, *Em Andamento*, *Concluído*, *Aprovado*, *Cancelado*).
- Lançamento de custos de peças e mão de obra com cálculo automático do valor total.
- **Regra Financeira**: Apenas quando a OS é marcada como **🟢 CONCLUÍDO**, o valor total é lançado automaticamente como **ENTRADA** no Livro Caixa.
- Visualização e impressão formatada da OS/Orçamento.

### 📝 5. Contratos Mensais Recorrentes
- Cadastro de contratos com **Validade Anual (12 Meses)**.
- Data de início e cálculo automático da data de término da validade de 1 ano.
- Dia de vencimento mensal customizável (Dia 01 ao Dia 31).
- Valor mensal fixo e valores extras do mês vigente com descrição detalhada.
- **Validação de Pagamento**: Botão exclusivo para o Administrador validar o pagamento (**🟢 Validar Pago**), lançando automaticamente o valor total como **ENTRADA** no Livro Caixa.
- Filtros por status (*Pendente*, *Pago*, *Em Atraso*) e exportação em CSV.

### 🔒 6. Autenticação & Permissões (RBAC)
- Sistema de login e níveis de acesso (*ADMINISTRADOR* vs *OPERADOR*).
- Controle granular de permissões por perfil (`canCreate`, `canEdit`, `canDelete`, `isAdmin`).
- Botão seguro com confirmação de senha do administrador para zerar dados quando necessário.

### 📜 7. Logs de Auditoria do Sistema
- Registro de ações importantes realizadas na plataforma (cadastros, edições, exclusões e baixas de pagamentos).
- Filtros por tipo de evento e busca rápida.

---

## 🛠️ Tecnologias Utilizadas

- **Backend**: Node.js, Express, CORS
- **Banco de Dados**: SQLite3 (Local) / `@libsql/client` (Turso Cloud Database)
- **Frontend**: HTML5, Vanilla JavaScript (ES6+), Vanilla CSS (Tema Escuro Vermelho/Preto Eletro Zone + Glassmorphism)
- **Layout**: Responsivo Mobile-First com menu de abas deslizante (Swipe)

---

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (ou configure na plataforma de hospedagem como Vercel/Render):

```env
PORT=8080
TURSO_DATABASE_URL=libsql://seu-banco.turso.io
TURSO_AUTH_TOKEN=seu-token-turso-aqui
```

*Nota: Se `TURSO_DATABASE_URL` não for informado, o sistema utilizará o arquivo SQLite local `database.sqlite` automaticamente.*

---

## 🚀 Como Executar o Projeto

### Pró-requisitos
- Node.js versão 18 ou superior instalado.

### 1. Clonar o repositório
```bash
git clone https://github.com/willfbarbosa/cadastro_maquinas.git
cd cadastro_maquinas
```

### 2. Instalar as dependências
```bash
npm install
```

### 3. Iniciar o servidor
```bash
npm start
```
Ou em modo de desenvolvimento:
```bash
npm run dev
```

O servidor estará acessível em: `http://localhost:8080`

---

## 📡 Endpoints da API REST

### 🛠️ Ativos / Equipamentos
- `GET /api/equipments` - Lista todos os equipamentos
- `POST /api/equipments` - Cadastra novo equipamento
- `PUT /api/equipments/:id` - Atualiza equipamento existente
- `DELETE /api/equipments/:id` - Remove equipamento (Admin)

### 📦 Estoque
- `GET /api/stock` - Lista produtos do estoque
- `POST /api/stock` - Cadastra produto
- `PUT /api/stock/:id` - Atualiza produto
- `POST /api/stock/move` - Registra entrada/saída no estoque
- `DELETE /api/stock/:id` - Remove produto (Admin)

### 💰 Livro Caixa
- `GET /api/cashbook` - Lista entradas e saídas
- `POST /api/cashbook` - Registra movimentação financeira
- `DELETE /api/cashbook/:id` - Exclui lançamento (Admin)

### 📑 Ordens de Serviço & Orçamentos
- `GET /api/service-orders` - Lista ordens de serviço
- `POST /api/service-orders` - Cria OS/Orçamento
- `PUT /api/service-orders/:id` - Atualiza OS/Orçamento
- `DELETE /api/service-orders/:id` - Exclui OS/Orçamento (Admin)

### 📝 Contratos Mensais
- `GET /api/contracts` - Lista contratos
- `POST /api/contracts` - Cria contrato mensal
- `PUT /api/contracts/:id` - Atualiza contrato
- `PATCH /api/contracts/:id/pay` - Valida pagamento e gera lançamento no Livro Caixa (Admin)
- `DELETE /api/contracts/:id` - Exclui contrato (Admin)

### 🔑 Autenticação & Usuários
- `POST /api/auth/login` - Autenticação de usuário
- `GET /api/auth/users` - Lista usuários do sistema
- `POST /api/auth/users` - Cadastra/atualiza usuário
- `DELETE /api/auth/users/:id` - Remove usuário (Admin)

---

## 📂 Estrutura de Arquivos

```
cadastro_maquinas/
├── css/
│   └── styles.css         # Estilos da aplicação (Tema Dark + Responsivo Mobile)
├── js/
│   ├── app.js             # Lógica principal do Frontend e controle de abas
│   ├── auth.js            # Módulo de Autenticação e RBAC
│   └── logger.js          # Módulo de logs e auditoria
├── img/                   # Logotipos e favicons da marca
├── db.js                  # Inicialização e schema do banco SQLite / Turso Cloud
├── server.js              # Servidor Express Backend REST API
├── index.html             # Interface do Usuário (Single Page Application)
├── database.sqlite        # Banco de dados SQLite local
└── package.json           # Dependências e scripts do Node.js
```

---

## 📄 Licença

Este projeto está sob a licença ISC. Desenvolvido para **Eletro Zone Segurança Eletrônica**.