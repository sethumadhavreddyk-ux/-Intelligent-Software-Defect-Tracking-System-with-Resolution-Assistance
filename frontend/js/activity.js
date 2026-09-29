// ==========================================================================
// ACTIVITY & AUDIT TRAIL CONTROLLER
// Chronological system audit logs with user attributions and status changes
// ==========================================================================

class ActivityController {
  async loadActivity() {
    try {
      const logs = await api.getActivityFeed();
      this.renderFeed(logs);
    } catch (err) {
      console.error("Activity feed error:", err);
    }
  }

  renderFeed(logs) {
    const container = document.getElementById('activity-stream-container');
    if (!container) return;

    if (logs.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 32px;">No activity logs recorded yet.</div>`;
      return;
    }

    container.innerHTML = logs.map(log => {
      let icon = '📝';
      let badgeColor = 'rgba(99, 102, 241, 0.2)';

      if (log.action_type === 'STATUS_CHANGE') {
        icon = '🔄';
        badgeColor = 'rgba(245, 158, 11, 0.2)';
      } else if (log.action_type === 'CREATED') {
        icon = '✨';
        badgeColor = 'rgba(16, 185, 129, 0.2)';
      } else if (log.action_type === 'ASSIGNED') {
        icon = '👤';
        badgeColor = 'rgba(139, 92, 246, 0.2)';
      } else if (log.action_type === 'COMMENTED') {
        icon = '💬';
        badgeColor = 'rgba(6, 182, 212, 0.2)';
      }

      const userDisplay = log.user ? log.user.full_name : 'System';
      const timeDisplay = new Date(log.created_at).toLocaleString();

      return `
        <div class="glass-card" style="margin-bottom: 12px; padding: 14px 18px; display: flex; align-items: flex-start; gap: 14px;">
          <div style="font-size: 1.3rem; padding: 8px; border-radius: var(--radius-md); background: ${badgeColor};">
            ${icon}
          </div>
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap;">
              <span class="badge" style="background: ${badgeColor}; font-size: 0.72rem; text-transform: uppercase;">
                ${log.action_type.replace('_', ' ')}
              </span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${timeDisplay}</span>
            </div>
            <p style="font-size: 0.9rem; color: var(--text-primary); margin-top: 6px; line-height: 1.4;">
              ${log.description}
            </p>
            ${log.field_changed ? `
              <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 4px; font-family: var(--font-mono);">
                Changed <strong>${log.field_changed}</strong>: <span style="text-decoration: line-through; opacity: 0.7;">${log.old_value || 'None'}</span> &rarr; <span style="color: var(--accent-success);">${log.new_value}</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');
  }
}

window.activityController = new ActivityController();
