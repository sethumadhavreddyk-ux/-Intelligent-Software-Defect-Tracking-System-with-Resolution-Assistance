// ==========================================================================
// BUGFLOW ADMINISTRATION & ROLE ASSIGNMENT CONTROLLER
// Manage Users, Assign Roles, Inspect RBAC Permissions Matrix, and User Creation
// ==========================================================================

class AdministrationController {
  constructor() {
    this.users = [];
    this.rolesMatrix = [];
    this.selectedUserIdForRole = null;
    this.initEventListeners();
  }

  initEventListeners() {
    // Admin Subtabs toggle
    document.querySelectorAll('.admin-subtab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.adminTab;
        this.switchTab(tab);
      });
    });

    // Create User Form Submit
    const createUserForm = document.getElementById('admin-create-user-form');
    if (createUserForm) {
      createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleCreateUser();
      });
    }

    // Role Assignment Form Submit
    const roleForm = document.getElementById('assign-role-form');
    if (roleForm) {
      roleForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRoleAssignmentSubmit();
      });
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.admin-subtab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.adminTab === tabName);
    });

    document.querySelectorAll('.admin-tab-pane').forEach(pane => {
      pane.style.display = 'none';
    });

    const activePane = document.getElementById(`admin-pane-${tabName}`);
    if (activePane) {
      activePane.style.display = 'block';
    }

    if (tabName === 'matrix') {
      this.renderPermissionsMatrix();
    }
  }

  async loadAdminView() {
    await Promise.all([
      this.loadUsers(),
      this.loadPermissionsMatrix()
    ]);
  }

  async loadUsers() {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">
          <div class="spinner" style="margin: 0 auto 8px;"></div>
          Loading platform users...
        </td>
      </tr>
    `;

    try {
      this.users = await api.getUsers();
      this.renderUsersTable();
    } catch (err) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: #f87171;">
            Failed to load users: ${err.message}
          </td>
        </tr>
      `;
    }
  }

  async loadPermissionsMatrix() {
    try {
      this.rolesMatrix = await api.getRolePermissionsMatrix();
      this.renderPermissionsMatrix();
    } catch (err) {
      console.warn('Failed to load permissions matrix:', err);
    }
  }

  canManageRoles() {
    return ['Admin', 'Project Manager'].includes(api.currentUser?.role);
  }

  renderUsersTable() {
    const tableBody = document.getElementById('admin-users-table-body');
    if (!tableBody) return;

    const countBadge = document.getElementById('admin-user-count-badge');
    if (countBadge) countBadge.textContent = `${this.users.length} Users`;
    const canManageRoles = this.canManageRoles();

    if (!this.users || this.users.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 24px; color: var(--text-muted);">
            No users registered.
          </td>
        </tr>
      `;
      return;
    }

    const roleColors = {
      'Admin': { bg: 'rgba(239, 68, 68, 0.2)', text: '#f87171', border: '#ef4444' },
      'Project Manager': { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc', border: '#a855f7' },
      'Developer': { bg: 'rgba(56, 189, 248, 0.2)', text: '#38bdf8', border: '#0284c7' },
      'QA / Tester': { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', border: '#10b981' },
      'Reporter': { bg: 'rgba(245, 158, 11, 0.2)', text: '#fbbf24', border: '#f59e0b' }
    };

    tableBody.innerHTML = this.users.map(u => {
      const col = roleColors[u.role] || roleColors['Developer'];
      const isCurrent = api.currentUser && (api.currentUser.id === u.id || api.currentUser.username === u.username);

      return `
        <tr>
          <td>
            <span style="font-family: var(--font-mono); color: var(--text-muted); font-size: 0.8rem;">#${u.id}</span>
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${u.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'}" alt="${u.full_name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1.5px solid ${col.border};">
              <div>
                <strong style="color: #f8fafc; font-size: 0.9rem;">${u.full_name}</strong>
                ${isCurrent ? '<span class="badge" style="background: rgba(99,102,241,0.2); font-size: 0.68rem; margin-left: 6px;">You</span>' : ''}
              </div>
            </div>
          </td>
          <td>
            <span style="font-family: var(--font-mono); font-size: 0.82rem; color: #94a3b8;">${u.username}</span>
          </td>
          <td style="font-size: 0.82rem; color: #cbd5e1;">${u.email}</td>
          <td>
            <span class="badge" style="background: ${col.bg}; color: ${col.text}; border: 1px solid ${col.border}; font-weight: 700; font-size: 0.78rem; padding: 4px 10px;">
              ${u.role}
            </span>
          </td>
          <td>
            <span class="badge ${u.is_active ? 'badge-verified' : 'badge-closed'}" style="font-size: 0.72rem;">
              ${u.is_active ? 'Active' : 'Inactive'}
            </span>
          </td>
          <td>
            <button class="btn-secondary" style="font-size: 0.76rem; padding: 4px 12px; border-color: ${col.border}; color: ${col.text};" ${canManageRoles ? '' : 'disabled title="Requires Admin or Project Manager role"'} onclick="adminController.openAssignRoleModal(${u.id}, '${u.full_name.replace(/'/g, "\\'")}', '${u.role}')">
              ⚙️ Assign Role
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  renderPermissionsMatrix() {
    const container = document.getElementById('admin-matrix-container');
    if (!container) return;

    if (!this.rolesMatrix || this.rolesMatrix.length === 0) {
      container.innerHTML = '<div style="color: var(--text-muted); padding: 20px;">Loading permissions matrix...</div>';
      return;
    }

    container.innerHTML = `
      <div class="table-responsive">
        <table class="custom-table" style="background: rgba(0,0,0,0.2);">
          <thead>
            <tr>
              <th style="width: 180px;">Role & Badge</th>
              <th style="width: 280px;">Role Scope / Description</th>
              <th>System Permissions & Access Gates</th>
            </tr>
          </thead>
          <tbody>
            ${this.rolesMatrix.map(m => `
              <tr>
                <td>
                  <span class="badge" style="background: ${m.badge_color}22; color: ${m.badge_color}; border: 1px solid ${m.badge_color}; font-weight: 800; font-size: 0.82rem; padding: 6px 12px;">
                    ${m.role}
                  </span>
                </td>
                <td style="font-size: 0.84rem; color: #cbd5e1; line-height: 1.45;">
                  ${m.description}
                </td>
                <td>
                  <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${m.permissions.map(p => `
                      <span class="badge" style="background: rgba(255,255,255,0.06); color: #f8fafc; font-size: 0.74rem; font-weight: 500;">
                        ✓ ${p}
                      </span>
                    `).join('')}
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async openAssignRoleModal(userId = null, fullName = null, currentRole = null) {
    if (!this.canManageRoles()) {
      window.showToast('Only Admins and Project Managers can assign roles', 'warning');
      return;
    }

    const dialog = document.getElementById('assign-role-dialog');
    if (!dialog) return;

    if (!this.users || this.users.length === 0) {
      try {
        this.users = await api.getUsers();
      } catch (e) {
        this.users = [];
      }
    }

    const selectEl = document.getElementById('assign-role-user-select');
    if (selectEl && this.users.length > 0) {
      selectEl.innerHTML = this.users.map(u => `
        <option value="${u.id}" data-name="${u.full_name}" data-role="${u.role}" ${userId === u.id || (!userId && api.currentUser?.id === u.id) ? 'selected' : ''}>
          ${u.full_name} (${u.username}) - [${u.role}]
        </option>
      `).join('');

      selectEl.onchange = () => {
        const opt = selectEl.options[selectEl.selectedIndex];
        if (opt) {
          const uId = parseInt(opt.value);
          const uName = opt.dataset.name;
          const uRole = opt.dataset.role;
          this.selectedUserIdForRole = uId;
          document.getElementById('assign-role-user-id-hidden').value = uId;
          document.getElementById('assign-role-user-name').textContent = uName;
          const currBadge = document.getElementById('assign-role-current');
          if (currBadge) currBadge.textContent = uRole;
          document.getElementById('assign-role-select').value = uRole;
        }
      };
    }

    // Default target selection
    let activeUser = null;
    if (userId) {
      activeUser = this.users.find(u => u.id === userId) || { id: userId, full_name: fullName, role: currentRole };
    } else if (api.currentUser) {
      activeUser = this.users.find(u => u.id === api.currentUser.id) || api.currentUser;
    } else if (this.users.length > 0) {
      activeUser = this.users[0];
    }

    if (activeUser) {
      this.selectedUserIdForRole = activeUser.id;
      const hiddenId = document.getElementById('assign-role-user-id-hidden');
      if (hiddenId) hiddenId.value = activeUser.id;
      if (selectEl) selectEl.value = activeUser.id;
      const targetNameEl = document.getElementById('assign-role-user-name');
      if (targetNameEl) targetNameEl.textContent = activeUser.full_name;
      const currBadge = document.getElementById('assign-role-current');
      if (currBadge) currBadge.textContent = activeUser.role;
      const roleSelect = document.getElementById('assign-role-select');
      if (roleSelect) {
        const adminOption = roleSelect.querySelector('option[value="Admin"]');
        if (adminOption) adminOption.disabled = api.currentUser?.role !== 'Admin';
        if (activeUser.role) roleSelect.value = activeUser.role;
      }
    }

    dialog.showModal();
  }

  async handleRoleAssignmentSubmit() {
    const hiddenIdVal = document.getElementById('assign-role-user-id-hidden')?.value;
    const selectVal = document.getElementById('assign-role-user-select')?.value;
    const userId = parseInt(hiddenIdVal || selectVal);
    const newRole = document.getElementById('assign-role-select')?.value;
    const dialog = document.getElementById('assign-role-dialog');

    if (!userId || isNaN(userId)) {
      window.showToast('Please select a valid user to assign the role', 'warning');
      return;
    }

    try {
      const updatedUser = await api.assignUserRole(userId, newRole);
      window.showToast(`Role successfully updated to "${newRole}" for ${updatedUser.full_name}!`, 'success');
      if (dialog) dialog.close();

      // If updating current user's role, update local session & navbar badge
      if (api.currentUser && (api.currentUser.id === userId || api.currentUser.username === updatedUser.username)) {
        api.currentUser.role = newRole;
        localStorage.setItem('currentUser', JSON.stringify(api.currentUser));
        window.authController?.updateUserUI(api.currentUser);
      }

      await this.loadUsers();
    } catch (err) {
      window.showToast(`Failed to update role: ${err.message}`, 'danger');
    }
  }

  async handleCreateUser() {
    const fullName = document.getElementById('admin-new-fullname').value.trim();
    const username = document.getElementById('admin-new-username').value.trim();
    const email = document.getElementById('admin-new-email').value.trim();
    const role = document.getElementById('admin-new-role').value;
    const pass = document.getElementById('admin-new-password').value;

    if (!fullName || !username || !email || !pass) {
      window.showToast('Please fill in all user account fields', 'warning');
      return;
    }

    try {
      await api.createUser({
        full_name: fullName,
        username,
        email,
        role,
        password: pass
      });

      window.showToast(`User account created with assigned role "${role}"!`, 'success');
      document.getElementById('admin-create-user-form').reset();
      this.switchTab('users');
      await this.loadUsers();
    } catch (err) {
      window.showToast(`Creation failed: ${err.message}`, 'danger');
    }
  }
}

const adminController = new AdministrationController();
window.adminController = adminController;
