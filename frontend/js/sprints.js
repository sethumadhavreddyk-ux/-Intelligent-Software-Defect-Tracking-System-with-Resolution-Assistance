// ==========================================================================
// SPRINTS CONTROLLER
// Sprints CRUD, Sprint Health Scorecard & Backlog Defect Assignment
// ==========================================================================

class SprintsController {
  constructor() {
    this.sprints = [];
    this.initEventListeners();
  }

  initEventListeners() {
    const createSprintBtn = document.getElementById('btn-open-create-sprint');
    if (createSprintBtn) {
      createSprintBtn.addEventListener('click', () => this.openCreateSprintModal());
    }

    const sprintForm = document.getElementById('sprint-form');
    if (sprintForm) {
      sprintForm.addEventListener('submit', (e) => this.handleSaveSprint(e));
    }
  }

  async loadSprints() {
    try {
      this.sprints = await api.getSprints();
      this.renderSprintsList(this.sprints);
    } catch (err) {
      console.error("Sprints load error:", err);
    }
  }

  renderSprintsList(sprints) {
    const listEl = document.getElementById('sprints-list-container');
    if (!listEl) return;

    if (sprints.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 32px;">No active or planning sprints found.</div>`;
      return;
    }

    listEl.innerHTML = sprints.map(s => {
      const isActive = s.status === 'Active';
      const pct = s.defect_count > 0 ? Math.round((s.resolved_count / s.defect_count) * 100) : 0;

      return `
        <div class="glass-card" style="margin-bottom: 16px; border-left: 4px solid ${isActive ? 'var(--accent-primary)' : 'var(--border-color)'};">
          <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h3 style="font-size: 1.15rem; font-weight: 700;">${s.name}</h3>
                <span class="badge" style="background: ${isActive ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.08)'}; color: ${isActive ? 'var(--accent-primary)' : 'var(--text-muted)'};">
                  ${s.status}
                </span>
              </div>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">${s.goal || 'No goal set'}</p>
            </div>
            <div style="display: flex; gap: 8px;">
              <button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 12px;" onclick="sprintsController.viewSprintHealth(${s.id})">
                Check Health Score
              </button>
              <button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 12px;" onclick="sprintsController.openAssignDefectsModal(${s.id})">
                Assign Defects
              </button>
              <button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 12px;" onclick="sprintsController.openEditSprintModal(${s.id})">
                Edit
              </button>
              <button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 12px; color: var(--accent-danger);" onclick="sprintsController.deleteSprint(${s.id})">
                Delete
              </button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-top: 14px; font-size: 0.85rem;">
            <div>
              <span style="color: var(--text-muted);">Defects Total:</span>
              <strong>${s.defect_count}</strong> (${s.resolved_count} Resolved)
            </div>
            <div>
              <span style="color: var(--text-muted);">Target Velocity:</span>
              <strong>${s.velocity_target} pts</strong>
            </div>
            <div>
              <span style="color: var(--text-muted);">Timeline:</span>
              <span>${new Date(s.start_date).toLocaleDateString()} - ${new Date(s.end_date).toLocaleDateString()}</span>
            </div>
          </div>

          <div class="progress-bar-bg" style="width: 100%; height: 8px; margin-top: 14px;">
            <div class="progress-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  async viewSprintHealth(sprintId) {
    try {
      const health = await api.getSprintHealth(sprintId);
      const modal = document.getElementById('sprint-health-modal');
      if (!modal) return;

      document.getElementById('modal-health-score').textContent = health.health_score;
      document.getElementById('modal-health-badge').textContent = `${health.risk_level} RISK`;
      document.getElementById('modal-health-badge').className = `health-badge ${health.risk_level.toLowerCase()}-risk`;
      document.getElementById('modal-health-exp').textContent = health.explanation;
      document.getElementById('modal-health-actions').innerHTML = health.recommended_actions.map(act => `
        <li style="margin-bottom: 6px;">${act}</li>
      `).join('');

      modal.showModal();
    } catch (err) {
      window.showToast("Could not calculate sprint health", "danger");
    }
  }

  async openCreateSprintModal() {
    const modal = document.getElementById('sprint-dialog');
    if (!modal) return;
    document.getElementById('sprint-form').reset();
    document.getElementById('sprint-id-hidden').value = '';
    document.getElementById('sprint-modal-title').textContent = 'Create New Sprint';

    // Populate projects
    const prjSelect = document.getElementById('sprint-project-select');
    if (prjSelect) {
      const projects = await api.getProjects();
      prjSelect.innerHTML = projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    }

    modal.showModal();
  }

  async openEditSprintModal(id) {
    const sprint = this.sprints.find(s => s.id === id);
    if (!sprint) return;

    const modal = document.getElementById('sprint-dialog');
    document.getElementById('sprint-modal-title').textContent = 'Edit Sprint';
    document.getElementById('sprint-id-hidden').value = sprint.id;
    document.getElementById('sprint-name-input').value = sprint.name;
    document.getElementById('sprint-goal-input').value = sprint.goal || '';
    document.getElementById('sprint-velocity-input').value = sprint.velocity_target;
    document.getElementById('sprint-status-select').value = sprint.status;

    modal.showModal();
  }

  async handleSaveSprint(e) {
    e.preventDefault();
    const id = document.getElementById('sprint-id-hidden').value;
    const name = document.getElementById('sprint-name-input').value.trim();
    const goal = document.getElementById('sprint-goal-input').value.trim();
    const velocity = parseInt(document.getElementById('sprint-velocity-input').value);
    const status = document.getElementById('sprint-status-select').value;
    const projectId = parseInt(document.getElementById('sprint-project-select').value) || 1;

    const now = new Date();
    const nextWeek = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    try {
      if (id) {
        await api.updateSprint(id, { name, goal, velocity_target: velocity, status });
        window.showToast("Sprint updated successfully", "success");
      } else {
        await api.createSprint({
          name,
          goal,
          velocity_target: velocity,
          status,
          project_id: projectId,
          start_date: now.toISOString(),
          end_date: nextWeek.toISOString()
        });
        window.showToast("New sprint launched!", "success");
      }
      document.getElementById('sprint-dialog').close();
      await this.loadSprints();
    } catch (err) {
      window.showToast(err.message || "Failed to save sprint", "danger");
    }
  }

  async deleteSprint(id) {
    if (!confirm("Are you sure you want to delete this sprint? Unresolved defects will return to backlog.")) return;
    try {
      await api.deleteSprint(id);
      window.showToast("Sprint deleted successfully", "success");
      await this.loadSprints();
    } catch (err) {
      window.showToast(err.message, "danger");
    }
  }

  async openAssignDefectsModal(sprintId) {
    const modal = document.getElementById('assign-defects-dialog');
    if (!modal) return;

    const defects = await api.getDefects();
    const unassigned = defects.filter(d => d.sprint_id !== sprintId && d.status !== 'Closed');
    const container = document.getElementById('assign-defects-list');

    if (unassigned.length === 0) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.9rem;">No defects available to assign.</div>`;
    } else {
      container.innerHTML = unassigned.map(d => `
        <label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: var(--bg-surface); border-radius: var(--radius-sm); margin-bottom: 6px; cursor: pointer;">
          <input type="checkbox" value="${d.id}" class="assign-defect-checkbox">
          <strong>${d.key}</strong>
          <span style="flex: 1; font-size: 0.88rem;">${d.title}</span>
          <span class="badge badge-${d.severity.toLowerCase()}">${d.severity}</span>
        </label>
      `).join('');
    }

    const saveBtn = document.getElementById('btn-confirm-assign-defects');
    saveBtn.onclick = async () => {
      const selected = Array.from(document.querySelectorAll('.assign-defect-checkbox:checked')).map(c => parseInt(c.value));
      if (selected.length === 0) {
        modal.close();
        return;
      }
      try {
        await api.request(`/sprints/${sprintId}/assign-defects`, {
          method: 'POST',
          body: JSON.stringify(selected)
        });
        window.showToast(`Assigned ${selected.length} defects to sprint!`, "success");
        modal.close();
        await this.loadSprints();
      } catch (err) {
        window.showToast(err.message, "danger");
      }
    };

    modal.showModal();
  }
}

window.sprintsController = new SprintsController();
