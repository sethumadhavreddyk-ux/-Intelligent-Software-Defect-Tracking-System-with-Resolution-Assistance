// ==========================================================================
// TEAMS CONTROLLER
// Teams CRUD: Create, Edit, Delete, Update, and Adding Developers
// ==========================================================================

class TeamsController {
  constructor() {
    this.teams = [];
    this.initEventListeners();
  }

  initEventListeners() {
    const createBtn = document.getElementById('btn-open-create-team');
    if (createBtn) {
      createBtn.addEventListener('click', () => this.openCreateTeamModal());
    }

    const form = document.getElementById('team-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleSaveTeam(e));
    }
  }

  async loadTeams() {
    try {
      this.teams = await api.getTeams();
      this.renderTeams(this.teams);
    } catch (err) {
      console.error("Teams load error:", err);
    }
  }

  renderTeams(teams) {
    const container = document.getElementById('teams-container');
    if (!container) return;

    if (teams.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 32px;">No development squads or teams configured.</div>`;
      return;
    }

    container.innerHTML = teams.map(t => {
      const leadName = t.lead ? t.lead.full_name : 'No Lead Assigned';
      const members = t.members || [];

      const memberPills = members.map(m => `
        <div style="display: inline-flex; align-items: center; gap: 8px; background: var(--bg-surface); padding: 6px 12px; border-radius: var(--radius-full); border: 1px solid var(--border-color); font-size: 0.8rem;">
          <span style="font-weight: 600;">${m.user.full_name}</span>
          <span style="color: var(--text-muted);">(${m.role_in_team})</span>
          <button style="color: var(--accent-danger); font-size: 0.8rem; margin-left: 4px;" onclick="teamsController.removeMember(${t.id}, ${m.user.id})" title="Remove developer">&times;</button>
        </div>
      `).join('');

      return `
        <div class="glass-card" style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
            <div>
              <h3 style="font-size: 1.2rem; font-weight: 700;">${t.name}</h3>
              <p style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 4px;">${t.description || 'No description provided.'}</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-primary" style="font-size: 0.82rem; padding: 6px 14px;" onclick="teamsController.openAddDeveloperModal(${t.id})">
                + Add Developer
              </button>
              <button class="btn-secondary" style="font-size: 0.82rem; padding: 6px 12px;" onclick="teamsController.openEditTeamModal(${t.id})">
                Edit Team
              </button>
              <button class="btn-secondary" style="font-size: 0.82rem; padding: 6px 12px; color: var(--accent-danger);" onclick="teamsController.deleteTeam(${t.id})">
                Delete
              </button>
            </div>
          </div>

          <div style="margin-top: 14px; font-size: 0.85rem; color: var(--text-muted); display: flex; gap: 20px;">
            <span>Team Lead: <strong style="color: var(--text-primary);">${leadName}</strong></span>
            <span>Total Developers: <strong style="color: var(--text-primary);">${members.length}</strong></span>
          </div>

          <div style="margin-top: 14px;">
            <div style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); font-weight: 600; margin-bottom: 8px;">
              Team Members & Developers:
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${members.length > 0 ? memberPills : '<span style="color: var(--text-muted); font-size: 0.82rem;">No developers assigned yet. Click "+ Add Developer" to assign.</span>'}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  async openCreateTeamModal() {
    const modal = document.getElementById('team-dialog');
    if (!modal) return;
    document.getElementById('team-form').reset();
    document.getElementById('team-id-hidden').value = '';
    document.getElementById('team-modal-title').textContent = 'Create Engineering Team';

    const leadSelect = document.getElementById('team-lead-select');
    if (leadSelect) {
      const users = await api.getDevelopers();
      leadSelect.innerHTML = users.map(u => `<option value="${u.id}">${u.full_name} (${u.role})</option>`).join('');
    }

    modal.showModal();
  }

  async openEditTeamModal(id) {
    const team = this.teams.find(t => t.id === id);
    if (!team) return;

    const modal = document.getElementById('team-dialog');
    document.getElementById('team-modal-title').textContent = 'Edit Engineering Team';
    document.getElementById('team-id-hidden').value = team.id;
    document.getElementById('team-name-input').value = team.name;
    document.getElementById('team-desc-input').value = team.description || '';

    const leadSelect = document.getElementById('team-lead-select');
    if (leadSelect) {
      const users = await api.getDevelopers();
      leadSelect.innerHTML = users.map(u => `<option value="${u.id}" ${team.lead_id === u.id ? 'selected' : ''}>${u.full_name} (${u.role})</option>`).join('');
    }

    modal.showModal();
  }

  async handleSaveTeam(e) {
    e.preventDefault();
    const id = document.getElementById('team-id-hidden').value;
    const name = document.getElementById('team-name-input').value.trim();
    const description = document.getElementById('team-desc-input').value.trim();
    const lead_id = parseInt(document.getElementById('team-lead-select').value) || null;

    try {
      if (id) {
        await api.updateTeam(id, { name, description, lead_id });
        window.showToast("Team updated successfully", "success");
      } else {
        await api.createTeam({ name, description, lead_id });
        window.showToast("New engineering team created!", "success");
      }
      document.getElementById('team-dialog').close();
      await this.loadTeams();
    } catch (err) {
      window.showToast(err.message || "Failed to save team", "danger");
    }
  }

  async deleteTeam(id) {
    if (!confirm("Are you sure you want to delete this team?")) return;
    try {
      await api.deleteTeam(id);
      window.showToast("Team deleted successfully", "success");
      await this.loadTeams();
    } catch (err) {
      window.showToast(err.message, "danger");
    }
  }

  async openAddDeveloperModal(teamId) {
    const modal = document.getElementById('add-developer-dialog');
    if (!modal) return;

    const devSelect = document.getElementById('add-developer-select');
    const devs = await api.getDevelopers();
    devSelect.innerHTML = devs.map(d => `<option value="${d.id}">${d.full_name} (${d.role})</option>`).join('');

    const confirmBtn = document.getElementById('btn-confirm-add-developer');
    confirmBtn.onclick = async () => {
      const userId = parseInt(devSelect.value);
      const roleInTeam = document.getElementById('add-developer-role-input').value.trim() || 'Software Engineer';

      try {
        await api.addTeamMember(teamId, userId, roleInTeam);
        window.showToast("Developer added to team successfully!", "success");
        modal.close();
        await this.loadTeams();
      } catch (err) {
        window.showToast(err.message || "Failed to add developer", "danger");
      }
    };

    modal.showModal();
  }

  async removeMember(teamId, userId) {
    if (!confirm("Remove this developer from the team?")) return;
    try {
      await api.removeTeamMember(teamId, userId);
      window.showToast("Developer removed from team", "info");
      await this.loadTeams();
    } catch (err) {
      window.showToast(err.message, "danger");
    }
  }
}

window.teamsController = new TeamsController();
