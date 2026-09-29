// ==========================================================================
// ASK GEMINI AI CHATBOT CONTROLLER
// Context-Aware Embedded Assistant with Action Items and Debugging Suggestions
// ==========================================================================

class GeminiChatController {
  constructor() {
    this.isOpen = false;
    this.initEventListeners();
  }

  initEventListeners() {
    // Toggle Chat Drawer button in Top Navbar
    const toggleBtn = document.getElementById('btn-toggle-gemini-chat');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => this.toggleChat());
    }

    const closeBtn = document.getElementById('btn-close-gemini-chat');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeChat());
    }

    // Chat submit form
    const form = document.getElementById('gemini-chat-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.sendMessage();
      });
    }

    // Pre-made quick chips
    document.querySelectorAll('.quick-prompt-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const text = e.target.textContent.trim().replace(/^['"]|['"]$/g, '');
        document.getElementById('gemini-chat-input').value = text;
        this.sendMessage();
      });
    });
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
    const drawer = document.getElementById('gemini-chat-drawer');
    if (drawer) {
      drawer.classList.toggle('open', this.isOpen);
      if (this.isOpen) {
        document.getElementById('gemini-chat-input')?.focus();
      }
    }
  }

  openChat() {
    this.isOpen = true;
    const drawer = document.getElementById('gemini-chat-drawer');
    if (drawer) drawer.classList.add('open');
  }

  closeChat() {
    this.isOpen = false;
    const drawer = document.getElementById('gemini-chat-drawer');
    if (drawer) drawer.classList.remove('open');
  }

  async sendMessage() {
    const input = document.getElementById('gemini-chat-input');
    const prompt = input.value.trim();
    if (!prompt) return;

    input.value = '';
    const messagesContainer = document.getElementById('gemini-chat-messages');

    // Add user bubble
    messagesContainer.innerHTML += `
      <div class="chat-bubble user">
        ${prompt}
      </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add typing placeholder
    const typingId = `typing-${Date.now()}`;
    messagesContainer.innerHTML += `
      <div class="chat-bubble bot" id="${typingId}">
        <span style="display: inline-block; animation: pulse 1s infinite;">Gemini analyzing context...</span>
      </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const activeDefectId = window.defectsController?.currentDefect?.id || null;
      const res = await api.askGemini(prompt, activeDefectId, 1);

      const typingEl = document.getElementById(typingId);
      if (typingEl) {
        // Format markdown text roughly to HTML
        let formatted = res.response
          .replace(/### (.*?)\n/g, '<h4 style="font-size: 0.95rem; font-weight: 700; margin: 8px 0 4px; color: var(--accent-secondary);">$1</h4>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.3); padding: 2px 4px; border-radius: 4px; font-family: var(--font-mono); font-size: 0.8rem;">$1</code>')
          .replace(/\n\n/g, '<br><br>')
          .replace(/\n- /g, '<br>&bull; ');

        let actionsHtml = '';
        if (res.action_items && res.action_items.length > 0) {
          actionsHtml = `
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid var(--border-color);">
              <strong style="font-size: 0.78rem; text-transform: uppercase; color: var(--accent-success);">Action Items:</strong>
              <ul style="padding-left: 14px; font-size: 0.8rem; margin-top: 4px; color: var(--text-secondary);">
                ${res.action_items.map(a => `<li>${a}</li>`).join('')}
              </ul>
            </div>
          `;
        }

        typingEl.innerHTML = `
          <div>${formatted}</div>
          ${actionsHtml}
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px;">
            Sources: ${res.sources_cited ? res.sources_cited.join(', ') : 'Knowledge Base'}
          </div>
        `;
      }
    } catch (err) {
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.textContent = `Error: ${err.message || 'Assistant request failed'}`;
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

window.geminiChatController = new GeminiChatController();
