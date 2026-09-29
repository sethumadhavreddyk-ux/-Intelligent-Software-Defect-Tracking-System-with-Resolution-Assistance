// ==========================================================================
// BUGLOW REPORTS CONTROLLER
// Report generation for Defect Summary, Sprint Analytics, Developer Workload,
// and AI Insights with CSV / JSON / PDF export simulation
// ==========================================================================

class ReportsController {
  constructor() {
    this.currentCategory = 'defect';
    this.initEventListeners();
  }

  initEventListeners() {
    // Category tabs
    document.querySelectorAll('.report-cat-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        document.querySelectorAll('.report-cat-tab').forEach(t => t.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.currentCategory = e.currentTarget.dataset.cat;
        this.updateReportForm();
      });
    });

    // Generate button
    const genBtn = document.getElementById('btn-generate-report');
    if (genBtn) {
      genBtn.addEventListener('click', () => this.generateReport());
    }
  }

  loadReports() {
    this.updateReportForm();
  }

  updateReportForm() {
    const titleEl = document.getElementById('report-config-title');
    const typeSelect = document.getElementById('report-type-select');
    if (!typeSelect) return;

    if (this.currentCategory === 'defect') {
      if (titleEl) titleEl.textContent = 'Defect Summary & Root Cause Report Configuration';
      typeSelect.innerHTML = `
        <option value="summary">Defect Summary (Status, Severity, SLA)</option>
        <option value="rca">Root Cause & Remediation Patterns</option>
        <option value="duplicates">Duplicate Detection Efficiency</option>
      `;
    } else if (this.currentCategory === 'sprint') {
      if (titleEl) titleEl.textContent = 'Sprint Performance & Risk Health Report';
      typeSelect.innerHTML = `
        <option value="sprint-health">Sprint 5 Health Scorecard & Velocity</option>
        <option value="burndown">Sprint 5 Ideal vs Actual Burndown</option>
        <option value="sprint-history">Quarterly Sprint Velocity Comparison</option>
      `;
    } else if (this.currentCategory === 'developer') {
      if (titleEl) titleEl.textContent = 'Developer Squad Workload & Throughput Report';
      typeSelect.innerHTML = `
        <option value="workload">Developer Resolution Speed & Active Load</option>
        <option value="squad">Squad Defect Density & Assignment Balance</option>
      `;
    } else if (this.currentCategory === 'ai') {
      if (titleEl) titleEl.textContent = 'AI Intelligence Accuracy & Resolution Assistance';
      typeSelect.innerHTML = `
        <option value="ai-accuracy">AI Root Cause Prediction Accuracy (92% Conf)</option>
        <option value="ai-recommend">Resolution Assistance Adoption Rate</option>
      `;
    }
  }

  async generateReport() {
    const reportType = document.getElementById('report-type-select')?.value || 'summary';
    const dateRange = document.getElementById('report-range-select')?.value || '30';
    const format = document.getElementById('report-format-select')?.value || 'pdf';

    window.showToast(`Generating ${format.toUpperCase()} report: ${reportType}...`, 'info');

    setTimeout(() => {
      // Create downloadable mock file
      let content = "";
      let filename = `BugFlow_Report_${reportType}_${new Date().toISOString().slice(0,10)}`;
      let mimeType = "text/plain";

      if (format === 'csv') {
        content = "DefectKey,Title,Severity,Status,Assignee,RootCause\nDEF-108,Login page error,Critical,In Progress,Rajesh Kumar,Overlay pointer events\nDEF-107,API response error,High,Assigned,Priya Sharma,Schema deserialization\nDEF-101,Payment page crashes,Critical,Reported,Madhav,Unchecked 3DS response\n";
        filename += ".csv";
        mimeType = "text/csv";
      } else if (format === 'json') {
        content = JSON.stringify({
          project: "BugFlow",
          generated_at: new Date().toISOString(),
          category: this.currentCategory,
          type: reportType,
          total_defects: 124,
          sprint_health: 78,
          critical_defects: 12
        }, null, 2);
        filename += ".json";
        mimeType = "application/json";
      } else {
        content = `%PDF-1.4 simulated report document for BugFlow - ${reportType}`;
        filename += ".pdf";
        mimeType = "application/pdf";
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      window.showToast(`Report downloaded successfully: ${filename}`, 'success');

      // Add to recent reports table
      this.addRecentReportRow(reportType, format);
    }, 1000);
  }

  addRecentReportRow(type, format) {
    const tbody = document.getElementById('recent-reports-table-body');
    if (!tbody) return;

    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${type.toUpperCase()} Report</strong></td>
      <td>Last 30 Days</td>
      <td><span class="badge" style="background: rgba(99,102,241,0.2);">${format.toUpperCase()}</span></td>
      <td>Just now</td>
      <td><button class="table-action-btn" onclick="window.showToast('Re-downloading...', 'info')">📥 Download</button></td>
    `;
    tbody.prepend(row);
  }
}

window.reportsController = new ReportsController();
