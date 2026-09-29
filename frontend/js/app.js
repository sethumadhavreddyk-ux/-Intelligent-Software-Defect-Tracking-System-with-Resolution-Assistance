// ==========================================================================
// BUGLOW MASTER APP COORDINATOR & ROUTER
// View Navigation, Global Search (Ctrl+K), + Create Dropdown,
// Theme Switcher, Notifications, and Toast Notification System
// ==========================================================================

class AppController {
  constructor() {
    this.currentView = 'dashboard';
    this.selectedProject = 'BugFlow Project - Professional Plan';
    this.init();
  }

  init() {
    this.setupRouter();
    this.setupTheme();
    this.setupNotifications();
    this.setupGlobalSearch();
    this.setupCreateDropdown();
    this.setupProjectSelector();

    // Check auth session
    if (!api.isAuthenticated()) {
      window.authController?.showAuthOverlay();
    } else {
      window.authController?.hideAuthOverlay();
      window.authController?.updateUserUI(api.currentUser);
      this.loadCurrentView();
    }
  }

  setupRouter() {
    // Navigation links in sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = item.dataset.view;
        if (view) {
          e.preventDefault();
          this.navigateTo(view);
        }
      });
    });

    // Hash change listener
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '') || 'dashboard';
      this.navigateTo(hash);
    });

    // Initial hash check
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash) {
      this.currentView = initialHash;
    }
  }

  navigateTo(viewName) {
    if (!viewName) viewName = 'dashboard';
    this.currentView = viewName;
    window.location.hash = viewName;

    // Update active state in sidebar
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Toggle view sections
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`view-${viewName}`);
    if (activeSec) {
      activeSec.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    this.loadCurrentView();
  }

  async loadCurrentView() {
    if (!api.isAuthenticated()) return;

    switch (this.currentView) {
      case 'dashboard':
        if (window.dashboardController) window.dashboardController.loadDashboard();
        break;
      case 'defects':
        if (window.defectsController) window.defectsController.loadDefects();
        break;
      case 'kanban':
        if (window.kanbanController) window.kanbanController.loadBoard();
        break;
      case 'sprints':
        if (window.sprintsController) window.sprintsController.loadSprints();
        break;
      case 'teams':
        if (window.teamsController) window.teamsController.loadTeams();
        break;
      case 'intelligence':
        if (window.intelligenceController) window.intelligenceController.loadIntelligenceView();
        break;
      case 'analytics':
        if (window.analyticsController) window.analyticsController.loadAnalytics();
        break;
      case 'reports':
        if (window.reportsController) window.reportsController.loadReports();
        break;
      case 'api-docs':
        if (window.apiDocsController) window.apiDocsController.loadApiDocs();
        break;
      case 'calendar':
        if (window.calendarController) window.calendarController.loadCalendar();
        break;
      case 'activity':
        if (window.activityController) window.activityController.loadActivity();
        break;
      case 'integrations':
        if (window.integrationsController) window.integrationsController.loadIntegrations();
        break;
      case 'rag':
        if (window.ragController) window.ragController.loadRAGView();
        break;
      case 'administration':
        if (window.adminController) window.adminController.loadAdminView();
        break;
      case 'testing':
        if (window.testingController) window.testingController.loadTestingView();
        break;
      default:
        break;
    }

    this.fetchNotifications();
  }

  setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);

    const toggleBtn = document.getElementById('btn-toggle-theme');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('theme', next);
        window.showToast(`Switched to ${next} theme`, 'info');
      });
    }
  }

  setupNotifications() {
    const bellBtn = document.getElementById('btn-notification-bell');
    const drawer = document.getElementById('notification-drawer');
    const markAllBtn = document.getElementById('btn-mark-all-read');

    if (bellBtn && drawer) {
      bellBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        drawer.classList.toggle('open');
      });

      document.addEventListener('click', (e) => {
        if (!bellBtn.contains(e.target) && !drawer.contains(e.target)) {
          drawer.classList.remove('open');
        }
      });
    }

    if (markAllBtn) {
      markAllBtn.addEventListener('click', async () => {
        try {
          await api.markAllNotificationsRead();
          window.showToast("All notifications marked as read", "info");
          this.fetchNotifications();
        } catch (e) {}
      });
    }
  }

  async fetchNotifications() {
    try {
      const notifs = await api.getNotifications();
      const badge = document.getElementById('notification-badge');
      const listEl = document.getElementById('notification-drawer-list');

      const unreadCount = notifs.filter(n => !n.is_read).length;
      if (badge) {
        badge.textContent = unreadCount || 5;
        badge.style.display = 'flex';
      }

      if (listEl) {
        if (notifs.length === 0) {
          listEl.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 20px;">No notifications.</div>`;
          return;
        }

        listEl.innerHTML = notifs.map(n => `
          <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="appController.markReadAndOpen(${n.id}, '${n.link_url || ''}')" style="cursor: pointer; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.06);">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <strong style="font-size: 0.85rem; color: #f8fafc;">${n.title}</strong>
              <span style="font-size: 0.7rem; color: var(--text-muted);">${new Date(n.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 3px;">${n.message}</div>
          </div>
        `).join('');
      }
    } catch (e) {}
  }

  async markReadAndOpen(id, url) {
    try {
      await api.markNotificationRead(id);
      this.fetchNotifications();
    } catch (e) {}
    if (url && url.includes('#defects')) {
      this.navigateTo('defects');
    }
  }

  setupGlobalSearch() {
    const searchInp = document.getElementById('global-search-input');
    if (!searchInp) return;

    // Ctrl+K keyboard shortcut
    window.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInp.focus();
        searchInp.select();
      }
    });

    searchInp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInp.value.trim();
        this.navigateTo('defects');
        setTimeout(() => {
          const filter = document.getElementById('defect-search-filter');
          if (filter) {
            filter.value = q;
            window.defectsController?.applyFilters();
          }
        }, 150);
      }
    });
  }

  setupCreateDropdown() {
    const btn = document.getElementById('btn-create-trigger');
    const menu = document.getElementById('create-menu-dropdown');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });

    // Actions
    document.getElementById('action-create-defect')?.addEventListener('click', () => {
      menu.classList.remove('open');
      window.defectsController?.openReportModal();
    });

    document.getElementById('action-create-sprint')?.addEventListener('click', () => {
      menu.classList.remove('open');
      window.sprintsController?.openCreateSprintModal();
    });

    document.getElementById('action-create-team')?.addEventListener('click', () => {
      menu.classList.remove('open');
      window.teamsController?.openCreateTeamModal();
    });
  }

  setupProjectSelector() {
    const selector = document.getElementById('project-select-header');
    if (selector) {
      selector.addEventListener('change', (e) => {
        this.selectedProject = e.target.value;
        window.showToast(`Switched active workspace: ${this.selectedProject}`, 'info');
        this.loadCurrentView();
      });
    }
  }
}

// Global Toast System
window.showToast = function (message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';

  const icons = {
    success: '✅',
    danger: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const borders = {
    success: 'rgba(16, 185, 129, 0.5)',
    danger: 'rgba(239, 68, 68, 0.5)',
    warning: 'rgba(245, 158, 11, 0.5)',
    info: 'rgba(99, 102, 241, 0.5)'
  };

  toast.style.borderColor = borders[type] || borders.info;
  toast.innerHTML = `
    <span style="font-size: 1.1rem;">${icons[type] || 'ℹ️'}</span>
    <span style="font-size: 0.88rem; flex: 1; line-height: 1.35;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

window.addEventListener('DOMContentLoaded', () => {
  window.appController = new AppController();
});
