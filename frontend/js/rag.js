// ==========================================================================
// BUGFLOW RAG KNOWLEDGE CENTER CONTROLLER
// Semantic Vector Search, Document Ingestion, Chunking & Gemini Synthesis
// ==========================================================================

class RAGController {
  constructor() {
    this.currentTab = 'search';
    this.selectedDoc = null;
    this.initEventListeners();
  }

  initEventListeners() {
    // Subtabs toggle
    document.querySelectorAll('.rag-subtab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.ragTab;
        this.switchTab(tab);
      });
    });

    // Semantic search form submit
    const searchForm = document.getElementById('rag-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = document.getElementById('rag-search-input').value.trim();
        const category = document.getElementById('rag-category-filter').value;
        if (!query) {
          window.showToast('Please enter a search query', 'warning');
          return;
        }
        await this.executeSemanticSearch(query, category);
      });
    }

    // Synthesize QA button
    const synthesizeBtn = document.getElementById('btn-rag-synthesize');
    if (synthesizeBtn) {
      synthesizeBtn.addEventListener('click', async () => {
        const query = document.getElementById('rag-search-input').value.trim();
        if (!query) {
          window.showToast('Please enter a question to synthesize with Gemini', 'warning');
          return;
        }
        await this.executeRAGQuery(query);
      });
    }

    // Ingest Document Form Submit
    const ingestForm = document.getElementById('rag-ingest-form');
    if (ingestForm) {
      ingestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleDocumentIngestion();
      });
    }

    // Drag and drop zone for knowledge uploads
    const dropzone = document.getElementById('rag-file-dropzone');
    const fileInput = document.getElementById('rag-file-upload-input');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('drag-over');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) {
          this.handleFileSelected(e.dataTransfer.files[0]);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
          this.handleFileSelected(e.target.files[0]);
        }
      });
    }

    // Quick prompt chips
    document.querySelectorAll('.rag-prompt-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        const text = e.currentTarget.dataset.prompt;
        const input = document.getElementById('rag-search-input');
        if (input) {
          input.value = text;
          this.switchTab('search');
          this.executeSemanticSearch(text);
        }
      });
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.rag-subtab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ragTab === tabName);
    });

    document.querySelectorAll('.rag-tab-pane').forEach(pane => {
      pane.style.display = 'none';
    });

    const activePane = document.getElementById(`rag-pane-${tabName}`);
    if (activePane) {
      activePane.style.display = 'block';
    }

    if (tabName === 'directory') {
      this.loadKnowledgeDirectory();
    } else if (tabName === 'history') {
      this.loadHistoricalResolutions();
    }
  }

  async loadRAGView() {
    await this.loadStats();
    if (this.currentTab === 'directory') {
      await this.loadKnowledgeDirectory();
    }
  }

  async loadStats() {
    try {
      const stats = await api.getRAGStats();
      const elDocs = document.getElementById('rag-stat-docs');
      const elChunks = document.getElementById('rag-stat-chunks');
      const elQueries = document.getElementById('rag-stat-queries');
      const elDims = document.getElementById('rag-stat-dims');

      if (elDocs) elDocs.textContent = stats.total_documents;
      if (elChunks) elChunks.textContent = stats.total_chunks;
      if (elQueries) elQueries.textContent = stats.total_queries_served;
      if (elDims) elDims.textContent = `${stats.embedding_dimension}-d`;
    } catch (err) {
      console.warn('Failed to load RAG stats:', err);
    }
  }

  async executeSemanticSearch(query, category = null) {
    const resultsContainer = document.getElementById('rag-search-results');
    const answerContainer = document.getElementById('rag-synthesized-answer-wrap');
    if (answerContainer) answerContainer.style.display = 'none';

    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
          <div class="spinner" style="width: 32px; height: 32px; margin: 0 auto 12px;"></div>
          <div>Scanning vector embeddings & knowledge chunks...</div>
        </div>
      `;
    }

    try {
      const data = await api.searchRAG(query, category);
      this.renderSearchResults(data);
    } catch (err) {
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="glass-card" style="padding: 24px; text-align: center; color: #f87171;">
            Failed to retrieve semantic search results: ${err.message}
          </div>
        `;
      }
    }
  }

  renderSearchResults(data) {
    const container = document.getElementById('rag-search-results');
    if (!container) return;

    if (!data.results || data.results.length === 0) {
      container.innerHTML = `
        <div class="glass-card" style="padding: 32px; text-align: center; color: var(--text-muted);">
          <div style="font-size: 2rem; margin-bottom: 8px;">🔍</div>
          <strong>No matching chunks found</strong>
          <p style="font-size: 0.85rem; margin-top: 4px;">Try searching with broader terms or upload relevant architecture documentation.</p>
        </div>
      `;
      return;
    }

    const cardsHtml = data.results.map((res, idx) => {
      const matchColor = res.relevance_pct >= 80 ? '#10b981' : (res.relevance_pct >= 50 ? '#38bdf8' : '#f59e0b');
      const badgeBg = res.relevance_pct >= 80 ? 'rgba(16,185,129,0.2)' : 'rgba(56,189,248,0.2)';

      return `
        <div class="glass-card" style="padding: 18px; margin-bottom: 14px; border-left: 4px solid ${matchColor}; transition: transform 0.2s ease;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.1rem;">📄</span>
                <strong style="font-size: 0.98rem; color: #f8fafc;">${res.document_title}</strong>
              </div>
              <div style="display: flex; gap: 8px; margin-top: 4px;">
                <span class="badge" style="background: rgba(99,102,241,0.2); font-size: 0.72rem;">${res.category}</span>
                <span class="badge" style="background: rgba(255,255,255,0.08); font-size: 0.72rem;">Chunk #${res.chunk_index || 1}</span>
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge" style="background: ${badgeBg}; color: ${matchColor}; font-weight: 700; font-size: 0.82rem;">
                ${res.relevance_pct}% Match
              </span>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">Vector Cosine: ${res.similarity_score}</div>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-size: 0.84rem; color: #cbd5e1; line-height: 1.5; font-family: var(--font-mono); white-space: pre-line;">
            ${res.snippet}
          </div>

          <div style="margin-top: 10px; display: flex; justify-content: flex-end; gap: 8px;">
            ${res.document_id ? `
              <button class="btn-secondary" style="font-size: 0.76rem; padding: 4px 10px;" onclick="ragController.viewDocumentModal(${res.document_id})">
                View Full Document ↗
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
        <span style="font-size: 0.88rem; color: var(--text-secondary);">
          Found <strong>${data.total_found}</strong> relevant knowledge chunks for <em>"${data.query}"</em>
        </span>
        <button class="btn-primary" id="btn-quick-synthesize-gemini" style="font-size: 0.8rem; padding: 6px 14px; background: linear-gradient(135deg, #6366f1, #06b6d4);">
          ✨ Synthesize Answer with Gemini
        </button>
      </div>
      ${cardsHtml}
    `;

    const quickSynthBtn = document.getElementById('btn-quick-synthesize-gemini');
    if (quickSynthBtn) {
      quickSynthBtn.addEventListener('click', () => {
        this.executeRAGQuery(data.query);
      });
    }
  }

  async executeRAGQuery(query) {
    const answerWrap = document.getElementById('rag-synthesized-answer-wrap');
    const answerText = document.getElementById('rag-synthesized-answer-text');
    const citationsList = document.getElementById('rag-synthesized-citations');

    if (answerWrap && answerText) {
      answerWrap.style.display = 'block';
      answerText.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; color: var(--text-muted); padding: 16px;">
          <div class="spinner"></div>
          <span>Retrieving top context chunks and synthesizing context-aware answer with Gemini...</span>
        </div>
      `;
      answerWrap.scrollIntoView({ behavior: 'smooth' });
    }

    try {
      const data = await api.queryRAG(query);
      if (answerText) {
        // Convert basic markdown formatting to HTML
        let formatted = data.answer
          .replace(/### (.*?)\n/g, '<h4 style="font-size: 1.05rem; font-weight: 700; color: #f8fafc; margin: 12px 0 6px;">$1</h4>')
          .replace(/#### (.*?)\n/g, '<h5 style="font-size: 0.95rem; font-weight: 700; color: #38bdf8; margin: 10px 0 4px;">$1</h5>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/`([^`]+)`/g, '<code style="background: rgba(0,0,0,0.4); padding: 2px 6px; border-radius: 4px; font-family: var(--font-mono); color: #38bdf8; font-size: 0.85em;">$1</code>')
          .replace(/\n\n/g, '<br><br>');

        answerText.innerHTML = formatted;
      }

      if (citationsList) {
        citationsList.innerHTML = (data.citations || []).map(c => `
          <span class="badge" style="background: rgba(99,102,241,0.25); color: #c7d2fe; font-size: 0.76rem; padding: 4px 10px;">
            📚 ${c}
          </span>
        `).join('');
      }

      await this.loadStats();
    } catch (err) {
      if (answerText) {
        answerText.innerHTML = `<div style="color: #f87171;">Failed to synthesize RAG query: ${err.message}</div>`;
      }
    }
  }

  handleFileSelected(file) {
    const titleInput = document.getElementById('rag-ingest-title');
    const contentInput = document.getElementById('rag-ingest-content');
    const fileNotice = document.getElementById('rag-dropzone-notice');

    if (titleInput && !titleInput.value) {
      titleInput.value = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (contentInput) {
        contentInput.value = e.target.result;
      }
      if (fileNotice) {
        fileNotice.textContent = `✓ Loaded: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        fileNotice.style.color = '#34d399';
      }
      window.showToast(`Loaded ${file.name}. Review and click Ingest.`, 'info');
    };
    reader.readAsText(file);
  }

  async handleDocumentIngestion() {
    const title = document.getElementById('rag-ingest-title').value.trim();
    const category = document.getElementById('rag-ingest-category').value;
    const docType = document.getElementById('rag-ingest-type').value;
    const tags = document.getElementById('rag-ingest-tags').value.trim();
    const content = document.getElementById('rag-ingest-content').value.trim();

    if (!title || !content) {
      window.showToast('Please provide both document title and text content', 'warning');
      return;
    }

    const submitBtn = document.getElementById('btn-submit-ingest');
    if (submitBtn) {
      submitBtn.innerHTML = '<span>Ingesting & Chunking...</span> <div class="spinner"></div>';
      submitBtn.disabled = true;
    }

    try {
      const doc = await api.ingestRAGDocument({
        title,
        category,
        doc_type: docType,
        tags,
        content
      });

      window.showToast(`Document ingested into vector store! Generated ${doc.chunks?.length || 0} chunks.`, 'success');
      document.getElementById('rag-ingest-form').reset();
      const fileNotice = document.getElementById('rag-dropzone-notice');
      if (fileNotice) fileNotice.textContent = 'Drag & drop Markdown, Text, or Log files, or click to browse';

      await this.loadStats();
      this.switchTab('directory');
    } catch (err) {
      window.showToast(`Ingestion failed: ${err.message}`, 'danger');
    } finally {
      if (submitBtn) {
        submitBtn.innerHTML = '<span>Ingest Document into Vector Store</span> <span>&rarr;</span>';
        submitBtn.disabled = false;
      }
    }
  }

  async loadKnowledgeDirectory() {
    const container = document.getElementById('rag-directory-grid');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted); grid-column: 1 / -1;">
        <div class="spinner" style="width: 32px; height: 32px; margin: 0 auto 12px;"></div>
        <div>Loading knowledge documents...</div>
      </div>
    `;

    try {
      const docs = await api.getRAGDocuments();
      if (!docs || docs.length === 0) {
        container.innerHTML = `
          <div class="glass-card" style="padding: 32px; text-align: center; color: var(--text-muted); grid-column: 1 / -1;">
            <div style="font-size: 2rem; margin-bottom: 8px;">📚</div>
            <strong>Knowledge Base is currently empty</strong>
            <p style="font-size: 0.85rem; margin-top: 4px;">Ingest architectural or incident documents to seed the RAG vector store.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = docs.map(doc => `
        <div class="glass-card" style="padding: 20px; display: flex; flex-direction: column; justify-content: space-between; border-top: 3px solid var(--accent-primary);">
          <div>
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <span class="badge" style="background: rgba(99,102,241,0.2); font-size: 0.72rem;">${doc.category}</span>
              <span class="badge" style="background: rgba(56,189,248,0.15); color: #38bdf8; font-size: 0.72rem;">${doc.chunks?.length || 0} Chunks</span>
            </div>
            <h4 style="font-size: 1.05rem; font-weight: 700; color: #f8fafc; margin-bottom: 8px;">${doc.title}</h4>
            <p style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.45; margin-bottom: 14px;">
              ${doc.summary || (doc.content.slice(0, 140) + '...')}
            </p>
            ${doc.tags ? `
              <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 14px;">
                ${doc.tags.split(',').map(t => `<span class="badge" style="background: rgba(255,255,255,0.06); font-size: 0.7rem;">#${t.trim()}</span>`).join('')}
              </div>
            ` : ''}
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 12px; margin-top: 8px;">
            <div style="font-size: 0.74rem; color: var(--text-muted);">
              Author: <strong>${doc.author}</strong>
            </div>
            <button class="btn-secondary" style="font-size: 0.76rem; padding: 4px 10px;" onclick="ragController.viewDocumentModal(${doc.id})">
              Inspect Chunks &rarr;
            </button>
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div style="color: #f87171; grid-column: 1 / -1;">Failed to load documents: ${err.message}</div>`;
    }
  }

  async viewDocumentModal(docId) {
    const dialog = document.getElementById('rag-doc-dialog');
    if (!dialog) return;

    try {
      const doc = await api.getRAGDocument(docId);
      document.getElementById('rag-modal-doc-title').textContent = doc.title;
      document.getElementById('rag-modal-doc-category').textContent = doc.category;
      document.getElementById('rag-modal-doc-chunks-count').textContent = `${doc.chunks?.length || 0} Chunks`;
      document.getElementById('rag-modal-doc-content').textContent = doc.content;

      const chunksContainer = document.getElementById('rag-modal-chunks-list');
      if (chunksContainer) {
        chunksContainer.innerHTML = (doc.chunks || []).map(ch => `
          <div style="background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.74rem; color: var(--text-muted); margin-bottom: 4px;">
              <strong>Chunk #${ch.chunk_index}</strong>
              <span>${ch.token_count} words &bull; Keywords: ${ch.keywords || 'none'}</span>
            </div>
            <div style="font-size: 0.8rem; font-family: var(--font-mono); color: #cbd5e1; white-space: pre-line;">${ch.chunk_text}</div>
          </div>
        `).join('');
      }

      dialog.showModal();
    } catch (err) {
      window.showToast(`Failed to open document: ${err.message}`, 'danger');
    }
  }

  async loadHistoricalResolutions() {
    const container = document.getElementById('rag-history-list');
    if (!container) return;

    container.innerHTML = `
      <div style="text-align: center; padding: 30px; color: var(--text-muted);">
        <div class="spinner"></div>
      </div>
    `;

    try {
      const items = await api.getHistoricalResolutions();
      container.innerHTML = items.map(item => `
        <div class="glass-card" style="padding: 18px; margin-bottom: 12px; border-left: 3px solid #10b981;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="defect-key">${item.defect_key}</span>
              <strong style="font-size: 0.95rem; color: #f8fafc;">${item.defect_title}</strong>
            </div>
            <span class="badge" style="background: rgba(16,185,129,0.2); color: #34d399;">${item.category}</span>
          </div>
          <div style="font-size: 0.84rem; margin-bottom: 6px;">
            <strong style="color: #f87171;">Root Cause:</strong> <span style="color: #cbd5e1;">${item.root_cause}</span>
          </div>
          <div style="font-size: 0.84rem; background: rgba(0,0,0,0.25); padding: 8px 12px; border-radius: 6px; font-family: var(--font-mono); color: #34d399;">
            ${item.resolution_text}
          </div>
        </div>
      `).join('');
    } catch (err) {
      container.innerHTML = `<div style="color: #f87171;">Failed to load historical resolutions: ${err.message}</div>`;
    }
  }
}

const ragController = new RAGController();
window.ragController = ragController;
