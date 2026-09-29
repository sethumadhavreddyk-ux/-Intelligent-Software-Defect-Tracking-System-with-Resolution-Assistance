// ==========================================================================
// BUGLOW DASHBOARD CONTROLLER
// 6-Metric KPI Cards, Multi-curve Trends Chart, Status Donut (124 Total),
// Severity Distribution Bars, Recent Defects Table, Sprint Health Gauge (78%),
// Embedded Ask Gemini Assistant, and Real-time Clock
// ==========================================================================

class DashboardController {
  constructor() {
    this.charts = {};
    this.trendTimeframe = '30';
    this.initEventListeners();
    this.startLiveClock();
  }

  initEventListeners() {
    // Trend timeframe selector
    const trendSelect = document.getElementById('dashboard-trend-timeframe');
    if (trendSelect) {
      trendSelect.addEventListener('change', (e) => {
        this.trendTimeframe = e.target.value;
        this.renderTrendsChart();
      });
    }

    // Embedded AI Assistant form on dashboard
    const dashAiForm = document.getElementById('dash-ai-assistant-form');
    if (dashAiForm) {
      dashAiForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('dash-ai-input');
        const query = input?.value.trim();
        if (!query) return;
        await this.handleDashAiQuery(query);
      });
    }

    // Quick prompt chips on dashboard
    document.querySelectorAll('.dash-ai-chip').forEach(chip => {
      chip.addEventListener('click', async (e) => {
        const query = e.currentTarget.dataset.prompt || e.currentTarget.textContent.trim();
        const input = document.getElementById('dash-ai-input');
        if (input) input.value = query;
        await this.handleDashAiQuery(query);
      });
    });

    // Recent question clicks
    document.querySelectorAll('.dash-recent-q').forEach(q => {
      q.addEventListener('click', async (e) => {
        const query = e.currentTarget.textContent.trim();
        const input = document.getElementById('dash-ai-input');
        if (input) input.value = query;
        await this.handleDashAiQuery(query);
      });
    });
  }

  startLiveClock() {
    const updateTime = () => {
      const clockEl = document.getElementById('dash-live-clock');
      if (!clockEl) return;
      const now = new Date();
      const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
      clockEl.textContent = now.toLocaleDateString('en-US', options);
    };
    updateTime();
    setInterval(updateTime, 30000);
  }

  async loadDashboard() {
    try {
      const summary = await api.getDashboardSummary();
      this.renderKPIs(summary);
      this.renderSprintHealth(summary.sprint_health_overview);
      this.renderCharts(summary);
      this.renderRecentDefectsTable();
    } catch (err) {
      console.error("Dashboard metrics load error:", err);
      // Fallback graceful render with mockup defaults
      this.renderKPIs({});
      this.renderCharts({});
      this.renderRecentDefectsTable();
    }
  }

  renderKPIs(data) {
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setVal('kpi-total-defects', data.total_defects || 124);
    setVal('kpi-open-defects', data.open_defects || 38);
    setVal('kpi-in-progress-defects', data.in_progress_defects || 26);
    setVal('kpi-critical-defects', data.critical_defects || 12);
    setVal('kpi-resolved-defects', (data.resolved_defects || 0) + (data.verified_defects || 0) + (data.closed_defects || 0) || 96);
    
    // Sprint Health Score
    const sprintHealthVal = data.sprint_health_overview?.health_score || 78;
    setVal('kpi-sprint-health', `${sprintHealthVal}%`);
    
    // Avg resolution in days
    const days = (data.avg_resolution_hours ? (data.avg_resolution_hours / 24).toFixed(1) : '3.4');
    setVal('kpi-avg-resolution', `${days} days`);
  }

  renderSprintHealth(health) {
    const scoreVal = health?.health_score || 78;
    const riskLevel = health?.risk_level || 'Moderate';

    const numEls = document.querySelectorAll('.dash-health-num, #dash-gauge-number');
    numEls.forEach(el => el.textContent = `${scoreVal}%`);

    const badgeEls = document.querySelectorAll('.dash-health-risk-badge');
    badgeEls.forEach(el => {
      el.textContent = `${riskLevel} Risk`;
      el.className = `dash-health-risk-badge badge-${riskLevel.toLowerCase()}`;
    });

    // Circular SVG Gauge Animation
    const ringEl = document.getElementById('dash-sprint-ring-circle');
    if (ringEl) {
      const circumference = 2 * Math.PI * 45; // r=45
      const offset = circumference - (scoreVal / 100) * circumference;
      ringEl.style.strokeDashoffset = offset;
    }
  }

  renderCharts(data) {
    if (typeof Chart === 'undefined') return;

    // 1. Defect Trends Chart
    this.renderTrendsChart();

    // 2. Status Distribution Donut Chart (Center 124 Total)
    const statusCanvas = document.getElementById('chart-status-donut');
    if (statusCanvas) {
      if (this.charts.status) this.charts.status.destroy();
      const statusData = data.defects_by_status || {
        'Reported': 28, 'Assigned': 24, 'In Progress': 32, 'In Review': 18, 'Resolved': 16, 'Closed': 6
      };

      this.charts.status = new Chart(statusCanvas, {
        type: 'doughnut',
        data: {
          labels: Object.keys(statusData),
          datasets: [{
            data: Object.values(statusData),
            backgroundColor: [
              '#3b82f6', // Reported
              '#8b5cf6', // Assigned
              '#f59e0b', // In Progress
              '#6366f1', // In Review
              '#10b981', // Resolved
              '#64748b'  // Closed
            ],
            borderWidth: 2,
            borderColor: '#0f172a'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '72%',
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 10,
                color: '#94a3b8',
                font: { size: 11 },
                generateLabels: function(chart) {
                  const data = chart.data;
                  return data.labels.map((label, i) => {
                    const val = data.datasets[0].data[i];
                    return {
                      text: `${label} (${val})`,
                      fillStyle: data.datasets[0].backgroundColor[i],
                      strokeStyle: data.datasets[0].borderColor,
                      lineWidth: 1,
                      index: i
                    };
                  });
                }
              }
            }
          }
        }
      });
    }

    // 3. Severity Distribution Bar Chart
    const sevCanvas = document.getElementById('chart-severity-bars');
    if (sevCanvas) {
      if (this.charts.severity) this.charts.severity.destroy();
      const sevData = data.defects_by_severity || {
        'Critical': 12, 'High': 28, 'Medium': 52, 'Low': 32
      };

      this.charts.severity = new Chart(sevCanvas, {
        type: 'bar',
        data: {
          labels: Object.keys(sevData),
          datasets: [{
            label: 'Defects',
            data: Object.values(sevData),
            backgroundColor: [
              '#ef4444', // Critical
              '#f97316', // High
              '#eab308', // Medium
              '#3b82f6'  // Low
            ],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
            x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
          }
        }
      });
    }
  }

  renderTrendsChart() {
    const trendsCanvas = document.getElementById('chart-defect-trends');
    if (!trendsCanvas || typeof Chart === 'undefined') return;

    if (this.charts.trends) this.charts.trends.destroy();

    const labels = ['Sep 1', 'Sep 5', 'Sep 10', 'Sep 15', 'Sep 20', 'Sep 25', 'Sep 30'];
    const createdSeries = [12, 18, 15, 26, 22, 28, 20];
    const resolvedSeries = [8, 14, 19, 21, 25, 24, 28];
    const criticalSeries = [4, 6, 3, 7, 5, 8, 4];

    this.charts.trends = new Chart(trendsCanvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Created',
            data: createdSeries,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Resolved',
            data: resolvedSeries,
            borderColor: '#34d399',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: 'Critical',
            data: criticalSeries,
            borderColor: '#f43f5e',
            backgroundColor: 'rgba(244, 63, 94, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', boxWidth: 12, usePointStyle: true }
          }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } },
          x: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#94a3b8' } }
        }
      }
    });
  }

  async renderRecentDefectsTable() {
    const tbody = document.getElementById('dash-recent-defects-body');
    if (!tbody) return;

    try {
      const defects = await api.getDefects();
      const recentList = defects.slice(0, 6);

      tbody.innerHTML = recentList.map(d => {
        const sevClass = `badge-${(d.severity || 'medium').toLowerCase()}`;
        const statusClass = `badge-${(d.status || 'reported').toLowerCase().replace(/\s+/g, '-')}`;
        const assigneeName = d.assignee?.full_name || 'Unassigned';
        const assigneeAvatar = d.assignee?.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${d.assignee?.username || 'user'}`;

        return `
          <tr>
            <td><strong style="color: var(--accent-primary); font-family: var(--font-mono); font-size: 0.88rem;">${d.key}</strong></td>
            <td>
              <div style="font-weight: 600; color: #f8fafc; font-size: 0.88rem;">${d.title}</div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">${d.category || 'General'}</div>
            </td>
            <td><span class="badge ${sevClass}">${d.severity}</span></td>
            <td><span class="badge ${statusClass}">${d.status}</span></td>
            <td>
              <div style="display: flex; align-items: center; gap: 8px;">
                <img src="${assigneeAvatar}" alt="" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
                <span style="font-size: 0.82rem; color: #cbd5e1;">${assigneeName}</span>
              </div>
            </td>
            <td>
              <div style="display: flex; gap: 6px;">
                <button class="table-action-btn" onclick="defectsController.openDetailsModal(${d.id})" title="Inspect Details">🔍</button>
                <button class="table-action-btn" onclick="intelligenceController.analyzeSpecificDefect(${d.id})" title="AI Root Cause Analysis" style="color: #c084fc;">✨</button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    } catch (e) {
      console.warn("Could not load recent defects table", e);
    }
  }

  async handleDashAiQuery(prompt) {
    const chatDrawer = document.getElementById('gemini-chat-drawer');
    const chatInput = document.getElementById('gemini-chat-input');
    
    // Open the floating Ask Gemini chat drawer
    if (chatDrawer) chatDrawer.classList.add('open');
    if (chatInput) {
      chatInput.value = prompt;
      const sendBtn = chatDrawer.querySelector('button[type="submit"]');
      if (sendBtn) sendBtn.click();
    }
  }
}

window.dashboardController = new DashboardController();
