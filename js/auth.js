/**
 * MÓDULO DE AUTENTICAÇÃO, GERENCIAMENTO DE USUÁRIOS E PERMISSÕES (RBAC)
 * Controla os privilégios de acesso: Somente Leitura, Cadastrar, Editar, Excluir e Admin.
 */

const STORAGE_KEYS = {
  USERS: 'app_inventory_users',
  CURRENT_USER: 'app_inventory_current_user'
};

const AuthModule = {
  hasRegisteredUsers() {
    const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
    return users.length > 0;
  },

  getUsers() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
  },

  /**
   * Verifica se o usuário logado possui determinada permissão
   * @param {'canCreate' | 'canEdit' | 'canDelete' | 'isAdmin'} permissionKey 
   */
  hasPermission(permissionKey) {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.role === 'ADMIN' || user.permissions?.isAdmin) return true;
    return !!(user.permissions && user.permissions[permissionKey]);
  },

  /**
   * Cadastra o Administrador Mestre Inicial no Primeiro Acesso
   */
  registerMasterUser(fullname, username, password) {
    if (this.hasRegisteredUsers()) {
      return { success: false, message: 'O usuário mestre já foi cadastrado anteriormente.' };
    }

    const newUser = {
      id: 'usr_master_' + Date.now(),
      fullname: fullname.trim(),
      username: username.trim().toLowerCase(),
      password: password,
      role: 'ADMIN',
      permissions: {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        isAdmin: true
      },
      createdAt: new Date().toISOString()
    };

    const users = [newUser];
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.createSession(newUser);

    if (typeof LoggerModule !== 'undefined') {
      LoggerModule.info('CADASTRO_ADMIN_INICIAL', `Administrador inicial "${newUser.fullname}" (@${newUser.username}) cadastrado.`);
    }

    return { success: true, user: newUser };
  },

  /**
   * Cria ou edita um usuário no sistema (Disponível para Admins)
   */
  saveUser(userData, userId = null) {
    const users = this.getUsers();

    if (userId) {
      // Edição
      const index = users.findIndex(u => u.id === userId);
      if (index === -1) return { success: false, message: 'Usuário não encontrado.' };

      users[index] = {
        ...users[index],
        fullname: userData.fullname.trim(),
        username: userData.username.trim().toLowerCase(),
        password: userData.password ? userData.password : users[index].password,
        role: userData.permissions.isAdmin ? 'ADMIN' : 'USER',
        permissions: userData.permissions,
        updatedAt: new Date().toISOString()
      };

      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      if (typeof LoggerModule !== 'undefined') {
        LoggerModule.modification('EDITAR_USUARIO', `Usuário "${userData.fullname}" (@${userData.username}) atualizado.`);
      }

      return { success: true, user: users[index] };
    } else {
      // Cadastro de Novo Usuário
      const cleanUsername = userData.username.trim().toLowerCase();
      if (users.some(u => u.username === cleanUsername)) {
        return { success: false, message: 'Este nome de usuário já está em uso.' };
      }

      const newUser = {
        id: 'usr_' + Date.now(),
        fullname: userData.fullname.trim(),
        username: cleanUsername,
        password: userData.password,
        role: userData.permissions.isAdmin ? 'ADMIN' : 'USER',
        permissions: userData.permissions,
        createdAt: new Date().toISOString()
      };

      users.push(newUser);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

      if (typeof LoggerModule !== 'undefined') {
        LoggerModule.modification('CADASTRAR_USUARIO', `Novo usuário "${newUser.fullname}" (@${newUser.username}) cadastrado.`);
      }

      return { success: true, user: newUser };
    }
  },

  /**
   * Remove um usuário
   */
  deleteUser(userId) {
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      return { success: false, message: 'Você não pode excluir o seu próprio usuário conectado.' };
    }

    let users = this.getUsers();
    const userToDelete = users.find(u => u.id === userId);
    if (!userToDelete) return { success: false, message: 'Usuário não encontrado.' };

    users = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));

    if (typeof LoggerModule !== 'undefined') {
      LoggerModule.modification('EXCLUIR_USUARIO', `Usuário "${userToDelete.fullname}" (@${userToDelete.username}) foi removido.`);
    }

    return { success: true };
  },

  login(username, password) {
    const users = this.getUsers();
    const cleanUsername = username.trim().toLowerCase();

    const user = users.find(u => u.username === cleanUsername && u.password === password);

    if (user) {
      this.createSession(user);

      if (typeof LoggerModule !== 'undefined') {
        LoggerModule.info('LOGIN_SUCESSO', `Usuário "${user.fullname}" (@${user.username}) efetuou login.`);
      }

      return { success: true, user };
    } else {
      if (typeof LoggerModule !== 'undefined') {
        LoggerModule.error('LOGIN_FALHA', `Tentativa de login frustrada para "@${cleanUsername}".`);
      }
      return { success: false, message: 'Usuário ou senha incorretos.' };
    }
  },

  createSession(user) {
    const sessionData = {
      id: user.id,
      fullname: user.fullname,
      username: user.username,
      role: user.role,
      permissions: user.permissions || { canCreate: true, canEdit: true, canDelete: true, isAdmin: user.role === 'ADMIN' },
      loggedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(sessionData));
  },

  logout() {
    const user = this.getCurrentUser();
    if (user && typeof LoggerModule !== 'undefined') {
      LoggerModule.info('LOGOUT', `Usuário "${user.fullname}" encerrou a sessão.`);
    }
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
  }
};
