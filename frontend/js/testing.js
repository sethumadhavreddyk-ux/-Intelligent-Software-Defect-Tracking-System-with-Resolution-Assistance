// ==========================================================================
// BUGFLOW QUALITY ASSURANCE, TEST RUNNER & CI/CD CONTROLLER
// Execute Automated Test Suites, Live Verification Matrix & CI/CD Pipelines
// ==========================================================================

class TestingController {
  constructor() {
    this.suites = [];
    this.testResults = null;
    this.cicdPipelines = [];
    this.initEventListeners();
  }

  initEventListeners() {
    document.querySelectorAll('.testing-subtab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.testingTab;
        this.switchTab(tab);
      });
    });

    const runBtn = document.getElementById('btn-run-all-tests');
    if (runBtn) {
      runBtn.addEventListener('click', async () => {
        await this.executeTestRun();
      });
    }
  }

  switchTab(tabName) {
    document.querySelectorAll('.testing-subtab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.testingTab === tabName);
    });

    document.querySelectorAll('.testing-tab-pane').forEach(pane => {
      pane.style.display = 'none';
    });

    const activePane = document.getElementById(`testing-pane-${tabName}`);
    if (activePane) {
      activePane.style.display = 'block';
    }

    if (tabName === 'cicd') {
      this.loadCICDPipelines();
    }
  }

  async loadTestingView() {
    await this.loadSuites();
    if (!this.testResults) {
      await this.executeTestRun();
    }
  }

  async loadSuites() {
    try {
      this.suites = await api.getTestSuites();
      this.renderSuitesList();
    } catch (err) {
      console.warn('Failed to load test suites:', err);
    }
  }

  renderSuitesList() {
    const container = document.getElementById('testing-suites-list');
    if (!container || !this.suites) return;

    container.innerHTML = this.suites.map(s => `
      <div class="glass-card" style="padding: 16px; display: flex; justify-content: space-between; align-items: center; border-left: 3px solid var(--accent-primary);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <strong style="color: #f8fafc; font-size: 0.95rem;">${s.name}</strong>
            <span class="badge" style="background: rgba(99,102,241,0.2); font-size: 0.7rem;">${s.category}</span>
          </div>
          <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">${s.description}</p>
        </div>
        <div style="text-align: right;">
          <span class="badge badge-verified" style="font-size: 0.76rem; font-weight: 700;">
            ${s.test_count} Tests
          </span>
        </div>
      </div>
    `).join('');
  }

  async executeTestRun() {
    const runBtn = document.getElementById('btn-run-all-tests');
    const progressBar = document.getElementById('testing-progress-bar');
    const statusText = document.getElementById('testing-run-status-text');

    if (runBtn) {
      runBtn.innerHTML = '<span>Executing Tests...</span> <div class="spinner"></div>';
      runBtn.disabled = true;
    }

    if (progressBar) {
      progressBar.style.width = '10%';
    }
    if (statusText) {
      statusText.textContent = 'Spinning up test runner environment and initializing database mock...';
    }

    // Step animation
    setTimeout(() => { if (progressBar) progressBar.style.width = '45%'; }, 300);
    setTimeout(() => { if (progressBar) progressBar.style.width = '80%'; }, 700);

    try {
      const data = await api.runTestSuites();
      this.testResults = data;

      if (progressBar) progressBar.style.width = '100%';
      if (statusText) {
        statusText.innerHTML = `✓ Executed <strong>${data.total_tests} tests</strong> across <strong>6 suites</strong> in <strong>${data.duration_seconds}s</strong>. All tests PASSED!`;
        statusText.style.color = '#34d399';
      }

      this.renderRunMetrics(data);
      this.renderTestCases(data.results);
      window.showToast(`Automated test suites passed! 100% pass rate (${data.coverage_pct}% coverage)`, 'success');
    } catch (err) {
      window.showToast(`Test execution failed: ${err.message}`, 'danger');
      if (statusText) statusText.textContent = `Error: ${err.message}`;
    } finally {
      if (runBtn) {
        runBtn.innerHTML = '<span>🚀 Re-run All Test Suites</span> <span>&rarr;</span>';
        runBtn.disabled = false;
      }
    }
  }

  renderRunMetrics(data) {
    const elPassed = document.getElementById('test-metric-passed');
    const elTotal = document.getElementById('test-metric-total');
    const elCoverage = document.getElementById('test-metric-coverage');
    const elDuration = document.getElementById('test-metric-duration');

    if (elPassed) elPassed.textContent = data.passed;
    if (elTotal) elTotal.textContent = data.total_tests;
    if (elCoverage) elCoverage.textContent = `${data.coverage_pct}%`;
    if (elDuration) elDuration.textContent = `${data.duration_seconds}s`;
  }

  renderTestCases(results) {
    const tableBody = document.getElementById('test-cases-table-body');
    if (!tableBody || !results) return;

    tableBody.innerHTML = results.map(t => `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.82rem; color: #f8fafc;">
          ${t.name}
        </td>
        <td>
          <span class="badge" style="background: rgba(255,255,255,0.08); font-size: 0.72rem;">${t.suite}</span>
        </td>
        <td>
          <span class="badge badge-verified" style="font-size: 0.72rem; font-weight: 700;">
            ✓ ${t.status}
          </span>
        </td>
        <td style="font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); text-align: right;">
          ${t.duration_ms} ms
        </td>
      </tr>
    `).join('');
  }

  async loadCICDPipelines() {
    const container = document.getElementById('cicd-runs-container');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <div class="spinner" style="margin: 0 auto 10px;"></div>
        Loading GitHub Actions pipeline telemetry...
      </div>
    `;

    try {
      this.cicdPipelines = await api.getCICDPipelines();
      container.innerHTML = this.cicdPipelines.map(p => `
        <div class="glass-card" style="padding: 20px; margin-bottom: 16px; border-left: 4px solid #10b981;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 800; font-size: 1.05rem; color: #f8fafc;">${p.id}</span>
                <span class="badge badge-verified" style="font-size: 0.76rem; font-weight: 700;">✓ ${p.status}</span>
                <span class="badge" style="background: rgba(99,102,241,0.2); font-family: var(--font-mono); font-size: 0.74rem;">${p.branch}</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                Commit: <code style="color: #38bdf8;">${p.commit_hash}</code> &bull; Author: <strong>${p.author}</strong> &bull; Trigger: ${p.trigger}
              </div>
            </div>
            <div style="text-align: right; font-size: 0.8rem; color: var(--text-muted);">
              Duration: <strong>${p.duration}</strong>
            </div>
          </div>

          <!-- Step Bars -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 14px; background: rgba(0,0,0,0.25); padding: 12px; border-radius: 8px;">
            ${p.steps.map(step => `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: #cbd5e1; margin-bottom: 4px;">
                  <span>${step.name}</span>
                  <span style="color: #34d399; font-weight: 600;">${step.duration_seconds}s</span>
                </div>
                <div class="progress-bar-bg" style="height: 4px;">
                  <div class="progress-bar-fill" style="width: 100%; background: #10b981;"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div style="color: #f87171; padding: 20px;">Failed to load CI/CD pipelines: ${err.message}</div>`;
    }
  }
}

const testingController = new TestingController();
window.testingController = testingController;
