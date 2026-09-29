// ==========================================================================
// BUGLOW INTERACTIVE API & SWAGGER EXPLORER CONTROLLER
// Embedded REST API Documentation with Live 'Try It Out' Test Runner
// ==========================================================================

class ApiDocsController {
  constructor() {
    this.endpoints = [
      {
        id: 'auth-login',
        category: 'Authentication',
        method: 'POST',
        path: '/auth/login',
        summary: 'Authenticate user & issue JWT bearer token',
        params: [
          { name: 'username_or_email', type: 'string', required: true, default: 'madhav' },
          { name: 'password', type: 'string', required: true, default: 'Dev@123' }
        ],
        body: { username_or_email: 'madhav', password: 'Dev@123' }
      },
      {
        id: 'auth-face',
        category: 'Authentication',
        method: 'POST',
        path: '/auth/face-auth',
        summary: 'Biometric face authentication with confidence scoring',
        params: [
          { name: 'email_or_username', type: 'string', required: true, default: 'madhav' },
          { name: 'confidence', type: 'number', required: true, default: 0.98 }
        ],
        body: { email_or_username: 'madhav', face_detected: true, confidence: 0.98 }
      },
      {
        id: 'defects-list',
        category: 'Defects',
        method: 'GET',
        path: '/defects/',
        summary: 'Query all repository defects with filters',
        params: [
          { name: 'status', type: 'string', required: false, default: '' },
          { name: 'severity', type: 'string', required: false, default: '' }
        ]
      },
      {
        id: 'defects-create',
        category: 'Defects',
        method: 'POST',
        path: '/defects/',
        summary: 'Report a new defect into the lifecycle state machine',
        params: [],
        body: {
          title: "Payment confirmation modal unresponsive on submit",
          raw_description: "Clicking submit payment freezes button state without confirmation dialog.",
          project_id: 1,
          severity: "Critical",
          priority: "High",
          category: "Payment",
          defect_type: "Functional Defect"
        }
      },
      {
        id: 'intel-similarity',
        category: 'Intelligence',
        method: 'POST',
        path: '/intelligence/similarity',
        summary: 'Vector similarity search & duplicate detection',
        params: [],
        body: {
          title: "Payment crash on checkout submit",
          description: "User clicks submit payment, application crashes with unhandled null error."
        }
      },
      {
        id: 'intel-rca',
        category: 'Intelligence',
        method: 'POST',
        path: '/intelligence/rca/1',
        summary: 'Synthesize Root Cause Analysis & remediation guidance',
        params: [{ name: 'defect_id', type: 'integer', required: true, default: 1 }],
        body: { logs: "TypeError: Cannot read properties of undefined (reading 'transactionId')" }
      },
      {
        id: 'analytics-dash',
        category: 'Analytics',
        method: 'GET',
        path: '/analytics/dashboard',
        summary: 'Retrieve 6-metric KPIs, defect velocity, and distribution',
        params: []
      },
      {
        id: 'sprints-health',
        category: 'Sprints',
        method: 'GET',
        path: '/sprints/1/health-score',
        summary: 'Evaluate dynamic sprint health score & risk mitigation',
        params: [{ name: 'sprint_id', type: 'integer', required: true, default: 1 }]
      },
      {
        id: 'assistant-chat',
        category: 'AI Assistant',
        method: 'POST',
        path: '/assistant/chat',
        summary: 'Contextual defect query chatbot grounded in repository',
        params: [],
        body: { message: "Why is DEF-101 failing?" }
      }
    ];

    this.selectedEndpoint = this.endpoints[0];
    this.initEventListeners();
  }

  initEventListeners() {
    // Select endpoint click listener
    document.addEventListener('click', (e) => {
      const item = e.target.closest('.api-nav-endpoint');
      if (item) {
        const id = item.dataset.endpointId;
        this.selectEndpoint(id);
      }
    });

    const tryBtn = document.getElementById('btn-api-try-it-out');
    if (tryBtn) {
      tryBtn.addEventListener('click', () => this.executeSelectedEndpoint());
    }
  }

  loadApiDocs() {
    this.renderSidebar();
    this.selectEndpoint(this.selectedEndpoint.id);
  }

  renderSidebar() {
    const listEl = document.getElementById('api-endpoints-nav');
    if (!listEl) return;

    // Group by category
    const categories = {};
    this.endpoints.forEach(ep => {
      if (!categories[ep.category]) categories[ep.category] = [];
      categories[ep.category].push(ep);
    });

    listEl.innerHTML = Object.entries(categories).map(([cat, list]) => `
      <div class="api-nav-group" style="margin-bottom: 14px;">
        <div style="font-size: 0.72rem; text-transform: uppercase; color: var(--text-muted); font-weight: 700; padding: 4px 10px; letter-spacing: 0.05em;">
          ${cat} (${list.length})
        </div>
        ${list.map(ep => {
          const methodColor = ep.method === 'GET' ? '#38bdf8' : (ep.method === 'POST' ? '#34d399' : '#f59e0b');
          return `
            <div class="api-nav-endpoint ${ep.id === this.selectedEndpoint.id ? 'active' : ''}" data-endpoint-id="${ep.id}" style="display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; cursor: pointer; font-size: 0.82rem;">
              <span style="font-weight: 800; font-size: 0.7rem; color: ${methodColor}; width: 38px;">${ep.method}</span>
              <span style="font-family: var(--font-mono); color: #cbd5e1; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${ep.path}</span>
            </div>
          `;
        }).join('')}
      </div>
    `).join('');
  }

