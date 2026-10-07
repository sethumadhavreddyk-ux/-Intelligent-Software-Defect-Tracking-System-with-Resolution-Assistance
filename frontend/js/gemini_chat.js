// ==========================================================================
// ASK GEMINI AI CHATBOT CONTROLLER
// Context-Aware Embedded Assistant with Action Items, Voice Input & Media Uploads
// ==========================================================================

class GeminiChatController {
  constructor() {
    this.isOpen = false;
    this.attachments = [];
    this.isListening = false;
    this.recognition = null;
    this.initEventListeners();
    this.initVoiceAssistant();
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
        const input = document.getElementById('gemini-chat-input');
        if (input) {
          input.value = text;
          this.sendMessage();
        }
      });
    });

    // Media / File Upload '+' Button
    const attachBtn = document.getElementById('btn-gemini-chat-attach');
    const fileInput = document.getElementById('gemini-chat-file-input');
    if (attachBtn && fileInput) {
      attachBtn.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }

    // Voice Assistant Mic Button
    const micBtn = document.getElementById('btn-gemini-chat-mic');
    if (micBtn) {
      micBtn.addEventListener('click', () => this.toggleVoiceAssistant());
    }
  }

  // --- Voice Assistant Feature for Gemini Chat ---
  initVoiceAssistant() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
          this.isListening = true;
          this.updateMicUI(true);
          window.showToast?.('🎙️ Gemini Voice Assistant listening...', 'info');
        };

        this.recognition.onresult = (event) => {
          let transcript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          const input = document.getElementById('gemini-chat-input');
          if (input) {
            input.value = transcript;
          }
        };

        this.recognition.onerror = (event) => {
          console.warn('[Gemini Voice] Recognition error:', event.error);
          this.stopVoiceAssistant();
        };

        this.recognition.onend = () => {
          this.stopVoiceAssistant();
        };
      } catch (err) {
        console.warn('SpeechRecognition initialization error:', err);
      }
    }
  }

  toggleVoiceAssistant() {
    if (this.isListening) {
      this.stopVoiceAssistant();
    } else {
      this.startVoiceAssistant();
    }
  }

  startVoiceAssistant() {
    if (this.recognition) {
      try {
        this.recognition.start();
        return;
      } catch (err) {
        console.warn('Voice restart fallback:', err);
      }
    }

    // Fallback simulation if speech recognition is not permitted or unsupported
    this.isListening = true;
    this.updateMicUI(true);
    window.showToast?.('🎙️ Voice Assistant listening (Simulated Speech Mode)...', 'info');

    const sampleQueries = [
      "Analyze the root cause for the latest database connection timeout",
      "Check sprint 5 risk status and recommended code resolution",
      "How to fix null pointer exception in authentication controller?",
      "Suggest unit test cases for the defect triage workflow"
    ];
    const picked = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    const input = document.getElementById('gemini-chat-input');

    let i = 0;
    if (input) input.value = '';
    const interval = setInterval(() => {
      if (!this.isListening || i >= picked.length) {
        clearInterval(interval);
        this.stopVoiceAssistant();
        return;
      }
      if (input) input.value += picked[i];
      i++;
    }, 45);
  }

  stopVoiceAssistant() {
    this.isListening = false;
    this.updateMicUI(false);
    if (this.recognition) {
      try { this.recognition.stop(); } catch (e) {}
    }
  }

  updateMicUI(listening) {
    const micBtn = document.getElementById('btn-gemini-chat-mic');
    const micIcon = document.getElementById('gemini-mic-icon');
    if (!micBtn) return;

    if (listening) {
      micBtn.classList.add('listening');
      if (micIcon) micIcon.textContent = '🛑';
    } else {
      micBtn.classList.remove('listening');
      if (micIcon) micIcon.textContent = '🎙️';
    }
  }

  // --- Media & File Upload '+' Handling ---
  handleFileSelect(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.forEach(file => {
      const reader = new FileReader();
      const isImg = file.type.startsWith('image/');

      reader.onload = (e) => {
        this.attachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          isImage: isImg,
          dataUrl: e.target.result
        });
        this.renderAttachmentsBar();
      };

      if (isImg) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file.slice(0, 4096)); // read first 4KB snippet if code/text
        this.attachments.push({
          name: file.name,
          type: file.type,
          size: file.size,
          isImage: false,
          dataUrl: null
        });
        this.renderAttachmentsBar();
      }
    });

    event.target.value = ''; // reset file input
  }

  removeAttachment(index) {
    this.attachments.splice(index, 1);
    this.renderAttachmentsBar();
  }

  renderAttachmentsBar() {
    const bar = document.getElementById('gemini-chat-attachments-bar');
    if (!bar) return;

    if (this.attachments.length === 0) {
      bar.style.display = 'none';
      bar.innerHTML = '';
      return;
    }

    bar.style.display = 'flex';
    bar.innerHTML = this.attachments.map((att, idx) => `
      <div class="gemini-attach-chip">
        ${att.isImage ? `<img src="${att.dataUrl}" class="attach-thumb" alt="${att.name}">` : '📄'}
        <span style="max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${att.name}</span>
        <button type="button" class="attach-remove" onclick="geminiChatController.removeAttachment(${idx})">&times;</button>
      </div>
    `).join('');
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
    const prompt = input ? input.value.trim() : '';
    const currentAttachments = [...this.attachments];

    if (!prompt && currentAttachments.length === 0) return;

    if (input) input.value = '';
    this.attachments = [];
    this.renderAttachmentsBar();

    const messagesContainer = document.getElementById('gemini-chat-messages');
    if (!messagesContainer) return;

    // Build user message HTML including any attached media/files
    let attachmentsHtml = '';
    if (currentAttachments.length > 0) {
      const images = currentAttachments.filter(a => a.isImage);
      const docs = currentAttachments.filter(a => !a.isImage);

      attachmentsHtml = `
        <div class="chat-bubble-media">
          ${images.map(img => `<img src="${img.dataUrl}" alt="${img.name}" title="${img.name}">`).join('')}
          ${docs.map(doc => `<span class="chat-bubble-file">📎 ${doc.name} (${(doc.size / 1024).toFixed(1)} KB)</span>`).join('')}
        </div>
      `;
    }

    // Add user bubble
    messagesContainer.innerHTML += `
      <div class="chat-bubble user">
        <div>${prompt || '<em>Shared media / file attachment:</em>'}</div>
        ${attachmentsHtml}
      </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    // Add typing placeholder
    const typingId = `typing-${Date.now()}`;
    messagesContainer.innerHTML += `
      <div class="chat-bubble bot" id="${typingId}">
        <span style="display: inline-block; animation: pulse 1s infinite;">✨ Gemini analyzing context & attachments...</span>
      </div>
    `;
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    try {
      const activeDefectId = window.defectsController?.currentDefect?.id || null;
      let effectivePrompt = prompt;
      if (currentAttachments.length > 0) {
        const attNames = currentAttachments.map(a => a.name).join(', ');
        effectivePrompt += ` [User attached: ${attNames}]`;
      }

      const res = await api.askGemini(effectivePrompt, activeDefectId, 1);

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
          <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
            <span>Sources: ${res.sources_cited ? res.sources_cited.join(', ') : 'Knowledge Base'}</span>
            <button type="button" class="btn-icon" style="font-size: 0.75rem; padding: 2px 6px; cursor: pointer; color: var(--accent-secondary); background: none; border: none;" onclick="geminiChatController.speakAnswer(this)" data-speech="${res.response.replace(/"/g, '&quot;').slice(0, 300)}">
              🔊 Read Aloud
            </button>
          </div>
        `;
      }
    } catch (err) {
      const typingEl = document.getElementById(typingId);
      if (typingEl) typingEl.textContent = `Error: ${err.message || 'Assistant request failed'}`;
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  speakAnswer(btn) {
    if (!window.speechSynthesis) return;
    const text = btn.getAttribute('data-speech');
    if (!text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;
    btn.textContent = '🔊 Reading...';
    utterance.onend = () => {
      btn.textContent = '🔊 Read Aloud';
    };
    window.speechSynthesis.speak(utterance);
  }
}

const geminiChatController = new GeminiChatController();
window.geminiChatController = geminiChatController;
