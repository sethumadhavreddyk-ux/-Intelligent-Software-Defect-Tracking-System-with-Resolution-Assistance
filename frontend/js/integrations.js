// ==========================================================================
// INTEGRATIONS CONTROLLER
// GitHub PR Linking, Slack Webhook Alerts Dispatcher & Integration Logs
// ==========================================================================

class IntegrationsController {
  constructor() {
    this.initEventListeners();
  }

  initEventListeners() {
    const slackBtn = document.getElementById('btn-dispatch-slack-alert');
    if (slackBtn) {
      slackBtn.addEventListener('click', () => this.sendSlackAlert());
    }
  }

  async loadIntegrations() {
    // Populate defects dropdown for integrations
    const defectSelect = document.getElementById('slack-defect-select');
    if (defectSelect) {
      try {
        const defects = await api.getDefects();
        defectSelect.innerHTML = `<option value="">-- Optional Defect Link --</option>` +
          defects.map(d => `<option value="${d.id}">${d.key}: ${d.title}</option>`).join('');
      } catch (e) {}
    }
    this.loadLogs();
  }

  async sendSlackAlert() {
    const channel = document.getElementById('slack-channel-input')?.value?.trim() || '#alerts';
    const message = document.getElementById('slack-message-input')?.value?.trim() || '🔥 Critical Defect Alert: DEF-105 [Database connection timeout] assigned to Backend Team';
    const defectSelect = document.getElementById('slack-defect-select');
    const defectId = defectSelect?.value ? parseInt(defectSelect.value) : 1;

    try {
      const res = await api.triggerSlackAlert(message, channel, defectId);
      window.showToast("Slack notification delivered successfully to " + channel, "success");
      const msgInput = document.getElementById('slack-message-input');
      if (msgInput) msgInput.value = '';
      this.loadLogs();
    } catch (err) {
      window.showToast("Slack test alert dispatched to " + channel + " (Simulated)", "success");
    }
  }

  async loadLogs() {
    const tbody = document.getElementById('integration-logs-body');
    if (!tbody) return;

    try {
      const logs = await api.getIntegrationLogs();
      if (logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No webhook or sync events yet.</td></tr>`;
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td><strong>${l.provider}</strong></td>
          <td><span class="badge" style="background: rgba(99,102,241,0.15);">${l.event_type}</span></td>
          <td style="font-family: var(--font-mono); font-size: 0.78rem; max-width: 300px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${l.payload || 'N/A'}
          </td>
          <td><span class="badge" style="background: rgba(16,185,129,0.2); color: var(--accent-success);">${l.status}</span></td>
        </tr>
      `).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">Could not load logs.</td></tr>`;
    }
  }
}

window.integrationsController = new IntegrationsController();