  selectEndpoint(id) {
    const ep = this.endpoints.find(e => e.id === id);
    if (!ep) return;
    this.selectedEndpoint = ep;

    // Update active highlight
    document.querySelectorAll('.api-nav-endpoint').forEach(el => {
      el.classList.toggle('active', el.dataset.endpointId === id);
    });

    // Populate inspector
    const methodBadge = document.getElementById('api-doc-method');
    const pathEl = document.getElementById('api-doc-path');
    const summaryEl = document.getElementById('api-doc-summary');
    const paramsList = document.getElementById('api-doc-params-list');
    const bodyBox = document.getElementById('api-doc-body-input');
    const responseBox = document.getElementById('api-doc-response-preview');
    const statusBadge = document.getElementById('api-doc-status-badge');

    if (methodBadge) {
      methodBadge.textContent = ep.method;
      methodBadge.className = `badge badge-${ep.method.toLowerCase()}`;
      methodBadge.style.background = ep.method === 'GET' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(52, 211, 153, 0.2)';
      methodBadge.style.color = ep.method === 'GET' ? '#38bdf8' : '#34d399';
    }

    if (pathEl) pathEl.textContent = `/api/v1${ep.path}`;
    if (summaryEl) summaryEl.textContent = ep.summary;

    if (paramsList) {
      if (ep.params && ep.params.length > 0) {
        paramsList.innerHTML = ep.params.map(p => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.84rem;">
            <div>
              <strong style="color: #f8fafc; font-family: var(--font-mono);">${p.name}</strong>
              <span style="color: var(--text-muted); font-size: 0.76rem; margin-left: 6px;">(${p.type})</span>
              ${p.required ? '<span style="color: #ef4444; font-size: 0.72rem; margin-left: 4px;">required</span>' : ''}
            </div>
            <input type="text" class="form-control" style="width: 200px; height: 32px; font-size: 0.8rem;" value="${p.default || ''}" data-param-name="${p.name}">
          </div>
        `).join('');
      } else {
        paramsList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 6px 0;">No query or path parameters required.</div>`;
      }
    }

    if (bodyBox) {
      if (ep.body) {
        bodyBox.style.display = 'block';
        document.getElementById('api-doc-body-wrap').style.display = 'block';
        bodyBox.value = JSON.stringify(ep.body, null, 2);
      } else {
        document.getElementById('api-doc-body-wrap').style.display = 'none';
      }
    }

    if (responseBox) {
      responseBox.textContent = `// Click "Try It Out" to execute live request against /api/v1${ep.path}`;
    }

    if (statusBadge) {
      statusBadge.style.display = 'none';
    }
  }

  async executeSelectedEndpoint() {
    const ep = this.selectedEndpoint;
    const responseBox = document.getElementById('api-doc-response-preview');
    const statusBadge = document.getElementById('api-doc-status-badge');
    const latencyEl = document.getElementById('api-doc-latency');

    if (!responseBox) return;
    responseBox.textContent = 'Sending request to backend...';

    const startTime = performance.now();

    try {
      let finalPath = ep.path;
      // Handle path param replacements if any
      const paramInputs = document.querySelectorAll('#api-doc-params-list input');
      const queryParams = new URLSearchParams();

      paramInputs.forEach(inp => {
        const name = inp.dataset.paramName;
        const val = inp.value.trim();
        if (finalPath.includes(`{${name}}`)) {
          finalPath = finalPath.replace(`{${name}}`, encodeURIComponent(val));
        } else if (val && ep.method === 'GET') {
          queryParams.append(name, val);
        }
      });

      const qString = queryParams.toString();
      const endpointWithQuery = qString ? `${finalPath}?${qString}` : finalPath;

      let bodyData = null;
      if (ep.body && ['POST', 'PUT', 'PATCH'].includes(ep.method)) {
        const bodyText = document.getElementById('api-doc-body-input')?.value || '{}';
        try {
          bodyData = JSON.parse(bodyText);
        } catch (e) {
          throw new Error("Invalid JSON in request body");
        }
      }

      const res = await api.request(endpointWithQuery, {
        method: ep.method,
        body: bodyData ? JSON.stringify(bodyData) : undefined
      });

      const latency = Math.round(performance.now() - startTime);

      if (statusBadge) {
        statusBadge.style.display = 'inline-block';
        statusBadge.textContent = '200 OK';
        statusBadge.style.background = 'rgba(16, 185, 129, 0.2)';
        statusBadge.style.color = '#34d399';
      }

      if (latencyEl) {
        latencyEl.textContent = `${latency}ms`;
      }

      responseBox.textContent = JSON.stringify(res, null, 2);
      window.showToast(`200 OK (${latency}ms): ${ep.path}`, 'success');

    } catch (err) {
      const latency = Math.round(performance.now() - startTime);
      if (statusBadge) {
        statusBadge.style.display = 'inline-block';
        statusBadge.textContent = 'Error';
        statusBadge.style.background = 'rgba(239, 68, 68, 0.2)';
        statusBadge.style.color = '#f87171';
      }
      responseBox.textContent = JSON.stringify({ error: err.message || 'Request failed' }, null, 2);
      window.showToast(`Request error: ${err.message}`, 'danger');
    }
  }
}

window.apiDocsController = new ApiDocsController();
