// ==========================================================================
// API CLIENT & DATA REPOSITORY
// Handles JWT authentication, HTTP requests, error toasts, and local fallback
// ==========================================================================

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? `${window.location.origin}/api/v1`
  : 'https://intelligent-software-defect-tracking.onrender.com/api/v1';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('token') || null;
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  }

  setSession(token, user) {
    this.token = token;
    this.currentUser = user;
    localStorage.setItem('token', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
  }

  clearSession() {
    this.token = null;
    this.currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('currentUser');
  }

  isAuthenticated() {
    return !!this.token;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        // Session expired
        if (!options.isAuthAttempt) {
          this.clearSession();
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Authentication required');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.warn(`[API] ${endpoint} fetch issue:`, err.message);
      throw err;
    }
  }

  // --- Auth APIs ---
  async login(username_or_email, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username_or_email, password }),
      isAuthAttempt: true
    });
  }

  async register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
      isAuthAttempt: true
    });
  }

  async forgotPassword(email) {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email })
    });
  }

  async verifyOtp(email, otp) {
    return this.request('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  }

  async resetPassword(email, otp, new_password) {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp, new_password })
    });
  }

  async faceAuth(email_or_username, confidence = 0.95) {
    return this.request('/auth/face-auth', {
      method: 'POST',
      body: JSON.stringify({ email_or_username, face_detected: true, confidence })
    });
  }

  // --- Defects APIs ---
  async getDefects(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/defects${query ? '?' + query : ''}`);
  }

  async getDefect(id) {
    return this.request(`/defects/${id}`);
  }

  async createDefect(data) {
    return this.request('/defects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateDefect(id, data) {
    return this.request(`/defects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async updateDefectStatus(id, status, comment = null, root_cause = null, resolution_summary = null) {
    return this.request(`/defects/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, comment, root_cause, resolution_summary })
    });
  }

  async deleteDefect(id) {
    return this.request(`/defects/${id}`, { method: 'DELETE' });
  }

  async addComment(defectId, content) {
    return this.request(`/defects/${defectId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
  }

  // --- Sprints APIs ---
  async getSprints(projectId = null) {
    const query = projectId ? `?project_id=${projectId}` : '';
    return this.request(`/sprints${query}`);
  }

  async createSprint(data) {
    return this.request('/sprints', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateSprint(id, data) {
    return this.request(`/sprints/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteSprint(id) {
    return this.request(`/sprints/${id}`, { method: 'DELETE' });
  }

  async getSprintHealth(id) {
    return this.request(`/sprints/${id}/health`);
  }

  // --- Teams APIs ---
  async getTeams() {
    return this.request('/teams');
  }

  async createTeam(data) {
    return this.request('/teams', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateTeam(id, data) {
    return this.request(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async deleteTeam(id) {
    return this.request(`/teams/${id}`, { method: 'DELETE' });
  }

  async addTeamMember(teamId, userId, role = 'Member') {
    return this.request(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, role_in_team: role })
    });
  }

  async removeTeamMember(teamId, userId) {
    return this.request(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' });
  }

  // --- Projects APIs ---
  async getProjects() {
    return this.request('/projects');
  }

  async createProject(data) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Intelligence APIs ---
  async aiFormatReport(raw_text) {
    return this.request('/intelligence/format-report', {
      method: 'POST',
      body: JSON.stringify({ raw_text })
    });
  }

  async aiClassify(title, description) {
    return this.request('/intelligence/classify', {
      method: 'POST',
      body: JSON.stringify({ title, description })
    });
  }

  async checkSimilarity(title, description = '') {
    const params = new URLSearchParams({ title, description }).toString();
    return this.request(`/intelligence/similar?${params}`, {
      method: 'POST'
    });
  }

  async getResolutionAssistance(title, description, category = null, defect_id = null) {
    return this.request('/intelligence/resolution-assist', {
      method: 'POST',
      body: JSON.stringify({ title, description, category, defect_id })
    });
  }

  async getRootCauseAnalysis(defect_id, logs = '') {
    return this.request('/intelligence/root-cause-analysis', {
      method: 'POST',
      body: JSON.stringify({ defect_id, logs_or_context: logs })
    });
  }

  async getHistoricalResolutions(q = '', category = '') {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    return this.request(`/intelligence/historical-resolutions?${params.toString()}`);
  }

  // --- Ask Gemini Assistant ---
  async askGemini(prompt, defect_id = null, sprint_id = null) {
    return this.request('/assistant/chat', {
      method: 'POST',
      body: JSON.stringify({ prompt, defect_id, sprint_id })
    });
  }

  // --- Analytics & Summary ---
  async getDashboardSummary() {
    return this.request('/analytics/dashboard');
  }

  // --- Notifications & Activity ---
  async getNotifications() {
    return this.request('/notifications');
  }

  async markNotificationRead(id) {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request('/notifications/mark-all-read', { method: 'PATCH' });
  }

  async getActivityFeed(defect_id = null) {
    const query = defect_id ? `?defect_id=${defect_id}` : '';
    return this.request(`/audit/activity${query}`);
  }

  // --- Users & Developers ---
  async getUsers() {
    return this.request('/users');
  }

  async getDevelopers() {
    return this.request('/users/developers');
  }

  // --- Integrations ---
  async linkGithubPr(defect_id, pr_url, commit_hash) {
    return this.request('/integrations/github/link', {
      method: 'POST',
      body: JSON.stringify({ defect_id, pr_url, commit_hash })
    });
  }

  async triggerSlackAlert(message, channel = '#defects-alerts', defect_id = null) {
    return this.request('/integrations/slack/alert', {
      method: 'POST',
      body: JSON.stringify({ message, channel, defect_id })
    });
  }

  async triggerTeamsAlert(message, channel = 'General', defect_id = null) {
    return this.request('/integrations/teams/alert', {
      method: 'POST',
      body: JSON.stringify({ message, channel, defect_id })
    });
  }

  async syncJiraIssue(jira_key, defect_id = null, sync_direction = 'TWO_WAY') {
    return this.request('/integrations/jira/sync', {
      method: 'POST',
      body: JSON.stringify({ jira_key, defect_id, sync_direction })
    });
  }

  async getIntegrationLogs() {
    return this.request('/integrations/logs');
  }

  // --- QR Authentication ---
  async generateQRCode() {
    return this.request('/auth/qr/generate', { method: 'POST' });
  }

  async authenticateQRCode(qr_token, username_or_email = 'madhav@bugflow.io') {
    return this.request('/auth/qr/authenticate', {
      method: 'POST',
      body: JSON.stringify({ qr_token, username_or_email })
    });
  }

  async checkQRCodeStatus(qr_token) {
    return this.request(`/auth/qr/status/${qr_token}`);
  }

  // --- Roles & User Administration ---
  async getRolePermissionsMatrix() {
    return this.request('/users/roles/matrix');
  }

  async assignUserRole(user_id, role) {
    return this.request(`/users/${user_id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role })
    });
  }

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  // --- Defect Attachments ---
  async getDefectAttachments(defect_id) {
    return this.request(`/defects/${defect_id}/attachments`);
  }

  async addDefectAttachment(defect_id, data) {
    return this.request(`/defects/${defect_id}/attachments`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async deleteDefectAttachment(defect_id, attachment_id) {
    return this.request(`/defects/${defect_id}/attachments/${attachment_id}`, {
      method: 'DELETE'
    });
  }

  // --- RAG Knowledge Base ---
  async getRAGStats() {
    return this.request('/rag/stats');
  }

  async getRAGDocuments(category = null, q = null) {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (q) params.set('q', q);
    return this.request(`/rag/documents${params.toString() ? '?' + params.toString() : ''}`);
  }

  async getRAGDocument(id) {
    return this.request(`/rag/documents/${id}`);
  }

  async ingestRAGDocument(docData) {
    return this.request('/rag/documents', {
      method: 'POST',
      body: JSON.stringify(docData)
    });
  }

  async deleteRAGDocument(id) {
    return this.request(`/rag/documents/${id}`, {
      method: 'DELETE'
    });
  }

  async searchRAG(query, category = null, top_k = 5) {
    return this.request('/rag/search', {
      method: 'POST',
      body: JSON.stringify({ query, category, top_k })
    });
  }

  async queryRAG(query) {
    return this.request('/rag/query', {
      method: 'POST',
      body: JSON.stringify({ query })
    });
  }

  // --- Quality, Testing & CI/CD ---
  async getTestSuites() {
    return this.request('/testing/suites');
  }

  async runTestSuites() {
    return this.request('/testing/run', { method: 'POST' });
  }

  async getCICDPipelines() {
    return this.request('/testing/cicd');
  }
}

const api = new ApiClient();
window.api = api;

