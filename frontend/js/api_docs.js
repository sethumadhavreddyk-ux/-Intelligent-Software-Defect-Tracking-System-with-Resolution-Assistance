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
    this.loadOpenApiSchema();
  }

  async loadOpenApiSchema() {
    const listEl = document.getElementById('api-endpoints-nav');
    if (listEl) listEl.textContent = 'Loading API operations...';

    try {
      const response = await fetch('/openapi.json');
      if (!response.ok) throw new Error(`OpenAPI request failed (${response.status})`);
      const spec = await response.json();
      const prefix = new URL(API_BASE).pathname.replace(/\/$/, '');
      this.endpoints = [];

      Object.entries(spec.paths || {}).forEach(([path, pathItem]) => {
        const inheritedParams = pathItem.parameters || [];
        ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].forEach(method => {
          const operation = pathItem[method];
          if (!operation) return;

          const parameters = new Map();
          [...inheritedParams, ...(operation.parameters || [])].forEach(parameter => {
            parameters.set(`${parameter.in}:${parameter.name}`, parameter);
          });

          const requestContent = operation.requestBody?.content || {};
          const mediaType = requestContent['application/json'] ? 'application/json' : Object.keys(requestContent)[0];
          const bodySchema = requestContent[mediaType]?.schema;
          const id = `${method.toUpperCase()} ${path}`;
          this.endpoints.push({
            id,
            category: (operation.tags || ['Other'])[0],
            method: method.toUpperCase(),
            path,
            requestBase: path.startsWith(prefix) ? API_BASE : window.location.origin,
            requestPath: path.startsWith(prefix) ? path.slice(prefix.length) || '/' : path,
            summary: operation.summary || operation.description || id,
            params: [...parameters.values()].map(parameter => ({
              name: parameter.name,
              in: parameter.in,
              type: parameter.schema?.type || 'string',
              required: Boolean(parameter.required),
              default: parameter.schema?.default ?? parameter.example ?? ''
            })),
            body: bodySchema ? this.exampleFromSchema(bodySchema, spec) : null,
            hasRequestBody: Boolean(operation.requestBody),
            mediaType
          });
        });
      });

      this.endpoints.sort((left, right) => left.path.localeCompare(right.path) || left.method.localeCompare(right.method));
      if (!this.endpoints.length) throw new Error('OpenAPI schema contains no operations');
      const selectedId = this.selectedEndpoint?.id;
      this.selectedEndpoint = this.endpoints.find(endpoint => endpoint.id === selectedId) || this.endpoints[0];
      this.renderSidebar();
      this.selectEndpoint(this.selectedEndpoint.id);
    } catch (error) {
      if (listEl) listEl.textContent = `Could not load API operations: ${error.message}`;
      window.showToast(`API Explorer failed to load: ${error.message}`, 'danger');
    }
  }

  exampleFromSchema(schema, spec, seen = new Set()) {
    if (!schema) return null;
    if (schema.$ref) {
      const name = schema.$ref.split('/').pop();
      if (seen.has(name)) return {};
      const resolved = spec.components?.schemas?.[name];
      return this.exampleFromSchema(resolved, spec, new Set([...seen, name]));
    }
    if (schema.example !== undefined) return schema.example;
    if (schema.enum?.length) return schema.enum[0];
    if (schema.default !== undefined) return schema.default;
    if (schema.anyOf || schema.oneOf) return this.exampleFromSchema((schema.anyOf || schema.oneOf)[0], spec, seen);
    if (schema.type === 'array') return [this.exampleFromSchema(schema.items, spec, seen)];
    if (schema.type === 'object' || schema.properties) {
      const required = new Set(schema.required || []);
      return Object.fromEntries(Object.entries(schema.properties || {})
        .filter(([name, property]) => required.has(name) || property.default !== undefined || property.enum)
        .map(([name, property]) => [name, this.exampleFromSchema(property, spec, seen)]));
    }
    if (schema.type === 'integer' || schema.type === 'number') return schema.minimum ?? 1;
    if (schema.type === 'boolean') return true;
    if (schema.format === 'email') return 'user@example.com';
    if (schema.format === 'date') return '2026-01-01';
    if (schema.format === 'date-time') return '2026-01-01T00:00:00Z';
    return schema.type === 'string' ? 'string' : null;
  }

  escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[character]);
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
          const methodColor = ep.method === 'GET' ? '#38bdf8' : (ep.method === 'DELETE' ? '#f87171' : (ep.method === 'POST' ? '#34d399' : '#f59e0b'));
          return `
            <div class="api-nav-endpoint ${ep.id === this.selectedEndpoint.id ? 'active' : ''}" data-endpoint-id="${ep.id}" style="display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; cursor: pointer; font-size: 0.82rem;">
              <span style="font-weight: 800; font-size: 0.7rem; color: ${methodColor}; width: 38px;">${ep.method}</span>
              <span style="font-family: var(--font-mono); color: #cbd5e1; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${this.escapeHTML(ep.requestPath)}</span>
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
      const methodColor = ep.method === 'GET' ? '#38bdf8' : (ep.method === 'DELETE' ? '#f87171' : (ep.method === 'POST' ? '#34d399' : '#fbbf24'));
      methodBadge.style.background = `${methodColor}33`;
      methodBadge.style.color = methodColor;
    }

    if (pathEl) pathEl.textContent = ep.path;
    if (summaryEl) summaryEl.textContent = ep.summary;

    if (paramsList) {
      if (ep.params && ep.params.length > 0) {
        paramsList.innerHTML = ep.params.map(p => `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 0.84rem;">
            <div>
              <strong style="color: #f8fafc; font-family: var(--font-mono);">${p.name}</strong>
              <span style="color: var(--text-muted); font-size: 0.76rem; margin-left: 6px;">(${p.in}: ${p.type})</span>
              ${p.required ? '<span style="color: #ef4444; font-size: 0.72rem; margin-left: 4px;">required</span>' : ''}
            </div>
            <input type="text" class="form-control" style="width: 200px; height: 32px; font-size: 0.8rem;" value="${this.escapeHTML(p.default)}" data-param-name="${this.escapeHTML(p.name)}" data-param-in="${this.escapeHTML(p.in)}" ${p.required ? 'required' : ''}>
          </div>
        `).join('');
      } else {
        paramsList.innerHTML = `<div style="color: var(--text-muted); font-size: 0.82rem; padding: 6px 0;">No query or path parameters required.</div>`;
      }
    }

    if (bodyBox) {
      if (ep.hasRequestBody) {
        bodyBox.style.display = 'block';
        const bodyWrap = document.getElementById('api-doc-body-wrap');
        if (bodyWrap) bodyWrap.style.display = 'block';
        bodyBox.value = JSON.stringify(ep.body ?? {}, null, 2);
        bodyBox.dataset.mediaType = ep.mediaType || 'application/json';
      } else {
        bodyBox.style.display = 'none';
        const bodyWrap = document.getElementById('api-doc-body-wrap');
        if (bodyWrap) bodyWrap.style.display = 'none';
      }
    }

    if (responseBox) {
      responseBox.textContent = `// Click "Try It Out" to execute ${ep.method} ${ep.path}`;
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
      let finalPath = ep.requestPath;
      const paramInputs = document.querySelectorAll('#api-doc-params-list input');
      const queryParams = new URLSearchParams();
      const headerParams = {};

      paramInputs.forEach(inp => {
        const name = inp.dataset.paramName;
        const parameterIn = inp.dataset.paramIn;
        const val = inp.value.trim();
        if (parameterIn === 'path') {
          if (!val) throw new Error(`Required path parameter "${name}" is empty`);
          finalPath = finalPath.replace(`{${name}}`, encodeURIComponent(val));
        } else if (parameterIn === 'query' && val) {
          queryParams.append(name, val);
        } else if (parameterIn === 'header' && val) {
          headerParams[name] = val;
        }
      });

      const qString = queryParams.toString();
      const endpointWithQuery = qString ? `${finalPath}?${qString}` : finalPath;

      let bodyData;
      let contentType = ep.mediaType || 'application/json';
      if (ep.hasRequestBody) {
        const bodyText = document.getElementById('api-doc-body-input')?.value || '{}';
        try {
          bodyData = JSON.parse(bodyText);
        } catch (e) {
          throw new Error("Invalid JSON in request body");
        }
        if (contentType === 'application/x-www-form-urlencoded') {
          bodyData = new URLSearchParams(bodyData);
        } else if (contentType === 'multipart/form-data') {
          const formData = new FormData();
          Object.entries(bodyData).forEach(([key, value]) => formData.append(key, value));
          bodyData = formData;
          contentType = null;
        }
      }

      const headers = { ...headerParams };
      if (contentType) headers['Content-Type'] = contentType;
      if (api.token) headers.Authorization = `Bearer ${api.token}`;
      const response = await fetch(`${ep.requestBase}${endpointWithQuery}`, {
        method: ep.method,
        headers,
        body: bodyData === undefined ? undefined : (bodyData instanceof FormData || bodyData instanceof URLSearchParams ? bodyData : JSON.stringify(bodyData))
      });

      const latency = Math.round(performance.now() - startTime);
      const responseText = await response.text();
      let responseData = responseText;
      try {
        responseData = responseText ? JSON.parse(responseText) : null;
      } catch (e) {
        responseData = responseText;
      }

      if (statusBadge) {
        statusBadge.style.display = 'inline-block';
        statusBadge.textContent = `${response.status} ${response.statusText}`;
        statusBadge.style.background = response.ok ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)';
        statusBadge.style.color = response.ok ? '#34d399' : '#f87171';
      }

      if (latencyEl) {
        latencyEl.textContent = `${latency}ms`;
      }

      responseBox.textContent = typeof responseData === 'string' ? responseData : JSON.stringify(responseData, null, 2);
      window.showToast(`${response.status} ${response.statusText} (${latency}ms): ${ep.path}`, response.ok ? 'success' : 'warning');

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
