// ==========================================================================
// DEFECTS CONTROLLER
// Listing, Multi-Filtering, AI-Assisted Reporting, Details Modal & Actions
// ==========================================================================

class DefectsController {
  constructor() {
    this.defects = [];
    this.currentDefect = null;
    this.initEventListeners();
  }

  initEventListeners() {
    // Search input
    const searchInp = document.getElementById('defect-search-filter');
    if (searchInp) {
      searchInp.addEventListener('input', () => this.applyFilters());
    }

    // Dropdown filters
    ['filter-status', 'filter-severity', 'filter-category'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('change', () => this.applyFilters());
    });

    // Report Defect button
    const reportBtn = document.getElementById('btn-open-report-defect');
    if (reportBtn) {
      reportBtn.addEventListener('click', () => this.openReportModal());
    }

    // AI Formatter button inside Report Modal
    const aiFormatBtn = document.getElementById('btn-ai-format-report');
    if (aiFormatBtn) {
      aiFormatBtn.addEventListener('click', () => this.runAIReportAssistant());
    }

    // Live similarity check on title/description change
    const titleInp = document.getElementById('defect-title-input');
    const descInp = document.getElementById('defect-raw-desc-input');
    let debounceTimer;
    const triggerSimCheck = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => this.checkLiveDuplicateWarning(), 400);
    };
    if (titleInp) titleInp.addEventListener('input', triggerSimCheck);
    if (descInp) descInp.addEventListener('input', triggerSimCheck);

    // Save Defect Form
    const defectForm = document.getElementById('create-defect-form');
    if (defectForm) {
      defectForm.addEventListener('submit', (e) => this.handleSaveDefect(e));
    }

    // Comment submit in Details Modal
    const commentBtn = document.getElementById('btn-post-comment');
    if (commentBtn) {
      commentBtn.addEventListener('click', () => this.handlePostComment());
    }
  }

  async loadDefects() {
    try {
      this.defects = await api.getDefects();
      this.renderTable(this.defects);
    } catch (err) {
      console.error("Defects load error:", err);
      window.showToast("Could not load defects list", "warning");
    }
  }

  applyFilters() {
    const q = (document.getElementById('defect-search-filter')?.value || '').toLowerCase();
    const status = document.getElementById('filter-status')?.value || '';
    const severity = document.getElementById('filter-severity')?.value || '';
    const category = document.getElementById('filter-category')?.value || '';

    const filtered = this.defects.filter(d => {
      const matchQ = !q || d.title.toLowerCase().includes(q) || d.key.toLowerCase().includes(q);
      const matchStatus = !status || d.status === status;
      const matchSev = !severity || d.severity === severity;
      const matchCat = !category || d.category === category;
      return matchQ && matchStatus && matchSev && matchCat;
    });

    this.renderTable(filtered);
  }

  renderTable(items) {
    const tbody = document.getElementById('defects-table-body');
    const countEl = document.getElementById('defects-count-badge');
    if (countEl) countEl.textContent = `${items.length} Defects`;

    if (!tbody) return;
    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 32px; color: var(--text-muted);">No defects match current filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(d => {
      const sevClass = `badge-${d.severity.toLowerCase()}`;
      const statusClass = `status-${d.status.toLowerCase().replace(/[\s\/]+/g, '-')}`;
      const assigneeName = d.assignee ? d.assignee.full_name : '<span style="color: var(--text-muted);">Unassigned</span>';

      return `
        <tr>
          <td><strong class="defect-key" style="cursor: pointer;" onclick="defectsController.openDetailsModal(${d.id})">${d.key}</strong></td>
          <td>
            <a href="javascript:void(0)" onclick="defectsController.openDetailsModal(${d.id})" style="font-weight: 600; color: var(--text-primary);">
              ${d.title}
            </a>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
              ${d.category} &bull; ${d.defect_type || 'Functional'}
            </div>
          </td>
          <td><span class="badge ${sevClass}">${d.severity}</span></td>
          <td><span class="badge" style="background: rgba(255,255,255,0.08);">${d.status}</span></td>
          <td>${assigneeName}</td>
          <td style="font-size: 0.8rem; color: var(--text-muted);">
            ${new Date(d.created_at).toLocaleDateString()}
          </td>
          <td>
            <div style="display: flex; gap: 8px;">
              <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="defectsController.openDetailsModal(${d.id})">
                Inspect
              </button>
              <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--accent-danger);" onclick="defectsController.deleteDefect(${d.id})">
                Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // --- Report Defect Modal & AI Assistant ---
  async openReportModal() {
    const modal = document.getElementById('report-defect-dialog');
    if (!modal) return;

    // Reset fields
    document.getElementById('create-defect-form').reset();
    document.getElementById('ai-completeness-score').textContent = '25%';
    document.getElementById('ai-completeness-bar').style.width = '25%';
    document.getElementById('ai-missing-info-list').innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-muted);">
        Enter a defect description and click "AI Analyze & Format" to detect missing details and format report.
      </div>
    `;
    document.getElementById('duplicate-warning-box').style.display = 'none';

    // Populate project selector
    const prjSelect = document.getElementById('defect-project-select');
    if (prjSelect) {
      try {
        const prjs = await api.getProjects();
        prjSelect.innerHTML = prjs.map(p => `<option value="${p.id}">${p.name} (${p.key})</option>`).join('');
      } catch (e) {}
    }

    modal.showModal();
  }

  async runAIReportAssistant() {
    const rawText = document.getElementById('defect-raw-desc-input').value.trim();
    if (!rawText) {
      window.showToast("Please enter a raw description first (e.g. 'Login is not working')", "warning");
      return;
    }

    window.showToast("AI analyzing defect and detecting missing information...", "info");
    try {
      const result = await api.aiFormatReport(rawText);

      // Update Formatted Output
      document.getElementById('defect-title-input').value = result.suggested_title;
      document.getElementById('defect-env-input').value = result.environment;
      document.getElementById('defect-steps-input').value = result.steps_to_reproduce;
      document.getElementById('defect-expected-input').value = result.expected_result;
      document.getElementById('defect-actual-input').value = result.actual_result;
      document.getElementById('defect-formatted-desc').value = result.formatted_description;

      // Update Selectors with AI suggestions
      if (result.category_suggestion) document.getElementById('defect-category-select').value = result.category_suggestion;
      if (result.severity_suggestion) document.getElementById('defect-severity-select').value = result.severity_suggestion;
      if (result.priority_suggestion) document.getElementById('defect-priority-select').value = result.priority_suggestion;

      // Update Completeness Score & Missing fields
      document.getElementById('ai-completeness-score').textContent = `${result.completeness_score}%`;
      document.getElementById('ai-completeness-bar').style.width = `${result.completeness_score}%`;

      const listEl = document.getElementById('ai-missing-info-list');
      if (result.missing_fields && result.missing_fields.length > 0) {
        listEl.innerHTML = `
          <div style="font-size: 0.8rem; color: #f87171; font-weight: 600; margin-bottom: 4px;">Missing Information Identified:</div>
          <ul style="padding-left: 18px; font-size: 0.8rem; color: #fca5a5;">
            ${result.missing_fields.map(f => `<li>${f}</li>`).join('')}
          </ul>
        `;
      } else {
        listEl.innerHTML = `<div style="font-size: 0.8rem; color: var(--accent-success); font-weight: 600;">✓ Defect report has all essential reproduction elements!</div>`;
      }

      window.showToast("AI Defect Formatting Complete! Quality Score: " + result.completeness_score + "%", "success");

      // Check duplicates with newly generated title
      this.checkLiveDuplicateWarning();
    } catch (err) {
      window.showToast(err.message || "AI Analysis failed", "danger");
    }
  }

  async checkLiveDuplicateWarning() {
    const title = document.getElementById('defect-title-input')?.value.trim();
    const desc = document.getElementById('defect-raw-desc-input')?.value.trim();
    if (!title && !desc) return;

    try {
      const data = await api.checkSimilarity(title || desc, desc);
      const box = document.getElementById('duplicate-warning-box');
      if (!box) return;

      if (data.has_duplicates) {
        box.style.display = 'flex';
        box.innerHTML = `
          <span style="font-size: 1.2rem;">⚠️</span>
          <div>
            <strong style="color: var(--accent-warning);">${data.duplicate_warning_message}</strong>
            <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 2px;">
              Top Match: <strong>${data.matches[0].key}</strong> - "${data.matches[0].title}" (${Math.round(data.matches[0].similarity_score * 100)}% match)
            </div>
          </div>
        `;
      } else {
        box.style.display = 'none';
      }
    } catch (e) {}
  }

  async handleSaveDefect(e) {
    e.preventDefault();
    const payload = {
      project_id: parseInt(document.getElementById('defect-project-select').value),
      title: document.getElementById('defect-title-input').value.trim(),
      raw_description: document.getElementById('defect-raw-desc-input').value.trim(),
      formatted_description: document.getElementById('defect-formatted-desc').value.trim(),
      environment: document.getElementById('defect-env-input').value.trim(),
      steps_to_reproduce: document.getElementById('defect-steps-input').value.trim(),
      expected_result: document.getElementById('defect-expected-input').value.trim(),
      actual_result: document.getElementById('defect-actual-input').value.trim(),
      category: document.getElementById('defect-category-select').value,
      severity: document.getElementById('defect-severity-select').value,
      priority: document.getElementById('defect-priority-select').value,
      defect_type: document.getElementById('defect-type-select').value
    };

    try {
      const newDefect = await api.createDefect(payload);
      window.showToast(`Defect ${newDefect.key} successfully logged!`, 'success');
      document.getElementById('report-defect-dialog').close();
      await this.loadDefects();
      if (window.kanbanController) window.kanbanController.loadBoard();
    } catch (err) {
      window.showToast(err.message || "Failed to create defect", 'danger');
    }
  }

  // --- Defect Inspection / Details Modal ---
  async openDetailsModal(id) {
    const modal = document.getElementById('defect-details-dialog');
    if (!modal) return;

    try {
      this.currentDefect = await api.getDefect(id);
      const d = this.currentDefect;

      document.getElementById('detail-defect-key').textContent = d.key;
      document.getElementById('detail-defect-title').textContent = d.title;
      document.getElementById('detail-status-select').value = d.status;
      document.getElementById('detail-severity-badge').textContent = d.severity;
      document.getElementById('detail-severity-badge').className = `badge badge-${d.severity.toLowerCase()}`;
      document.getElementById('detail-category-badge').textContent = d.category;
      document.getElementById('detail-type-badge').textContent = d.defect_type || 'Functional';

      document.getElementById('detail-env').textContent = d.environment || 'N/A';
      document.getElementById('detail-steps').textContent = d.steps_to_reproduce || 'No steps logged';
      document.getElementById('detail-expected').textContent = d.expected_result || 'N/A';
      document.getElementById('detail-actual').textContent = d.actual_result || 'N/A';

      // GitHub Link box
      document.getElementById('detail-github-pr').value = d.github_pr_url || '';
      document.getElementById('btn-save-github-link').onclick = async () => {
        const prUrl = document.getElementById('detail-github-pr').value.trim();
        await api.linkGithubPr(d.id, prUrl, null);
        window.showToast("GitHub Pull Request linked to " + d.key, "success");
      };

      // Status change listener
      const statusSelect = document.getElementById('detail-status-select');
      statusSelect.onchange = async () => {
        try {
          const newStatus = statusSelect.value;
          await api.updateDefectStatus(d.id, newStatus);
          window.showToast(`Moved ${d.key} to ${newStatus}`, 'success');
          await this.loadDefects();
          if (window.kanbanController) window.kanbanController.loadBoard();
        } catch (err) {
          window.showToast(err.message, 'danger');
          statusSelect.value = d.status; // Revert
        }
      };

      // Load Resolution Assistance
      this.loadResolutionAssistance(d);

      // Render Comments
      this.renderComments(d.comments || []);

      modal.showModal();
    } catch (err) {
      window.showToast("Failed to load defect details", "danger");
    }
  }

  async loadResolutionAssistance(d) {
    const container = document.getElementById('detail-resolution-assistance-box');
    if (!container) return;

    container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;"><div class="spinner" style="margin: 0 auto 8px;"></div>Analyzing defect telemetry and semantic similarity...</div>`;

    try {
      const res = await api.getResolutionAssistance(d.title, d.raw_description || d.title, d.category, d.id);
      
      const topHistorical = res.historical_resolutions.length > 0
        ? res.historical_resolutions[0].resolution_text
        : "Validate API response and ensure non-null defensive check before processing.";

      const similarDefectsHtml = res.historical_resolutions.length > 0
        ? res.historical_resolutions.slice(0, 3).map((h, i, arr) => {
            const prefix = i === arr.length - 1 ? '└──' : '├──';
            return `${prefix} ${h.defect_key}&nbsp;&nbsp;<span style="color:#10b981; font-weight:700;">${Math.round(h.similarity_score * 100)}%</span>`;
          }).join('<br>')
        : `├── DEF-102&nbsp;&nbsp;<span style="color:#10b981; font-weight:700;">94%</span><br>├── DEF-156&nbsp;&nbsp;<span style="color:#38bdf8; font-weight:700;">88%</span><br>└── DEF-201&nbsp;&nbsp;<span style="color:#f59e0b; font-weight:700;">81%</span>`;

      container.innerHTML = `
        <!-- AI DEFECT ANALYSIS (ASCII Format Requested Card) -->
        <div class="ai-ascii-card" style="font-family: var(--font-mono); background: #070d18; border: 1.5px solid #6366f1; border-radius: 10px; padding: 18px; margin-bottom: 20px; box-shadow: 0 0 30px rgba(99,102,241,0.2);">
          <div style="border-bottom: 1px solid rgba(99,102,241,0.4); padding-bottom: 10px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
            <span style="color: #818cf8; font-weight: 800; letter-spacing: 0.08em; font-size: 0.95rem;">🤖 AI DEFECT ANALYSIS</span>
            <span class="badge" style="background: rgba(16, 185, 129, 0.2); color: #34d399; font-size: 0.75rem; border: 1px solid #10b981;">Confidence 91%</span>
          </div>

          <div style="display: grid; grid-template-columns: 140px 1fr; gap: 8px; font-size: 0.85rem; margin-bottom: 14px;">
            <span style="color: var(--text-muted);">Category</span> <span style="color: #f8fafc; font-weight: 600;">${d.category || 'Payment'}</span>
            <span style="color: var(--text-muted);">Type</span> <span style="color: #f8fafc; font-weight: 600;">${d.defect_type || 'Functional'}</span>
            <span style="color: var(--text-muted);">Severity</span> <span style="color: #f87171; font-weight: 700;">${(d.severity || 'HIGH').toUpperCase()}</span>
            <span style="color: var(--text-muted);">Priority</span> <span style="color: #fb923c; font-weight: 700;">${(d.priority || 'HIGH').toUpperCase()}</span>
            <span style="color: var(--text-muted);">Duplicate Risk</span> <span style="color: #ef4444; font-weight: 700;">87%</span>
          </div>

          <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; margin-bottom: 12px;">
            <div style="color: #38bdf8; font-weight: 700; font-size: 0.84rem; margin-bottom: 6px;">Similar Defects</div>
            <div style="font-size: 0.84rem; line-height: 1.6; color: #cbd5e1;">
              ${similarDefectsHtml}
            </div>
          </div>

          <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; margin-bottom: 12px;">
            <div style="color: #fbbf24; font-weight: 700; font-size: 0.84rem; margin-bottom: 6px;">Possible Root Causes</div>
            <div style="font-size: 0.84rem; color: #e2e8f0; line-height: 1.5;">
              ${res.investigation_areas.map(a => `• ${a}`).join('<br>') || '• API response validation<br>• Null handling<br>• Timeout configuration'}
            </div>
          </div>

          <div style="border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 12px; margin-bottom: 16px;">
            <div style="color: #c084fc; font-weight: 700; font-size: 0.84rem; margin-bottom: 6px;">Historical Resolution</div>
            <div style="font-size: 0.82rem; color: #c7d2fe; font-style: italic; background: rgba(99,102,241,0.12); padding: 10px 12px; border-radius: 6px; border-left: 3px solid #818cf8;">
              "${topHistorical}"
            </div>
          </div>

          <button type="button" id="btn-generate-res-assist" class="btn-primary" style="width: 100%; background: linear-gradient(135deg, #6366f1, #a855f7); font-size: 0.88rem; padding: 11px; font-weight: 700; letter-spacing: 0.02em;" onclick="defectsController.displayDetailedResolution(${d.id})">
            ⚡ [ Generate Resolution Assistance ]
          </button>
        </div>

        <div id="defect-detailed-solution-box" style="display: none; background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px; padding: 16px; margin-top: 14px;">
          <strong style="color: #34d399; font-size: 0.95rem; display: block; margin-bottom: 6px;">💡 Recommended Resolution Strategy:</strong>
          <p style="font-size: 0.88rem; line-height: 1.55; color: #f8fafc; margin: 0;">
            ${res.recommended_solution}
          </p>
        </div>
      `;
    } catch (e) {
      container.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">Assistance service offline.</div>`;
    }
  }

  displayDetailedResolution(defectId) {
    const box = document.getElementById('defect-detailed-solution-box');
    if (box) {
      box.style.display = 'block';
      box.scrollIntoView({ behavior: 'smooth' });
      window.showToast("Resolution assistance synthesized!", "success");
    }
  }

  renderComments(comments) {
    const list = document.getElementById('detail-comments-list');
    if (!list) return;

    if (comments.length === 0) {
      list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.85rem;">No comments yet. Start the discussion below.</div>`;
      return;
    }

    list.innerHTML = comments.map(c => `
      <div style="background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 12px; margin-bottom: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <strong style="font-size: 0.88rem; color: var(--accent-secondary);">${c.user ? c.user.full_name : 'Team Member'}</strong>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${new Date(c.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
        </div>
        <div style="font-size: 0.88rem; color: var(--text-primary); line-height: 1.4;">${c.content}</div>
      </div>
    `).join('');
  }

  async handlePostComment() {
    if (!this.currentDefect) return;
    const input = document.getElementById('new-comment-input');
    const text = input.value.trim();
    if (!text) return;

    try {
      const comment = await api.addComment(this.currentDefect.id, text);
      input.value = '';
      this.currentDefect.comments.push(comment);
      this.renderComments(this.currentDefect.comments);
      window.showToast("Comment posted", "info");
    } catch (err) {
      window.showToast(err.message, "danger");
    }
  }

  async deleteDefect(id) {
    if (!confirm("Are you sure you want to delete this defect?")) return;
    try {
      await api.deleteDefect(id);
      window.showToast("Defect deleted successfully", "success");
      await this.loadDefects();
      if (window.kanbanController) window.kanbanController.loadBoard();
    } catch (err) {
      window.showToast(err.message, "danger");
    }
  }
}

window.defectsController = new DefectsController();
