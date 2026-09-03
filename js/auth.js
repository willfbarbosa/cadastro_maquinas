/**
 * MÓDULO DE AUTENTICAÇÃO E PERMISSÕES (RBAC) - ELETRO ZONE
 * Suporte a SQLite Backend API com fallback assíncrono para localStorage.
 */

const STORAGE_USERS_KEY = 'app_inventory_users';
const STORAGE_CURRENT_USER_KEY = 'app_inventory_current_user';

const AuthModule = {
  usersCache: null,

  async fetchUsersFromAPI() {
    try {
      const res = await fetch('/api/auth/users');
      const data = await res.json();
      if (data.success) {
        this.usersCache = data.users;
        localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(data.users));
        return data.users;
      }
    } catch (e) {
      console.warn('API SQLite indisponível. Utilizando armazenamento local.');
    }
    const stored = localStorage.getItem(STORAGE_USERS_KEY);
    this.usersCache = stored ? JSON.parse(stored) : [];
    return this.usersCache;
  },

  getUsers() {
    if (this.usersCache) return this.usersCache;
    const stored = localStorage.getItem(STORAGE_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  hasRegisteredUsers() {
    const users = this.getUsers();
    return users && users.length > 0;
  },

  async registerMasterUserAsync(fullname, username, password) {
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullname, username, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(data.user));
        await this.fetchUsersFromAPI();
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      return this.registerMasterUser(fullname, username, password);
    }
  },

  registerMasterUser(fullname, username, password) {
    const masterUser = {
      id: 'usr_' + Date.now(),
      fullname: fullname.trim(),
      username: username.trim().toLowerCase(),
      password: password,
      role: 'ADMIN',
      permissions: { canCreate: true, canEdit: true, canDelete: true, isAdmin: true },
      createdAt: new Date().toISOString()
    };

    const users = [masterUser];
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(masterUser));
    this.usersCache = users;

    return { success: true, user: masterUser };
  },

  async loginAsync(username, password) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      return this.login(username, password);
    }
  },

  login(username, password) {
    const users = this.getUsers();
    const user = users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());

    if (!user) return { success: false, message: 'Usuário não encontrado.' };
    if (user.password !== password) return { success: false, message: 'Senha incorreta.' };

    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(user));
    return { success: true, user };
  },

  logout() {
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
  },

  getCurrentUser() {
    const stored = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  hasPermission(permissionKey) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) return false;
    if (currentUser.role === 'ADMIN' || (currentUser.permissions && currentUser.permissions.isAdmin)) return true;
    return !!(currentUser.permissions && currentUser.permissions[permissionKey]);
  },

  async saveUserAsync(userData, editingUserId = null) {
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, id: editingUserId })
      });
      const data = await res.json();
      if (data.success) {
        await this.fetchUsersFromAPI();
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      return this.saveUser(userData, editingUserId);
    }
  },

  saveUser(userData, editingUserId = null) {
    let users = this.getUsers();
    const cleanUsername = userData.username.trim().toLowerCase();

    if (editingUserId) {
      const existing = users.find(u => u.username.toLowerCase() === cleanUsername && u.id !== editingUserId);
      if (existing) return { success: false, message: 'Nome de usuário já está em uso.' };

      users = users.map(u => {
        if (u.id === editingUserId) {
          return {
            ...u,
            fullname: userData.fullname.trim(),
            username: cleanUsername,
            password: userData.password ? userData.password : u.password,
            permissions: userData.permissions,
            role: userData.permissions.isAdmin ? 'ADMIN' : 'USER'
          };
        }
        return u;
      });
    } else {
      const existing = users.find(u => u.username.toLowerCase() === cleanUsername);
      if (existing) return { success: false, message: 'Nome de usuário já existe.' };

      const newUser = {
        id: 'usr_' + Date.now(),
        fullname: userData.fullname.trim(),
        username: cleanUsername,
        password: userData.password,
        role: userData.permissions.isAdmin ? 'ADMIN' : 'USER',
        permissions: userData.permissions,
        createdAt: new Date().toISOString()
      };
      users.unshift(newUser);
    }

    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    this.usersCache = users;
    return { success: true };
  },

  async deleteUserAsync(userId) {
    try {
      const res = await fetch(`/api/auth/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        await this.fetchUsersFromAPI();
        return { success: true };
      } else {
        return { success: false, message: data.message };
      }
    } catch (e) {
      return this.deleteUser(userId);
    }
  },

  deleteUser(userId) {
    let users = this.getUsers();
    users = users.filter(u => u.id !== userId);
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
    this.usersCache = users;
    return { success: true };
  }
};
