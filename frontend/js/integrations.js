// ==========================================================================
// INTEGRATIONS CONTROLLER
// GitHub PR Sync, Slack Alerts, MS Teams Cards, Jira 2-Way Sync & Live Logs
// ==========================================================================

class IntegrationsController {
  constructor() {
    this.defects = [];
    this.initEventListeners();
  }

  initEventListeners() {
    // Initial listeners if needed
  }

  async loadIntegrations() {
    await this.populateDefectDropdowns();
    await this.loadLogs();
  }

  async populateDefectDropdowns() {
    try {
      this.defects = await api.getDefects();
      const optionsHtml = this.defects.map(d => `
        <option value="${d.id}">${d.key}: ${d.title.slice(0, 45)}...</option>
      `).join('');

      const ghSelect = document.getElementById('github-defect-select');
      if (ghSelect) ghSelect.innerHTML = optionsHtml;

      const slackSelect = document.getElementById('slack-defect-select');
      if (slackSelect) slackSelect.innerHTML = `<option value="">-- No Defect Attached --</option>` + optionsHtml;

      const jiraSelect = document.getElementById('jira-defect-select');
      if (jiraSelect) jiraSelect.innerHTML = optionsHtml;
    } catch (e) {
      console.warn('Failed to load defects for integration selectors:', e);
    }
  }

  async linkGitHub() {
    const defectId = parseInt(document.getElementById('github-defect-select')?.value);
    const prUrl = document.getElementById('github-pr-url')?.value?.trim();
    const commitHash = document.getElementById('github-commit-hash')?.value?.trim();

    if (!defectId) {
      window.showToast('Please select a defect to link GitHub PR', 'warning');
      return;
    }

    if (!prUrl) {
      window.showToast('Please enter a valid GitHub Pull Request URL', 'warning');
      return;
    }

    try {
      window.showToast('Linking GitHub Pull Request & syncing CI/CD status...', 'info');
      const res = await api.linkGithubPr(defectId, prUrl, commitHash || 'head-latest');
      window.showToast(`GitHub PR successfully linked to defect!`, 'success');
      await this.loadLogs();
    } catch (err) {
      window.showToast(`GitHub linking failed: ${err.message}`, 'danger');
    }
  }

  async sendSlackAlert() {
    const channel = document.getElementById('slack-channel-input')?.value?.trim() || '#defects-alerts';
    const message = document.getElementById('slack-message-input')?.value?.trim();
    const defectSelect = document.getElementById('slack-defect-select');
    const defectId = defectSelect?.value ? parseInt(defectSelect.value) : null;

    if (!message) {
      window.showToast('Please enter an alert message to broadcast', 'warning');
      return;
    }

    try {
      window.showToast(`Dispatching Slack alert to ${channel}...`, 'info');
      const res = await api.triggerSlackAlert(message, channel, defectId);
      window.showToast(`Slack alert dispatched successfully to ${channel}!`, 'success');
      await this.loadLogs();
    } catch (err) {
      window.showToast(`Slack dispatch issue: ${err.message}`, 'danger');
    }
  }

  async sendTeamsAlert() {
    const channel = document.getElementById('teams-channel-input')?.value?.trim() || 'General';
    const message = document.getElementById('teams-message-input')?.value?.trim();

    if (!message) {
      window.showToast('Please enter a message for MS Teams card', 'warning');
      return;
    }

    try {
      window.showToast(`Sending adaptive card to Microsoft Teams (${channel})...`, 'info');
      await api.triggerTeamsAlert(message, channel);
      window.showToast(`Teams notification dispatched successfully to ${channel}!`, 'success');
      await this.loadLogs();
    } catch (err) {
      window.showToast(`Teams dispatch issue: ${err.message}`, 'danger');
    }
  }

  async syncJira() {
    const jiraKey = document.getElementById('jira-key-input')?.value?.trim();
    const defectId = parseInt(document.getElementById('jira-defect-select')?.value);
    const direction = document.getElementById('jira-sync-direction')?.value || 'TWO_WAY';

    if (!jiraKey) {
      window.showToast('Please enter a Jira issue key (e.g. PROJ-248)', 'warning');
      return;
    }

    try {
      window.showToast(`Synchronizing Jira issue '${jiraKey}' with BugFlow backlog...`, 'info');
      const res = await api.syncJiraIssue(jiraKey, defectId, direction);
      window.showToast(res.message || `Jira issue ${jiraKey} synchronized!`, 'success');
      await this.loadLogs();
    } catch (err) {
      window.showToast(`Jira sync issue: ${err.message}`, 'danger');
    }
  }

  async loadLogs() {
    const tbody = document.getElementById('integration-logs-body');
    if (!tbody) return;

    try {
      const logs = await api.getIntegrationLogs();
      if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 24px;">No integration events recorded yet. Dispatch a GitHub PR or Slack alert above.</td></tr>`;
        return;
      }

      const providerIcons = {
        'GitHub': '🐙',
        'Slack': '💬',
        'MS Teams': '👥',
        'Jira': '🔷'
      };

      tbody.innerHTML = logs.map(l => {
        const icon = providerIcons[l.provider] || '🔗';
        const formattedDate = l.created_at ? new Date(l.created_at).toLocaleTimeString() : 'Just now';
        
        let payloadSummary = l.payload;
        try {
          const parsed = JSON.parse(l.payload);
          if (parsed.text) payloadSummary = parsed.text;
          else if (parsed.pr_url) payloadSummary = `PR: ${parsed.pr_url} [${parsed.defect_key || ''}]`;
          else if (parsed.jira_key) payloadSummary = `Jira: ${parsed.jira_key} [${parsed.direction}]`;
        } catch (e) {}

        return `
          <tr>
            <td>
              <span style="font-size: 1.1rem; vertical-align: middle; margin-right: 6px;">${icon}</span>
              <strong>${l.provider}</strong>
            </td>
            <td>
              <span class="badge" style="background: rgba(99,102,241,0.18); color: #a5b4fc; font-size: 0.76rem;">
                ${l.event_type}
              </span>
            </td>
            <td style="font-family: var(--font-mono); font-size: 0.78rem; max-width: 320px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #cbd5e1;">
              ${payloadSummary || 'N/A'}
            </td>
            <td style="font-size: 0.78rem; color: var(--text-muted);">
              ${formattedDate}
            </td>
            <td>
              <span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399; font-weight: 700; font-size: 0.74rem;">
                ${l.status}
              </span>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #f87171; padding: 20px;">Could not load logs: ${e.message}</td></tr>`;
    }
  }
}

const integrationsController = new IntegrationsController();
window.integrationsController = integrationsController;
