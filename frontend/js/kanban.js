// ==========================================================================
// KANBAN CONTROLLER (DRAG AND DROP DEFECT LIFECYCLE)
// Complete 7-Stage State Machine with RBAC checks and Visual Drop Targets
// ==========================================================================

class KanbanController {
  constructor() {
    this.columns = [
      { id: 'Reported', name: 'Reported', color: '#3b82f6' },
      { id: 'Assigned', name: 'Assigned', color: '#8b5cf6' },
      { id: 'In Progress', name: 'In Progress', color: '#f59e0b' },
      { id: 'In Review', name: 'In Review', color: '#6366f1' },
      { id: 'Resolved', name: 'Resolved', color: '#10b981' },
      { id: 'Verified', name: 'Verified', color: '#06b6d4' },
      { id: 'Closed', name: 'Closed', color: '#64748b' }
    ];
    this.draggedDefectId = null;
  }

  async loadBoard() {
    try {
      const defects = await api.getDefects();
      this.renderBoard(defects);
    } catch (err) {
      console.error("Kanban load error:", err);
    }
  }

  renderBoard(defects) {
    const container = document.getElementById('kanban-board-container');
    if (!container) return;

    container.innerHTML = this.columns.map(col => {
      const colDefects = defects.filter(d => d.status === col.id);
      
      const cardsHtml = colDefects.map(d => {
        const sevClass = `badge-${d.severity.toLowerCase()}`;
        return `
          <div class="defect-card" draggable="true" data-defect-id="${d.id}" data-current-status="${d.status}">
            <div class="card-top">
              <span class="defect-key">${d.key}</span>
              <span class="badge ${sevClass}">${d.severity}</span>
            </div>
            <div class="card-title">${d.title}</div>
            <div class="card-meta">
              <span>${d.category}</span>
              <span>${d.assignee ? d.assignee.full_name.split(' ')[0] : 'Unassigned'}</span>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="kanban-column" data-status="${col.id}">
          <div class="kanban-column-header">
            <div class="column-title-wrap">
              <span class="status-dot" style="background: ${col.color};"></span>
              <span class="column-name">${col.name}</span>
            </div>
            <span class="column-count">${colDefects.length}</span>
          </div>
          <div class="kanban-cards-list" data-status="${col.id}">
            ${cardsHtml}
          </div>
        </div>
      `;
    }).join('');

    this.attachDragAndDropHandlers();
  }

  attachDragAndDropHandlers() {
    // 1. Draggable cards
    const cards = document.querySelectorAll('.defect-card');
    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedDefectId = card.dataset.defectId;
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.defectId);
        e.dataTransfer.effectAllowed = 'move';
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        this.draggedDefectId = null;
      });

      // Click to inspect
      card.addEventListener('click', () => {
        if (window.defectsController) {
          window.defectsController.openDetailsModal(card.dataset.defectId);
        }
      });
    });

    // 2. Drop targets (Column Lists)
    const dropLists = document.querySelectorAll('.kanban-cards-list');
    dropLists.forEach(list => {
      list.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        list.classList.add('drag-over');
      });

      list.addEventListener('dragleave', () => {
        list.classList.remove('drag-over');
      });

      list.addEventListener('drop', async (e) => {
        e.preventDefault();
        list.classList.remove('drag-over');
        const defectId = e.dataTransfer.getData('text/plain') || this.draggedDefectId;
        const targetStatus = list.dataset.status;

        if (!defectId || !targetStatus) return;

        await this.handleStatusTransition(defectId, targetStatus);
      });
    });
  }

  async handleStatusTransition(defectId, newStatus) {
    try {
      window.showToast(`Transitioning defect to ${newStatus}...`, 'info');
      await api.updateDefectStatus(defectId, newStatus);
      window.showToast(`Successfully moved to ${newStatus}!`, 'success');
      await this.loadBoard();
      if (window.defectsController) window.defectsController.loadDefects();
    } catch (err) {
      window.showToast(err.message || 'Permission denied or invalid transition.', 'danger');
      await this.loadBoard(); // Re-render to revert visually
    }
  }
}

window.kanbanController = new KanbanController();
