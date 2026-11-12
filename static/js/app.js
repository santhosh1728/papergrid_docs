/**
 * UltraPDF Studio Pro - Comprehensive Interactive Client Application (v4.0)
 * 39+ Offline PDF Tools + Interactive Visual Canvas Studio + Chat with PDF + Batch 500MB+ Engine
 */

document.addEventListener('DOMContentLoaded', () => {

  // ===========================================================================
  // 1. TOOL REGISTRY & METADATA (Loaded from tools_catalog.js)
  // ===========================================================================
  const PDF_TOOLS = window.ULTRA_PDF_CATALOG || [];

  const appState = {
    publicMode: false,
    maxUploadMb: 100,
    activeCategory: 'all',
    searchQuery: '',
    selectedTool: null,
    toolFiles: [],
    batchStudioOpen: false,
    sigColor: '#000000',
    sigDrawing: false,
    sigMode: 'draw',
    uploadedSigDataUrl: '',
    certFile: null,
    cameraStream: null,
    scannedSnaps: [],
    organizePages: [],
    pageRotations: {},
    detectedFormFields: [],
    bookmarksList: [],
    workflowPresets: [],
    workflowSteps: [
      { tool: 'merge', options: { bookmarks: true } },
      { tool: 'ocr', options: { lang: 'eng' } },
      { tool: 'compress', options: { preset: 'balanced' } }
    ],
    lastToolResult: null,
    chatMessages: [],
    modalPages: [],
    modalPageIdx: 0,
    modalZoom: 1.0,
  };

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }

  function showToast(message, type = 'normal') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : (type === 'error' ? 'toast-error' : '')}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : (type === 'error' ? '⚠️' : 'ℹ️')}</span> <span>${escHtml(message)}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      setTimeout(() => toast.remove(), 300);
    }, 3600);
  }

  // ===========================================================================
  // 2. TOOLS GRID & FILTERING
  // ===========================================================================
  const toolsGrid = document.getElementById('toolsGrid');
  const toolSearchInput = document.getElementById('toolSearchInput');
  const catPills = document.querySelectorAll('.cat-pill');
  const navLinks = document.querySelectorAll('.nav-link');

  function updateCategoryCounts() {
    const map = { all: PDF_TOOLS.length, workflows: 0, organize: 0, optimize: 0, convert: 0, edit: 0, security: 0, intelligence: 0 };
    PDF_TOOLS.forEach(t => { if (map[t.category] !== undefined) map[t.category]++; });
    const ids = { all: 'countAll', workflows: 'countWorkflows', organize: 'countOrganize', optimize: 'countOptimize', convert: 'countConvert', edit: 'countEdit', security: 'countSecurity', intelligence: 'countIntelligence' };
    Object.entries(ids).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = map[k];
    });
  }

  function renderToolsGrid() {
    if (!toolsGrid) return;
    toolsGrid.innerHTML = '';
    const q = appState.searchQuery.toLowerCase().trim();
    const cat = appState.activeCategory;
    const filtered = PDF_TOOLS.filter(t => (cat === 'all' || t.category === cat) && (!q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)));

    if (filtered.length === 0) {
      toolsGrid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:48px; color:var(--text-secondary);"><h3>No tools found matching "${escHtml(appState.searchQuery)}"</h3></div>`;
      return;
    }

    filtered.forEach(tool => {
      const card = document.createElement('div');
      card.className = 'tool-card';
      card.id = `toolCard_${tool.id}`;
      card.innerHTML = `
        <div class="tool-card-top">
          <div class="tool-card-icon-wrap ${tool.iconTheme}">${tool.icon}</div>
          <div style="display:flex;align-items:center;gap:6px;">
            ${tool.engineTag ? `<span class="engine-pill">${escHtml(tool.engineTag)}</span>` : ''}
            <span class="tool-category-tag">${tool.category}</span>
          </div>
        </div>
        <div class="tool-card-title">
          <span>${tool.name}</span>
          ${tool.isNew ? '<span class="badge-new-glow">New!</span>' : ''}
        </div>
        <p class="tool-card-desc">${tool.desc}</p>
        <div class="tool-card-footer">
          <span class="tool-action-link">Open Tool &rarr;</span>
          <button type="button" class="btn-card-info" title="View how ${escHtml(tool.name)} works">ℹ️ Details</button>
        </div>
      `;
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
        card.style.setProperty('--my', `${e.clientY - rect.top}px`);
      });
      card.querySelector('.btn-card-info').addEventListener('click', (e) => {
        e.stopPropagation();
        openToolDetailsModal(tool);
      });
      card.addEventListener('click', () => openToolWorkspace(tool));
      toolsGrid.appendChild(card);
    });
  }

  // Theme Switcher + Spotlight Deck + Features Guide
  const themes = ['', 'emerald', 'amber'];
  let themeIdx = 0;
  document.getElementById('btnCycleTheme')?.addEventListener('click', () => {
    themeIdx = (themeIdx + 1) % themes.length;
    const t = themes[themeIdx];
    if (t) document.body.setAttribute('data-theme', t);
    else document.body.removeAttribute('data-theme');
    showToast(`Theme switched to ${t ? t.toUpperCase() : 'COSMIC INDIGO'}`, 'success');
  });

  document.querySelectorAll('.spotlight-card[data-launch]').forEach(sc => {
    sc.addEventListener('click', () => {
      const target = sc.dataset.launch;
      if (target === 'batch_studio') {
        openBatchStudio();
      } else {
        const found = PDF_TOOLS.find(t => t.id === target);
        if (found) openToolWorkspace(found);
      }
    });
  });

  const featuresGuideSection = document.getElementById('featuresGuideSection');
  function openFeaturesGuide() {
    closeToolWorkspace();
    appState.batchStudioOpen = false;
    document.getElementById('batchMergeStudioCard').style.display = 'none';
    heroSection.style.display = 'none';
    toolsGridSection.style.display = 'none';
    if (featuresGuideSection) featuresGuideSection.style.display = 'block';
    renderEncyclopediaGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function closeFeaturesGuide() {
    if (featuresGuideSection) featuresGuideSection.style.display = 'none';
    heroSection.style.display = 'block';
    toolsGridSection.style.display = 'block';
  }
  document.getElementById('btnOpenFeaturesGuide')?.addEventListener('click', openFeaturesGuide);
  document.getElementById('btnHeroExploreFeatures')?.addEventListener('click', openFeaturesGuide);
  document.getElementById('btnCloseFeaturesGuide')?.addEventListener('click', closeFeaturesGuide);
  document.getElementById('btnGuideOpenBatch')?.addEventListener('click', () => { closeFeaturesGuide(); openBatchStudio(); });

  document.querySelectorAll('.btn-copy-cmd').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.cmd || '');
      showToast('Command copied to clipboard!', 'success');
    });
  });

  function renderEncyclopediaGrid() {
    const grid = document.getElementById('encyclopediaGrid');
    if (!grid) return;
    const q = (document.getElementById('guideSearchInput')?.value || '').toLowerCase().trim();
    const cat = document.getElementById('guideCategoryFilter')?.value || 'all';
    const list = PDF_TOOLS.filter(t => (cat === 'all' || t.category === cat) && (!q || t.name.toLowerCase().includes(q) || (t.howItWorks || '').toLowerCase().includes(q) || (t.engineTag || '').toLowerCase().includes(q) || (t.formats || '').toLowerCase().includes(q)));

    grid.innerHTML = '';
    list.forEach(t => {
      const card = document.createElement('div');
      card.className = 'encyclopedia-card';
      card.innerHTML = `
        <div class="encyclopedia-card-head">
          <div class="encyclopedia-card-title"><span>${t.icon}</span> <span>${escHtml(t.name)}</span></div>
          <span class="engine-pill">${escHtml(t.engineTag || t.category)}</span>
        </div>
        <p class="encyclopedia-card-how">${escHtml(t.howItWorks || t.desc)}</p>
        <div class="encyclopedia-card-meta">
          <div><strong>Formats:</strong> ${escHtml(t.formats || 'PDF')}</div>
          <div style="margin-top:4px;color:#cbd5e1;"><strong>💡 Tip:</strong> ${escHtml(t.proTip || '')}</div>
        </div>
        <div style="display:flex;justify-content:flex-end;">
          <button type="button" class="btn btn-secondary btn-sm btn-launch-enc">🚀 Open ${escHtml(t.name)} &rarr;</button>
        </div>`;
      card.querySelector('.btn-launch-enc').addEventListener('click', () => {
        closeFeaturesGuide();
        openToolWorkspace(t);
      });
      grid.appendChild(card);
    });
  }
  document.getElementById('guideSearchInput')?.addEventListener('input', renderEncyclopediaGrid);
  document.getElementById('guideCategoryFilter')?.addEventListener('change', renderEncyclopediaGrid);

  // Quick Tool Details Modal
  const toolDetailsModal = document.getElementById('toolDetailsModal');
  let detailsModalTool = null;
  function openToolDetailsModal(tool) {
    detailsModalTool = tool;
    document.getElementById('detailsModalTitle').innerHTML = `${tool.icon} ${escHtml(tool.name)} <span class="engine-pill" style="margin-left:8px;">${escHtml(tool.engineTag || '')}</span>`;
    document.getElementById('detailsModalBody').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;font-size:13.5px;line-height:1.6;">
        <div><strong>Overview:</strong> ${escHtml(tool.desc)}</div>
        <div style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.28);padding:12px;border-radius:8px;">
          <strong style="color:#a5b4fc;">⚙️ Under the Hood:</strong><br>${escHtml(tool.howItWorks || '')}
        </div>
        <div><strong>📄 Formats:</strong> ${escHtml(tool.formats || '')}</div>
        <div><strong>💡 Pro Tip:</strong> ${escHtml(tool.proTip || '')}</div>
      </div>`;
    if (toolDetailsModal) toolDetailsModal.style.display = 'flex';
  }
  document.getElementById('btnCloseDetailsModal')?.addEventListener('click', () => { toolDetailsModal.style.display = 'none'; });
  document.getElementById('btnDoneDetailsModal')?.addEventListener('click', () => { toolDetailsModal.style.display = 'none'; });
  toolDetailsModal?.addEventListener('click', (e) => { if (e.target === toolDetailsModal) toolDetailsModal.style.display = 'none'; });
  document.getElementById('btnLaunchFromDetails')?.addEventListener('click', () => {
    toolDetailsModal.style.display = 'none';
    if (detailsModalTool) openToolWorkspace(detailsModalTool);
  });

  function setCategory(cat) {
    closeFeaturesGuide();
    closeToolWorkspace();
    appState.activeCategory = cat;
    catPills.forEach(p => p.classList.toggle('active', p.dataset.filter === cat));
    navLinks.forEach(n => n.classList.toggle('active', n.dataset.category === cat));
    renderToolsGrid();
  }

  catPills.forEach(pill => pill.addEventListener('click', () => setCategory(pill.dataset.filter)));
  navLinks.forEach(nav => nav.addEventListener('click', () => setCategory(nav.dataset.category)));

  if (toolSearchInput) {
    toolSearchInput.addEventListener('input', (e) => { appState.searchQuery = e.target.value; renderToolsGrid(); });
    window.addEventListener('keydown', (e) => {
      if ((e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        toolSearchInput.focus();
      }
    });
  }

  document.getElementById('brandHomeBtn')?.addEventListener('click', () => {
    closeToolWorkspace();
    closeBatchStudio();
    setCategory('all');
  });

  // ===========================================================================
  // 3. TOOL WORKSPACE STUDIO
  // ===========================================================================
  const toolWorkspaceCard = document.getElementById('toolWorkspaceCard');
  const heroSection = document.getElementById('heroSection');
  const toolsGridSection = document.getElementById('toolsGridSection');
  const workspaceFileInput = document.getElementById('workspaceFileInput');
  const workspaceDropzone = document.getElementById('workspaceDropzone');
  const workspaceSelectedFilesList = document.getElementById('workspaceSelectedFilesList');
  const dynamicToolControls = document.getElementById('dynamicToolControls');
  const btnExecuteTool = document.getElementById('btnExecuteTool');
  const toolProgressWrap = document.getElementById('toolProgressWrap');
  const toolProgressMsg = document.getElementById('toolProgressMsg');
  const toolProgressPct = document.getElementById('toolProgressPct');
  const toolProgressBarFill = document.getElementById('toolProgressBarFill');
  const toolResultCard = document.getElementById('toolResultCard');
  const specializedResultBox = document.getElementById('specializedResultBox');

  function openToolWorkspace(tool, preloadedFiles = null) {
    appState.selectedTool = tool;
    appState.toolFiles = preloadedFiles ? [...preloadedFiles] : [];
    appState.certFile = null;
    appState.chatMessages = [];

    heroSection.style.display = 'none';
    toolsGridSection.style.display = 'none';
    if (featuresGuideSection) featuresGuideSection.style.display = 'none';
    document.getElementById('batchMergeStudioCard').style.display = 'none';
    toolWorkspaceCard.style.display = 'block';

    // Populate In-Workspace Guide & Sample File Button
    const guideBox = document.getElementById('workspaceGuideBox');
    const guideBody = document.getElementById('workspaceGuideBody');
    if (guideBox) {
      guideBox.style.display = 'block';
      document.getElementById('workspaceEnginePill').textContent = tool.engineTag || 'Local Engine';
      document.getElementById('workspaceHowItWorksText').textContent = tool.howItWorks || tool.desc;
      document.getElementById('workspaceFormatsText').textContent = tool.formats || 'PDF';
      document.getElementById('workspaceProTipText').textContent = tool.proTip || '';
      if (guideBody) guideBody.style.display = 'block';
      document.getElementById('workspaceGuideChevron').textContent = '▲';
    }
    const sampleBtn = document.getElementById('btnLoadSamplePdf');
    if (sampleBtn) {
      sampleBtn.style.display = (tool.sampleKinds && tool.sampleKinds.length) ? 'inline-flex' : 'none';
      sampleBtn.onclick = async (e) => {
        e.stopPropagation();
        await loadSampleIntoTool(tool);
      };
    }
    const sampleHtmlBtn = document.getElementById('btnLoadSampleHtml');
    if (sampleHtmlBtn) {
      sampleHtmlBtn.onclick = () => loadSampleIntoTool(tool);
    }

    toolProgressWrap.style.display = 'none';
    toolResultCard.style.display = 'none';
    specializedResultBox.style.display = 'none';
    specializedResultBox.innerHTML = '';

    document.getElementById('workspaceToolIcon').textContent = tool.icon;
    document.getElementById('workspaceToolIcon').className = `workspace-icon ${tool.iconTheme}`;
    document.getElementById('workspaceToolTitle').textContent = tool.name;
    document.getElementById('workspaceCategoryBadge').textContent = tool.category;
    document.getElementById('workspaceNewBadge').style.display = tool.isNew ? 'inline-block' : 'none';
    document.getElementById('workspaceToolDesc').textContent = tool.desc;
    document.getElementById('btnExecuteToolText').textContent = tool.actionText || `Run ${tool.name}`;

    workspaceFileInput.value = '';
    workspaceFileInput.accept = tool.accept || '*/*';
    workspaceFileInput.multiple = !!tool.multiple;

    workspaceDropzone.style.display = tool.isUrl ? 'none' : 'block';
    document.getElementById('workspaceUrlInputBox').style.display = tool.isUrl ? 'block' : 'none';
    document.getElementById('cameraScannerBox').style.display = (tool.id === 'scan_to_pdf') ? 'flex' : 'none';

    document.getElementById('workspaceDropzoneTitle').textContent = tool.multiple ? `Select or Drop ${tool.name} Files` : `Select or Drop Input File`;
    document.getElementById('workspaceDropzoneSubtitle').innerHTML = `Drag and drop your file here or <button type="button" class="link-btn" id="workspaceBrowseBtnInner">browse files</button>`;
    document.getElementById('workspaceBrowseBtnInner')?.addEventListener('click', (e) => { e.stopPropagation(); workspaceFileInput.click(); });

    renderSelectedFilesChips();
    renderToolSpecificControls(tool);

    if (appState.toolFiles.length > 0) {
      onToolFilesUpdated();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  document.getElementById('btnToggleWorkspaceGuide')?.addEventListener('click', () => {
    const body = document.getElementById('workspaceGuideBody');
    const chev = document.getElementById('workspaceGuideChevron');
    if (!body) return;
    const isOpen = body.style.display === 'block';
    body.style.display = isOpen ? 'none' : 'block';
    if (chev) chev.textContent = isOpen ? '▼' : '▲';
  });

  async function loadSampleIntoTool(tool) {
    if (!tool.sampleKinds?.length) return;
    if (tool.sampleKinds[0] === 'sample_html') {
      const inp = document.getElementById('txtWebUrl');
      if (inp) {
        inp.value = `<html><head><style>body{font-family:Arial,sans-serif;padding:32px;color:#0f172a;} .hdr{background:#1e3a8a;color:#fff;padding:18px;border-radius:8px;} table{width:100%;border-collapse:collapse;margin-top:20px;} th,td{border:1px solid #cbd5e1;padding:10px;text-align:left;}</style></head><body><div class="hdr"><h1>UltraPDF Sample CSS Invoice</h1><p>100% Local Story / Headless Browser Rendering</p></div><table><tr><th>Service</th><th>License</th><th>Price</th></tr><tr><td>Offline RapidOCR</td><td>Unlimited</td><td>$0.00</td></tr><tr><td>PKCS#7 Signing</td><td>Local RSA-2048</td><td>$0.00</td></tr></table></body></html>`;
        showToast('Loaded sample CSS HTML template!', 'success');
      }
      return;
    }
    try {
      const loaded = [];
      for (const kind of tool.sampleKinds) {
        const res = await fetch(`/api/demo/sample/${kind}`);
        const blob = await res.blob();
        loaded.push(new File([blob], `Sample_${kind}.pdf`, { type: 'application/pdf' }));
      }
      appState.toolFiles = loaded;
      renderSelectedFilesChips();
      onToolFilesUpdated();
      showToast(`Loaded ${loaded.length} sample PDF(s) — ready to test!`, 'success');
    } catch (err) {
      showToast('Failed to load sample: ' + err.message, 'error');
    }
  }

  function closeToolWorkspace() {
    appState.selectedTool = null;
    appState.toolFiles = [];
    toolWorkspaceCard.style.display = 'none';
    heroSection.style.display = 'block';
    toolsGridSection.style.display = 'block';
    stopCameraStream();
  }

  document.getElementById('btnBackToTools')?.addEventListener('click', closeToolWorkspace);

  if (workspaceDropzone) {
    workspaceDropzone.addEventListener('click', () => workspaceFileInput.click());
    workspaceDropzone.addEventListener('dragover', (e) => { e.preventDefault(); workspaceDropzone.classList.add('dragover'); });
    workspaceDropzone.addEventListener('dragleave', () => workspaceDropzone.classList.remove('dragover'));
    workspaceDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      workspaceDropzone.classList.remove('dragover');
      if (e.dataTransfer.files?.length) handleToolFilesSelected(Array.from(e.dataTransfer.files));
    });
  }

  document.getElementById('workspaceBrowseBtn')?.addEventListener('click', (e) => { e.stopPropagation(); workspaceFileInput.click(); });
  workspaceFileInput?.addEventListener('change', (e) => {
    if (e.target.files?.length) handleToolFilesSelected(Array.from(e.target.files));
  });

  function handleToolFilesSelected(filesList) {
    const tool = appState.selectedTool;
    if (!tool) return;
    appState.toolFiles = tool.multiple ? appState.toolFiles.concat(filesList) : [filesList[0]];
    renderSelectedFilesChips();
    onToolFilesUpdated();
  }

  function onToolFilesUpdated() {
    const tool = appState.selectedTool;
    if (!tool || appState.toolFiles.length === 0) return;
    const f0 = appState.toolFiles[0];

    if (tool.id === 'organize_pdf') loadOrganizePageThumbnails(f0);
    if (tool.id === 'pdf_forms') {
      loadPdfFormFields(f0);
      const canvasHost = document.getElementById('studioCanvasMount');
      if (canvasHost) UltraCanvasStudio.loadPdfIntoStudio(f0, 'forms', canvasHost);
    }
    if (tool.id === 'edit_pdf' || tool.id === 'redact_pdf' || tool.id === 'sign_pdf') {
      const canvasHost = document.getElementById('studioCanvasMount');
      const modeMap = { edit_pdf: 'edit', redact_pdf: 'redact', sign_pdf: 'sign' };
      if (canvasHost) {
        UltraCanvasStudio.loadPdfIntoStudio(f0, modeMap[tool.id], canvasHost).then(() => {
          if (tool.id === 'sign_pdf') syncCurrentSignatureToStudio();
        });
      }
    }
    if (tool.id === 'crop_pdf') {
      const canvasHost = document.getElementById('studioCanvasMount');
      if (canvasHost) {
        UltraCanvasStudio.loadPdfIntoStudio(f0, 'crop', canvasHost, {
          onChangeCrop: (box) => {
            ['Left', 'Top', 'Right', 'Bottom'].forEach(side => {
              const el = document.getElementById(`numCrop${side}`);
              if (el) el.value = Math.round(box[side.toLowerCase()] * 100);
            });
          }
        });
      }
    }
    if (tool.id === 'bookmarks_editor') loadPdfBookmarks(f0);
    if (tool.id === 'metadata_sanitizer') loadPdfMetadataInspect(f0);
  }

  function renderSelectedFilesChips() {
    if (!workspaceSelectedFilesList) return;
    if (appState.toolFiles.length === 0) {
      workspaceSelectedFilesList.style.display = 'none';
      workspaceSelectedFilesList.innerHTML = '';
      return;
    }
    workspaceSelectedFilesList.style.display = 'flex';
    workspaceSelectedFilesList.innerHTML = '';
    appState.toolFiles.forEach((file, idx) => {
      const chip = document.createElement('div');
      chip.className = 'file-chip';
      chip.style.cssText = 'background:rgba(99,102,241,0.15);border:1px solid rgba(99,102,241,0.35);padding:6px 12px;border-radius:8px;display:inline-flex;align-items:center;gap:8px;font-size:13px;';
      chip.innerHTML = `<span>📄 <strong>${escHtml(file.name)}</strong> (${(file.size / (1024 * 1024)).toFixed(2)} MB)</span><button type="button" class="btn-remove-chip" style="background:none;border:none;color:#fb7185;cursor:pointer;font-size:14px;">&times;</button>`;
      chip.querySelector('.btn-remove-chip').addEventListener('click', (e) => {
        e.stopPropagation();
        appState.toolFiles.splice(idx, 1);
        renderSelectedFilesChips();
      });
      workspaceSelectedFilesList.appendChild(chip);
    });
  }

  // ===========================================================================
  // 4. DYNAMIC TOOL CONTROLS
  // ===========================================================================
  function renderToolSpecificControls(tool) {
    if (!dynamicToolControls) return;
    dynamicToolControls.innerHTML = '';

    switch (tool.id) {
      case 'split_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-item">
            <span class="control-label">Split Mode:</span>
            <div class="mode-pills-row">
              <label class="mode-pill-radio active"><input type="radio" name="split_mode" value="ranges" checked><span>Custom Page Ranges</span></label>
              <label class="mode-pill-radio"><input type="radio" name="split_mode" value="extract_all"><span>Extract All Pages</span></label>
              <label class="mode-pill-radio"><input type="radio" name="split_mode" value="fixed_parts"><span>Equal Parts</span></label>
            </div>
          </div>
          <div class="control-item" id="splitRangesGroup" style="margin-top:14px;">
            <label class="control-label" for="txtSplitRanges">Page Ranges (e.g. 1-3, 5, 7-10):</label>
            <input type="text" id="txtSplitRanges" class="text-input" value="1-2">
          </div>
          <div class="control-item" id="splitPartsGroup" style="margin-top:14px;display:none;">
            <label class="control-label" for="numSplitParts">Number of Parts:</label>
            <input type="number" id="numSplitParts" class="number-input" value="2" min="2" max="20">
          </div>`;
        document.querySelectorAll('input[name="split_mode"]').forEach(r => r.addEventListener('change', (e) => {
          document.querySelectorAll('.mode-pill-radio').forEach(p => p.classList.remove('active'));
          e.target.closest('.mode-pill-radio').classList.add('active');
          document.getElementById('splitRangesGroup').style.display = (e.target.value === 'ranges') ? 'flex' : 'none';
          document.getElementById('splitPartsGroup').style.display = (e.target.value === 'fixed_parts') ? 'flex' : 'none';
        }));
        break;

      case 'compress_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-item">
            <span class="control-label">Compression Preset:</span>
            <div class="mode-pills-row">
              <label class="mode-pill-radio active"><input type="radio" name="comp_preset" value="balanced" checked><span>Balanced (150 DPI)</span></label>
              <label class="mode-pill-radio"><input type="radio" name="comp_preset" value="ultrabw"><span>Ultra-B&W 1-Bit (98%)</span></label>
              <label class="mode-pill-radio"><input type="radio" name="comp_preset" value="maximum"><span>Maximum Quality</span></label>
              <label class="mode-pill-radio"><input type="radio" name="comp_preset" value="target"><span>Exact Target MB</span></label>
            </div>
          </div>
          <div class="control-item" id="compTargetGroup" style="margin-top:14px;display:none;">
            <label class="control-label" for="numCompTarget">Target Size Ceiling (MB) — Iterative Multi-Pass:</label>
            <input type="number" id="numCompTarget" class="number-input" value="5" min="0.2" max="500" step="0.5">
          </div>`;
        document.querySelectorAll('input[name="comp_preset"]').forEach(r => r.addEventListener('change', (e) => {
          document.querySelectorAll('.mode-pill-radio').forEach(p => p.classList.remove('active'));
          e.target.closest('.mode-pill-radio').classList.add('active');
          document.getElementById('compTargetGroup').style.display = (e.target.value === 'target') ? 'flex' : 'none';
        }));
        break;

      case 'ocr_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-grid-2">
            <div class="control-item">
              <label class="control-label" for="selOcrLang">Primary Document Language:</label>
              <select id="selOcrLang" class="select-input">
                <option value="eng">English / Multilingual Latin</option>
                <option value="chi">Chinese / Mixed</option>
                <option value="spa">Spanish</option>
                <option value="fra">French</option>
                <option value="deu">German</option>
              </select>
            </div>
            <div class="control-item" style="justify-content:center;">
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" id="chkForceOcr">
                <span>Force OCR even on pages that already have text</span>
              </label>
              <span style="font-size:11.5px;color:#34d399;">Powered by 100% Offline RapidOCR ONNX</span>
            </div>
          </div>`;
        break;

      case 'pdf_to_powerpoint':
        dynamicToolControls.innerHTML = `
          <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;cursor:pointer;">
            <input type="checkbox" id="chkPptEditable" checked>
            <span><strong>Editable Slides Mode</strong> (Extract native text boxes &amp; images instead of flat screenshots)</span>
          </label>`;
        break;

      case 'edit_pdf':
        dynamicToolControls.innerHTML = `
          <p style="font-size:12.5px;color:var(--text-secondary);">Upload a PDF above to draw freehand ink, text, arrows, highlights, sticky notes, or whiteouts directly onto any page.</p>
          <div id="studioCanvasMount"></div>`;
        break;

      case 'crop_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-grid-2">
            <div class="control-item"><label class="control-label">Left Trim (%)</label><input type="number" id="numCropLeft" class="number-input crop-box-inp" value="5" min="0" max="45"></div>
            <div class="control-item"><label class="control-label">Top Trim (%)</label><input type="number" id="numCropTop" class="number-input crop-box-inp" value="5" min="0" max="45"></div>
            <div class="control-item"><label class="control-label">Right Trim (%)</label><input type="number" id="numCropRight" class="number-input crop-box-inp" value="5" min="0" max="45"></div>
            <div class="control-item"><label class="control-label">Bottom Trim (%)</label><input type="number" id="numCropBottom" class="number-input crop-box-inp" value="5" min="0" max="45"></div>
          </div>
          <div id="studioCanvasMount"></div>`;
        document.querySelectorAll('.crop-box-inp').forEach(inp => inp.addEventListener('input', () => {
          UltraCanvasStudio.setCropMargins({
            left: (parseFloat(document.getElementById('numCropLeft').value) || 0) / 100,
            top: (parseFloat(document.getElementById('numCropTop').value) || 0) / 100,
            right: (parseFloat(document.getElementById('numCropRight').value) || 0) / 100,
            bottom: (parseFloat(document.getElementById('numCropBottom').value) || 0) / 100,
          });
        }));
        break;

      case 'impose_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-grid-2">
            <div class="control-item">
              <label class="control-label" for="selImposeMode">Imposition Layout:</label>
              <select id="selImposeMode" class="select-input">
                <option value="2up">2-Up (2 Pages per Landscape Sheet)</option>
                <option value="4up">4-Up (2×2 Handout Grid)</option>
                <option value="6up">6-Up (3×2 Compact Sheet)</option>
                <option value="booklet">Booklet (Saddle-Stitch Duplex Order)</option>
              </select>
            </div>
            <div class="control-item" style="justify-content:center;">
              <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                <input type="checkbox" id="chkImposeBorders" checked>
                <span>Draw subtle page cut borders</span>
              </label>
            </div>
          </div>`;
        break;

      case 'header_footer_pdf':
        dynamicToolControls.innerHTML = `
          <p style="font-size:12px;color:var(--text-secondary);margin-bottom:10px;">Tokens: <code>{page}</code>, <code>{total}</code>, <code>{date}</code>, <code>{filename}</code>, <code>{bates}</code></p>
          <div class="control-grid-2">
            <div class="control-item"><label class="control-label">Header Left</label><input type="text" id="hfTopL" class="text-input" placeholder="e.g. {filename}"></div>
            <div class="control-item"><label class="control-label">Header Center</label><input type="text" id="hfTopC" class="text-input" placeholder="e.g. CONFIDENTIAL"></div>
            <div class="control-item"><label class="control-label">Header Right</label><input type="text" id="hfTopR" class="text-input" placeholder="e.g. {date}"></div>
            <div class="control-item"><label class="control-label">Footer Left</label><input type="text" id="hfBotL" class="text-input" placeholder="e.g. {bates}"></div>
            <div class="control-item"><label class="control-label">Footer Center</label><input type="text" id="hfBotC" class="text-input" value="Page {page} of {total}"></div>
            <div class="control-item"><label class="control-label">Footer Right / Bates Start #</label>
              <div style="display:flex;gap:8px;"><input type="text" id="hfBotR" class="text-input" placeholder="Optional"><input type="number" id="hfBatesStart" class="number-input number-sm" value="1" min="1" style="width:90px;"></div>
            </div>
          </div>`;
        break;

      case 'bookmarks_editor':
        dynamicToolControls.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
            <label style="display:flex;align-items:center;gap:8px;font-size:13px;"><input type="checkbox" id="chkAutoDetectToc"> <span>Auto-detect headings if list is empty</span></label>
            <button type="button" class="btn btn-secondary btn-sm" id="btnAddBookmarkRow">+ Add Bookmark</button>
          </div>
          <div id="bookmarksEditorList" style="display:flex;flex-direction:column;gap:8px;max-height:280px;overflow-y:auto;">
            <p style="font-size:12.5px;color:var(--text-muted);">Upload a PDF to inspect existing bookmarks or add your own.</p>
          </div>`;
        appState.bookmarksList = [];
        document.getElementById('btnAddBookmarkRow')?.addEventListener('click', () => {
          appState.bookmarksList.push({ level: 1, title: `Section ${appState.bookmarksList.length + 1}`, page: 1 });
          renderBookmarksList();
        });
        break;

      case 'watermark_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-grid-2">
            <div class="control-item"><label class="control-label" for="txtWatermarkVal">Watermark Text:</label><input type="text" id="txtWatermarkVal" class="text-input" value="CONFIDENTIAL"></div>
            <div class="control-item"><label class="control-label" for="selWatermarkAngle">Rotation:</label><select id="selWatermarkAngle" class="select-input"><option value="45">45° Diagonal</option><option value="0">0° Horizontal</option><option value="90">90° Vertical</option></select></div>
            <div class="control-item"><label class="control-label" for="numWatermarkOpacity">Opacity: <span id="lblOpacityVal">35%</span></label><input type="range" id="numWatermarkOpacity" min="10" max="90" value="35" class="range-slider"></div>
            <div class="control-item"><label class="control-label" for="numWatermarkSize">Font Size (pt):</label><input type="number" id="numWatermarkSize" class="number-input" value="48" min="18" max="100"></div>
          </div>`;
        document.getElementById('numWatermarkOpacity')?.addEventListener('input', (e) => { document.getElementById('lblOpacityVal').textContent = `${e.target.value}%`; });
        break;

      case 'rotate_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-grid-2">
            <div class="control-item"><span class="control-label">Rotation Angle:</span>
              <div class="mode-pills-row">
                <label class="mode-pill-radio active"><input type="radio" name="rot_angle" value="90" checked><span>90° CW ↻</span></label>
                <label class="mode-pill-radio"><input type="radio" name="rot_angle" value="180"><span>180° Flip</span></label>
                <label class="mode-pill-radio"><input type="radio" name="rot_angle" value="270"><span>270° CCW</span></label>
              </div>
            </div>
            <div class="control-item"><label class="control-label" for="selRotatePages">Apply To:</label><select id="selRotatePages" class="select-input"><option value="all">All Pages</option><option value="odd">Odd Pages</option><option value="even">Even Pages</option></select></div>
          </div>`;
        document.querySelectorAll('input[name="rot_angle"]').forEach(r => r.addEventListener('change', (e) => {
          document.querySelectorAll('.mode-pill-radio').forEach(p => p.classList.remove('active'));
          e.target.closest('.mode-pill-radio').classList.add('active');
        }));
        break;

      case 'page_numbers':
        dynamicToolControls.innerHTML = `
          <div class="control-grid-2">
            <div class="control-item"><label class="control-label" for="selPageNumPos">Position:</label><select id="selPageNumPos" class="select-input"><option value="bottom-center">Bottom Center</option><option value="bottom-right">Bottom Right</option><option value="bottom-left">Bottom Left</option><option value="top-right">Top Right</option></select></div>
            <div class="control-item"><label class="control-label" for="txtPageNumFormat">Format Template:</label><input type="text" id="txtPageNumFormat" class="text-input" value="Page {page} of {total}"></div>
          </div>`;
        break;

      case 'protect_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-grid-2">
            <div class="control-item"><label class="control-label" for="txtProtectPassword">Encryption Password (AES-256):</label><input type="password" id="txtProtectPassword" class="text-input" placeholder="Enter strong password"></div>
            <div class="control-item"><span class="control-label">Granular Permissions:</span>
              <div style="display:flex;gap:14px;flex-wrap:wrap;font-size:13px;padding-top:6px;">
                <label><input type="checkbox" id="chkPermPrint" checked> Allow Print</label>
                <label><input type="checkbox" id="chkPermCopy" checked> Allow Copy</label>
                <label><input type="checkbox" id="chkPermModify"> Allow Modify</label>
              </div>
            </div>
          </div>`;
        break;

      case 'unlock_pdf':
        dynamicToolControls.innerHTML = `<div class="control-item"><label class="control-label" for="txtUnlockPassword">PDF Password (if required):</label><input type="password" id="txtUnlockPassword" class="text-input" placeholder="Password to unlock"></div>`;
        break;

      case 'sign_pdf':
        dynamicToolControls.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div class="sig-tabs">
              <button type="button" class="pill-btn active" data-sigtab="draw">✏️ Draw Pad</button>
              <button type="button" class="pill-btn" data-sigtab="type">🖋️ Type Signature</button>
              <button type="button" class="pill-btn" data-sigtab="upload">🖼️ Upload Image</button>
            </div>
            <div id="sigPaneDraw" class="sig-canvas-container">
              <canvas id="sigPadCanvas" width="440" height="130" class="sig-canvas"></canvas>
              <div class="sig-toolbar">
                <div class="color-dots">
                  <div class="color-dot dot-black active" data-color="#000000"></div>
                  <div class="color-dot dot-blue" data-color="#1e40af"></div>
                  <div class="color-dot dot-red" data-color="#b91c1c"></div>
                </div>
                <button type="button" class="btn btn-ghost btn-sm" id="btnClearSignature">Clear Pad</button>
              </div>
            </div>
            <div id="sigPaneType" style="display:none;flex-direction:column;align-items:center;gap:10px;">
              <input type="text" id="txtTypedSig" class="text-input" value="Santhosh K." placeholder="Type your full name" style="max-width:340px;">
              <div class="sig-type-preview" id="typedSigPreview" style="font-family:'Brush Script MT', cursive;">Santhosh K.</div>
            </div>
            <div id="sigPaneUpload" style="display:none;">
              <input type="file" id="inpSigImageFile" accept="image/*" class="text-input">
            </div>
            <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.28);border-radius:8px;padding:12px;">
              <label style="display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:#34d399;cursor:pointer;">
                <input type="checkbox" id="chkCryptoSign">
                <span>🔐 Apply Cryptographic PKCS#7 / PAdES Digital Signature (.pfx)</span>
              </label>
              <div id="cryptoSignPanel" style="display:none;margin-top:10px;" class="control-grid-2">
                <div class="control-item"><label class="control-label">Signer Name:</label><input type="text" id="txtSignerName" class="text-input" value="UltraPDF Signer"></div>
                <div class="control-item"><label class="control-label">Reason:</label><input type="text" id="txtSignReason" class="text-input" value="Document Approved"></div>
                <div class="control-item"><label class="control-label">Optional .pfx/.p12 Certificate:</label><input type="file" id="inpPfxFile" accept=".pfx,.p12" class="text-input"></div>
                <div class="control-item"><label class="control-label">Certificate Password:</label>
                  <div style="display:flex;gap:8px;">
                    <input type="password" id="txtPfxPass" class="text-input" value="123456">
                    <button type="button" class="btn btn-secondary btn-sm" id="btnGenSelfCert" title="Generate and download a self-signed .pfx">New .pfx</button>
                  </div>
                </div>
              </div>
            </div>
            <div id="studioCanvasMount"></div>
          </div>`;
        setupSignaturePad();
        setupSignatureTabsAndCrypto();
        break;

      case 'redact_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-item">
            <span class="control-label">Auto-Detect Sensitive PII Patterns:</span>
            <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px;font-size:13px;">
              <label><input type="checkbox" class="chk-pii" value="cards" checked> Credit Cards</label>
              <label><input type="checkbox" class="chk-pii" value="emails" checked> Emails</label>
              <label><input type="checkbox" class="chk-pii" value="phones" checked> Phones</label>
              <label><input type="checkbox" class="chk-pii" value="ssn"> SSN</label>
              <label><input type="checkbox" class="chk-pii" value="iban"> IBAN</label>
              <label><input type="checkbox" class="chk-pii" value="aadhaar"> Aadhaar</label>
              <label><input type="checkbox" class="chk-pii" value="pan"> PAN</label>
              <label><input type="checkbox" class="chk-pii" value="api_keys"> API Keys</label>
            </div>
          </div>
          <div class="control-item" style="margin-top:12px;">
            <label class="control-label" for="txtCustomKeywords">Custom Confidential Keywords (Comma separated):</label>
            <input type="text" id="txtCustomKeywords" class="text-input" placeholder="e.g. John Doe, Project Titan, Salary">
          </div>
          <div id="studioCanvasMount"></div>`;
        break;

      case 'metadata_sanitizer':
        dynamicToolControls.innerHTML = `
          <div id="metaInspectBadge" style="font-size:12.5px;color:#cbd5e1;margin-bottom:10px;">Upload a PDF to inspect metadata, links, attachments &amp; embedded JS.</div>
          <div class="control-grid-2">
            <div class="control-item"><label class="control-label">Title</label><input type="text" id="metaTitle" class="text-input"></div>
            <div class="control-item"><label class="control-label">Author</label><input type="text" id="metaAuthor" class="text-input"></div>
            <div class="control-item"><label class="control-label">Subject</label><input type="text" id="metaSubject" class="text-input"></div>
            <div class="control-item"><label class="control-label">Keywords</label><input type="text" id="metaKeywords" class="text-input"></div>
          </div>
          <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;font-size:13px;">
            <label><input type="checkbox" id="chkMetaStripAll"> Strip All Metadata &amp; XMP</label>
            <label><input type="checkbox" id="chkSanitizeAttachments" checked> Remove Embedded Files</label>
            <label><input type="checkbox" id="chkSanitizeLinks"> Strip External Hyperlinks</label>
            <label><input type="checkbox" id="chkSanitizeAnnots"> Remove Comments/Annotations</label>
          </div>`;
        break;

      case 'organize_pdf':
        dynamicToolControls.innerHTML = `
          <div class="organize-toolbar">
            <span class="control-label">Drag cards to reorder • Click icons to rotate/delete:</span>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button type="button" class="btn btn-ghost btn-sm" id="btnOrgRotAll">↻ Rotate All</button>
              <button type="button" class="btn btn-ghost btn-sm" id="btnOrgReverse">⇄ Reverse</button>
              <button type="button" class="btn btn-ghost btn-sm" id="btnOrgDelEven">✂️ Drop Even</button>
            </div>
          </div>
          <div id="organizeGridContainer" class="organize-page-grid">
            <div style="padding:24px;color:var(--text-muted);text-align:center;width:100%;">Select a PDF above to load interactive page cards.</div>
          </div>`;
        document.getElementById('btnOrgRotAll')?.addEventListener('click', () => {
          appState.organizePages.forEach(p => { appState.pageRotations[p.origIdx] = ((appState.pageRotations[p.origIdx] || 0) + 90) % 360; });
          renderOrganizePageGrid();
        });
        document.getElementById('btnOrgReverse')?.addEventListener('click', () => { appState.organizePages.reverse(); renderOrganizePageGrid(); });
        document.getElementById('btnOrgDelEven')?.addEventListener('click', () => {
          appState.organizePages = appState.organizePages.filter((_, i) => i % 2 === 0);
          renderOrganizePageGrid();
        });
        break;

      case 'ai_summarize':
        dynamicToolControls.innerHTML = `
          <div class="control-grid-2">
            <div class="control-item"><label class="control-label">Summary Takeaways: <span id="lblBulletsVal">6 Bullets</span></label><input type="range" id="numSummaryBullets" min="3" max="12" value="6" class="range-slider"></div>
            <div class="control-item" style="justify-content:center;"><label style="display:flex;align-items:center;gap:8px;font-size:13px;"><input type="checkbox" id="chkSumOllama"> <span>Use Local Ollama LLM (if running on :11434)</span></label></div>
          </div>`;
        document.getElementById('numSummaryBullets')?.addEventListener('input', (e) => { document.getElementById('lblBulletsVal').textContent = `${e.target.value} Bullets`; });
        break;

      case 'chat_pdf':
        dynamicToolControls.innerHTML = `
          <div class="chat-panel">
            <div class="chat-quick-prompts">
              <button type="button" class="btn btn-ghost btn-sm chat-q-btn" data-q="What are the key takeaways and main conclusions?">Key takeaways</button>
              <button type="button" class="btn btn-ghost btn-sm chat-q-btn" data-q="List all dates, deadlines, and monetary amounts mentioned.">Dates &amp; amounts</button>
              <button type="button" class="btn btn-ghost btn-sm chat-q-btn" data-q="What risks, obligations, or action items are listed?">Risks &amp; actions</button>
              <label style="display:flex;align-items:center;gap:6px;font-size:12px;margin-left:auto;"><input type="checkbox" id="chkChatOllama"> Local Ollama</label>
            </div>
            <div class="chat-thread" id="chatThreadBox">
              <div class="chat-bubble assistant">Upload one or more PDFs above and ask anything — answers cite exact page numbers you can click to preview!</div>
            </div>
            <div style="display:flex;gap:8px;">
              <input type="text" id="txtChatQuestion" class="text-input" placeholder="Ask a question about your uploaded PDF(s)..." style="flex:1;">
              <button type="button" class="btn btn-primary" id="btnSendChatQ">Ask PDF</button>
            </div>
          </div>`;
        wireChatPdfControls();
        break;

      case 'translate_pdf':
        dynamicToolControls.innerHTML = `
          <div class="control-grid-2">
            <div class="control-item"><label class="control-label" for="selTargetLang">Target Language:</label>
              <select id="selTargetLang" class="select-input">
                <option value="es">Spanish (Español)</option><option value="fr">French (Français)</option><option value="de">German (Deutsch)</option>
                <option value="it">Italian (Italiano)</option><option value="pt">Portuguese (Português)</option><option value="ru">Russian (Русский)</option>
                <option value="zh">Chinese (中文)</option><option value="ja">Japanese (日本語)</option><option value="hi">Hindi (हिन्दी)</option><option value="ar">Arabic (العربية)</option>
              </select>
            </div>
            <div class="control-item"><label class="control-label" for="selTransEngine">Translation Engine:</label>
              <select id="selTransEngine" class="select-input">
                <option value="auto">Auto (Ollama -> Neural -> Offline Glossary)</option>
                <option value="online">Neural Online Translator</option>
                <option value="ollama">Local Ollama LLM (100% Offline)</option>
                <option value="offline">Offline Glossary Only</option>
              </select>
            </div>
          </div>
          <label style="display:flex;align-items:center;gap:8px;font-size:13px;margin-top:10px;"><input type="checkbox" id="chkBilingual"> <span>Bilingual Mode (Keep original text below translated blocks)</span></label>`;
        break;

      case 'pdf_forms':
        dynamicToolControls.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
            <span class="control-label">Detected Fillable Fields &amp; Visual Form Designer:</span>
            <label style="display:flex;align-items:center;gap:6px;font-size:12.5px;"><input type="checkbox" id="chkFlattenForm"> <span>Flatten Form (lock fields permanently)</span></label>
          </div>
          <div id="formFieldsContainer" style="margin-bottom:12px;"><p style="font-size:13px;color:var(--text-muted);">Upload a PDF form above to detect fields or click on the canvas below to add new fields.</p></div>
          <div id="studioCanvasMount"></div>`;
        break;

      case 'workflow':
        renderWorkflowStepSequencer();
        break;

      default:
        dynamicToolControls.innerHTML = `<p style="font-size:13px;color:var(--text-secondary);">Ready to process. Click <strong>${tool.actionText || 'Process'}</strong> to begin.</p>`;
    }
  }

  // ===========================================================================
  // 5. SPECIALIZED INTERACTIVE MODULES
  // ===========================================================================
  function syncCurrentSignatureToStudio() {
    if (appState.sigMode === 'draw') {
      const c = document.getElementById('sigPadCanvas');
      if (c) UltraCanvasStudio.setSignatureDataUrl(c.toDataURL('image/png'));
    } else if (appState.sigMode === 'upload') {
      UltraCanvasStudio.setSignatureDataUrl(appState.uploadedSigDataUrl || '');
    } else if (appState.sigMode === 'type') {
      const txt = document.getElementById('txtTypedSig')?.value || 'Signature';
      const off = document.createElement('canvas');
      off.width = 420; off.height = 120;
      const ctx = off.getContext('2d');
      ctx.font = 'italic 54px "Brush Script MT", Georgia, serif';
      ctx.fillStyle = '#0f172a';
      ctx.textBaseline = 'middle';
      ctx.fillText(txt, 16, 60);
      UltraCanvasStudio.setSignatureDataUrl(off.toDataURL('image/png'));
    }
  }

  function setupSignaturePad() {
    const canvas = document.getElementById('sigPadCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = appState.sigColor;
    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const cx = e.touches ? e.touches[0].clientX : e.clientX;
      const cy = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: (cx - r.left) * (canvas.width / r.width), y: (cy - r.top) * (canvas.height / r.height) };
    };
    const start = (e) => { appState.sigDrawing = true; const p = getPos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y); e.preventDefault(); };
    const move = (e) => { if (!appState.sigDrawing) return; const p = getPos(e); ctx.lineTo(p.x, p.y); ctx.stroke(); e.preventDefault(); };
    const stop = () => { if (appState.sigDrawing) { appState.sigDrawing = false; syncCurrentSignatureToStudio(); } };
    canvas.addEventListener('mousedown', start); canvas.addEventListener('mousemove', move); canvas.addEventListener('mouseup', stop); canvas.addEventListener('mouseleave', stop);
    canvas.addEventListener('touchstart', start, { passive: false }); canvas.addEventListener('touchmove', move, { passive: false }); canvas.addEventListener('touchend', stop);

    document.querySelectorAll('.color-dot').forEach(dot => dot.addEventListener('click', () => {
      document.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
      dot.classList.add('active');
      appState.sigColor = dot.dataset.color;
      ctx.strokeStyle = appState.sigColor;
    }));
    document.getElementById('btnClearSignature')?.addEventListener('click', () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      syncCurrentSignatureToStudio();
    });
  }

  function setupSignatureTabsAndCrypto() {
    appState.sigMode = 'draw';
    document.querySelectorAll('[data-sigtab]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('[data-sigtab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.sigMode = btn.dataset.sigtab;
      document.getElementById('sigPaneDraw').style.display = appState.sigMode === 'draw' ? 'flex' : 'none';
      document.getElementById('sigPaneType').style.display = appState.sigMode === 'type' ? 'flex' : 'none';
      document.getElementById('sigPaneUpload').style.display = appState.sigMode === 'upload' ? 'block' : 'none';
      syncCurrentSignatureToStudio();
    }));

    document.getElementById('txtTypedSig')?.addEventListener('input', (e) => {
      const prev = document.getElementById('typedSigPreview');
      if (prev) prev.textContent = e.target.value || 'Signature';
      syncCurrentSignatureToStudio();
    });

    document.getElementById('inpSigImageFile')?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        appState.uploadedSigDataUrl = reader.result;
        UltraCanvasStudio.setSignatureDataUrl(reader.result);
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('chkCryptoSign')?.addEventListener('change', (e) => {
      document.getElementById('cryptoSignPanel').style.display = e.target.checked ? 'grid' : 'none';
    });

    document.getElementById('inpPfxFile')?.addEventListener('change', (e) => {
      appState.certFile = e.target.files?.[0] || null;
    });

    document.getElementById('btnGenSelfCert')?.addEventListener('click', async () => {
      const fd = new FormData();
      fd.append('common_name', document.getElementById('txtSignerName')?.value || 'UltraPDF Signer');
      fd.append('password', document.getElementById('txtPfxPass')?.value || '123456');
      const res = await fetch('/api/tool/generate-cert', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success && data.download_url) {
        const a = document.createElement('a');
        a.href = data.download_url;
        a.download = data.filename;
        a.click();
        showToast(`Generated & downloaded ${data.filename}`, 'success');
      }
    });
  }

  function wireChatPdfControls() {
    const askFn = async (qText) => {
      const inp = document.getElementById('txtChatQuestion');
      const q = (qText || inp?.value || '').trim();
      if (!q) return;
      if (appState.toolFiles.length === 0) { showToast('Upload at least one PDF first', 'error'); return; }
      if (inp) inp.value = '';

      const thread = document.getElementById('chatThreadBox');
      thread.innerHTML += `<div class="chat-bubble user">${escHtml(q)}</div>`;
      const pendingId = 'pend_' + Date.now();
      thread.innerHTML += `<div class="chat-bubble assistant" id="${pendingId}">Searching pages...</div>`;
      thread.scrollTop = thread.scrollHeight;

      const fd = new FormData();
      fd.append('question', q);
      fd.append('use_ollama', document.getElementById('chkChatOllama')?.checked ? 'true' : 'false');
      appState.toolFiles.forEach(f => fd.append('files', f));

      try {
        const res = await fetch('/api/tool/chat-pdf', { method: 'POST', body: fd });
        const data = await res.json();
        const bubble = document.getElementById(pendingId);
        const cites = (data.citations || []).map(c => `<button type="button" class="citation-pill" data-pg="${c.page}">📄 ${escHtml(c.file)} p.${c.page}</button>`).join('');
        bubble.innerHTML = `<div>${escHtml(data.answer)}</div><div class="citation-pills">${cites}</div>`;
        bubble.querySelectorAll('.citation-pill').forEach(btn => btn.addEventListener('click', () => openSourcePdfPagePreview(parseInt(btn.dataset.pg, 10))));
        appState.chatMessages.push({ q, a: data.answer });
        thread.scrollTop = thread.scrollHeight;
      } catch (err) {
        const bubble = document.getElementById(pendingId);
        if (bubble) bubble.textContent = 'Error: ' + err.message;
      }
    };

    document.getElementById('btnSendChatQ')?.addEventListener('click', () => askFn());
    document.getElementById('txtChatQuestion')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') askFn(); });
    document.querySelectorAll('.chat-q-btn').forEach(b => b.addEventListener('click', () => askFn(b.dataset.q)));
  }

  async function openSourcePdfPagePreview(pageNumber) {
    if (!appState.toolFiles.length) return;
    const fd = new FormData();
    fd.append('file', appState.toolFiles[0]);
    fd.append('max_pages', '30');
    const res = await fetch('/api/tool/pdf-preview-pages', { method: 'POST', body: fd });
    const data = await res.json();
    if (data.success && data.pages?.length) {
      openMultiPageModal(appState.toolFiles[0].name, data.pages, Math.max(0, pageNumber - 1));
    }
  }

  // Camera Scanner
  const cameraVideo = document.getElementById('cameraVideo');
  const cameraCanvas = document.getElementById('cameraCanvas');
  const cameraSnapsReel = document.getElementById('cameraSnapsReel');
  document.getElementById('btnStartCamera')?.addEventListener('click', async () => {
    try {
      appState.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } });
      if (cameraVideo) cameraVideo.srcObject = appState.cameraStream;
      showToast('Camera active!', 'success');
    } catch (err) { showToast('Camera unavailable: ' + err.message, 'error'); }
  });
  document.getElementById('btnStopCamera')?.addEventListener('click', stopCameraStream);
  function stopCameraStream() {
    if (appState.cameraStream) { appState.cameraStream.getTracks().forEach(t => t.stop()); appState.cameraStream = null; }
  }
  document.getElementById('btnSnapPhoto')?.addEventListener('click', () => {
    if (!cameraVideo || !cameraVideo.videoWidth) { showToast('Start webcam before capturing', 'error'); return; }
    cameraCanvas.width = cameraVideo.videoWidth; cameraCanvas.height = cameraVideo.videoHeight;
    cameraCanvas.getContext('2d').drawImage(cameraVideo, 0, 0);
    cameraCanvas.toBlob((blob) => {
      const file = new File([blob], `scan_page_${appState.scannedSnaps.length + 1}.jpg`, { type: 'image/jpeg' });
      appState.scannedSnaps.push(file);
      appState.toolFiles.push(file);
      const card = document.createElement('div');
      card.className = 'snap-card';
      card.innerHTML = `<img src="${URL.createObjectURL(blob)}"><button class="btn-remove-snap">&times;</button>`;
      card.querySelector('button').onclick = () => { card.remove(); const i = appState.toolFiles.indexOf(file); if (i > -1) appState.toolFiles.splice(i, 1); };
      cameraSnapsReel?.appendChild(card);
    }, 'image/jpeg', 0.9);
  });

  // Drag-and-Drop Organize PDF
  async function loadOrganizePageThumbnails(pdfFile) {
    const container = document.getElementById('organizeGridContainer');
    if (!container) return;
    container.innerHTML = `<div style="padding:24px;text-align:center;color:#818cf8;">Loading pages from "${escHtml(pdfFile.name)}"...</div>`;
    try {
      const fd = new FormData(); fd.append('file', pdfFile);
      const res = await fetch('/api/tool/page-thumbnails', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.detail || 'Thumbnail error');
      appState.organizePages = data.pages.map((p, idx) => ({ origIdx: idx, ...p }));
      appState.pageRotations = {};
      renderOrganizePageGrid();
    } catch (err) {
      container.innerHTML = `<div style="padding:24px;color:#fb7185;">Error: ${escHtml(err.message)}</div>`;
    }
  }

  let dragSrcIdx = null;
  function renderOrganizePageGrid() {
    const container = document.getElementById('organizeGridContainer');
    if (!container) return;
    container.innerHTML = '';
    appState.organizePages.forEach((page, displayIdx) => {
      const card = document.createElement('div');
      card.className = 'organize-card';
      card.draggable = true;
      const rot = appState.pageRotations[page.origIdx] || 0;
      card.innerHTML = `
        <img class="organize-thumb" src="${page.thumbnail}" style="transform:rotate(${rot}deg);" alt="Page ${page.page}">
        <div class="organize-meta">
          <span>#${displayIdx + 1} (p.${page.page})</span>
          <div class="organize-actions">
            <button type="button" class="btn-icon-xs btn-rotate" title="Rotate 90°">↻</button>
            <button type="button" class="btn-icon-xs btn-icon-danger btn-delete" title="Delete">🗑️</button>
          </div>
        </div>`;
      card.addEventListener('dragstart', () => { dragSrcIdx = displayIdx; card.classList.add('dragging'); });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('drag-over'); });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        card.classList.remove('drag-over');
        if (dragSrcIdx !== null && dragSrcIdx !== displayIdx) {
          const [moved] = appState.organizePages.splice(dragSrcIdx, 1);
          appState.organizePages.splice(displayIdx, 0, moved);
          renderOrganizePageGrid();
        }
      });
      card.querySelector('.btn-rotate').addEventListener('click', (e) => {
        e.stopPropagation();
        appState.pageRotations[page.origIdx] = ((appState.pageRotations[page.origIdx] || 0) + 90) % 360;
        renderOrganizePageGrid();
      });
      card.querySelector('.btn-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        appState.organizePages.splice(displayIdx, 1);
        renderOrganizePageGrid();
      });
      container.appendChild(card);
    });
  }

  // Form Fields Loader
  async function loadPdfFormFields(pdfFile) {
    const container = document.getElementById('formFieldsContainer');
    if (!container) return;
    container.innerHTML = `<div style="color:#818cf8;font-size:12.5px;">Scanning AcroForm fields...</div>`;
    try {
      const fd = new FormData(); fd.append('file', pdfFile);
      const res = await fetch('/api/tool/form-fields', { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.fields?.length) {
        container.innerHTML = `<div style="color:var(--text-muted);font-size:12.5px;">No existing AcroForm fields detected — click on the PDF preview below to add interactive fields!</div>`;
        return;
      }
      appState.detectedFormFields = data.fields;
      container.innerHTML = `<div style="display:flex;flex-direction:column;gap:8px;max-height:190px;overflow-y:auto;">
        ${data.fields.map(f => `<div style="display:flex;align-items:center;gap:8px;font-size:12.5px;"><span style="min-width:130px;font-family:var(--font-mono);color:var(--text-secondary);">${escHtml(f.name)}:</span><input type="text" class="text-input text-input-sm form-field-input" data-field="${escHtml(f.name)}" value="${escHtml(f.value || '')}" style="flex:1;"></div>`).join('')}
      </div>`;
    } catch (err) {
      container.innerHTML = `<div style="color:#fb7185;">Error: ${escHtml(err.message)}</div>`;
    }
  }

  // Bookmarks Inspector
  async function loadPdfBookmarks(pdfFile) {
    const fd = new FormData(); fd.append('file', pdfFile);
    const res = await fetch('/api/tool/inspect-bookmarks', { method: 'POST', body: fd });
    const data = await res.json();
    appState.bookmarksList = data.bookmarks || [];
    renderBookmarksList();
  }

  function renderBookmarksList() {
    const box = document.getElementById('bookmarksEditorList');
    if (!box) return;
    if (appState.bookmarksList.length === 0) {
      box.innerHTML = `<p style="font-size:12.5px;color:var(--text-muted);">No bookmarks yet. Click "+ Add Bookmark" or enable Auto-detect headings.</p>`;
      return;
    }
    box.innerHTML = '';
    appState.bookmarksList.forEach((bm, idx) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;gap:8px;align-items:center;';
      row.innerHTML = `
        <input type="number" class="number-input number-sm bm-lvl" value="${bm.level}" min="1" max="4" style="width:55px;" title="Level">
        <input type="text" class="text-input bm-title" value="${escHtml(bm.title)}" style="flex:1;" placeholder="Bookmark Title">
        <input type="number" class="number-input number-sm bm-pg" value="${bm.page}" min="1" style="width:70px;" title="Page">
        <button type="button" class="btn-icon-xs btn-icon-danger">&times;</button>`;
      row.querySelector('.bm-lvl').oninput = e => { bm.level = parseInt(e.target.value || 1, 10); };
      row.querySelector('.bm-title').oninput = e => { bm.title = e.target.value; };
      row.querySelector('.bm-pg').oninput = e => { bm.page = parseInt(e.target.value || 1, 10); };
      row.querySelector('button').onclick = () => { appState.bookmarksList.splice(idx, 1); renderBookmarksList(); };
      box.appendChild(row);
    });
  }

  // Metadata Inspector
  async function loadPdfMetadataInspect(pdfFile) {
    const fd = new FormData(); fd.append('file', pdfFile);
    const res = await fetch('/api/tool/inspect-metadata', { method: 'POST', body: fd });
    const data = await res.json();
    if (!data.success) return;
    const m = data.metadata || {};
    if (document.getElementById('metaTitle')) document.getElementById('metaTitle').value = m.title || '';
    if (document.getElementById('metaAuthor')) document.getElementById('metaAuthor').value = m.author || '';
    if (document.getElementById('metaSubject')) document.getElementById('metaSubject').value = m.subject || '';
    if (document.getElementById('metaKeywords')) document.getElementById('metaKeywords').value = m.keywords || '';
    const badge = document.getElementById('metaInspectBadge');
    if (badge) {
      badge.innerHTML = `Pages: <strong>${data.pages}</strong> • External Links: <strong>${data.external_links_count}</strong> • Embedded Files: <strong>${(data.embedded_files || []).length}</strong> • Annotations: <strong>${data.annotations_count}</strong> • JS/OpenAction: <strong style="color:${data.has_javascript_or_openaction ? '#fb7185' : '#34d399'};">${data.has_javascript_or_openaction ? 'Detected' : 'None'}</strong>`;
    }
  }

  // Workflow Builder with Saved Presets + 14 Tools
  async function renderWorkflowStepSequencer() {
    if (!dynamicToolControls) return;
    dynamicToolControls.innerHTML = `
      <div class="control-item">
        <span class="control-label">1-Click Saved Workflow Templates:</span>
        <div class="workflow-preset-chips" id="workflowPresetChips">Loading presets...</div>
        <span class="control-label">Pipeline Steps (Executed Sequentially):</span>
        <div id="workflowStepsList" style="display:flex;flex-direction:column;gap:8px;margin-top:8px;"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">
          <select id="selAddStepTool" class="select-input" style="flex:1;min-width:200px;">
            <option value="merge">Merge Documents</option>
            <option value="remove_blank_pages">Remove Blank Pages</option>
            <option value="ocr">Run Offline OCR</option>
            <option value="rotate">Rotate Pages (90°)</option>
            <option value="crop">Crop Margins (5%)</option>
            <option value="redact">Auto-Redact PII</option>
            <option value="watermark">Apply Watermark</option>
            <option value="page_numbers">Add Page Numbers</option>
            <option value="header_footer">Stamp Header &amp; Footer</option>
            <option value="impose">Impose 2-Up Layout</option>
            <option value="compress">Compress PDF</option>
            <option value="pdf_to_pdfa">Convert to PDF/A-2b</option>
            <option value="protect">AES-256 Password Protect</option>
            <option value="split">Split Into Parts (ZIP)</option>
          </select>
          <button type="button" class="btn btn-secondary btn-sm" id="btnAddWorkflowStep">+ Add Step</button>
          <button type="button" class="btn btn-ghost btn-sm" id="btnSaveWorkflowPreset">💾 Save Preset</button>
        </div>
      </div>`;

    async function refreshPresets() {
      const chips = document.getElementById('workflowPresetChips');
      if (!chips) return;
      try {
        const res = await fetch('/api/workflows/presets');
        const data = await res.json();
        appState.workflowPresets = data.presets || [];
        chips.innerHTML = '';
        appState.workflowPresets.forEach(p => {
          const wrap = document.createElement('div');
          wrap.style.cssText = 'display:inline-flex;align-items:center;gap:4px;';
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-ghost btn-sm';
          btn.textContent = `⚡ ${p.name}`;
          btn.title = p.desc;
          btn.onclick = () => { appState.workflowSteps = JSON.parse(JSON.stringify(p.steps)); updateStepsView(); showToast(`Loaded preset "${p.name}"`, 'success'); };
          wrap.appendChild(btn);
          if (p.custom) {
            const del = document.createElement('button');
            del.type = 'button';
            del.className = 'btn-icon-xs btn-icon-danger';
            del.textContent = '×';
            del.onclick = async () => { await fetch(`/api/workflows/presets/${p.id}`, { method: 'DELETE' }); refreshPresets(); };
            wrap.appendChild(del);
          }
          chips.appendChild(wrap);
        });
      } catch (e) { chips.textContent = ''; }
    }

    function updateStepsView() {
      const list = document.getElementById('workflowStepsList');
      if (!list) return;
      list.innerHTML = '';
      appState.workflowSteps.forEach((st, idx) => {
        const item = document.createElement('div');
        item.className = 'workflow-step-card';
        const optPlaceholder = st.tool === 'watermark' ? 'Watermark text' : (st.tool === 'protect' ? 'Password' : (st.tool === 'compress' ? 'balanced/ultrabw/maximum' : 'Optional JSON or note'));
        const optKey = st.tool === 'watermark' ? 'text' : (st.tool === 'protect' ? 'password' : (st.tool === 'compress' ? 'preset' : null));
        item.innerHTML = `
          <span><strong>Step ${idx + 1}:</strong> ${st.tool.toUpperCase()}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            ${optKey ? `<input type="text" class="text-input step-opt-inp" value="${escHtml(st.options?.[optKey] || '')}" placeholder="${optPlaceholder}" style="padding:4px 8px;font-size:12px;width:160px;">` : ''}
            <button type="button" class="btn-icon-xs btn-up" title="Move Up">↑</button>
            <button type="button" class="btn-icon-xs btn-down" title="Move Down">↓</button>
            <button type="button" class="btn-icon-xs btn-icon-danger btn-rm">Remove</button>
          </div>`;
        if (optKey) {
          item.querySelector('.step-opt-inp').oninput = (e) => { st.options = st.options || {}; st.options[optKey] = e.target.value; };
        }
        item.querySelector('.btn-up').onclick = () => { if (idx > 0) { [appState.workflowSteps[idx - 1], appState.workflowSteps[idx]] = [appState.workflowSteps[idx], appState.workflowSteps[idx - 1]]; updateStepsView(); } };
        item.querySelector('.btn-down').onclick = () => { if (idx < appState.workflowSteps.length - 1) { [appState.workflowSteps[idx + 1], appState.workflowSteps[idx]] = [appState.workflowSteps[idx], appState.workflowSteps[idx + 1]]; updateStepsView(); } };
        item.querySelector('.btn-rm').onclick = () => { appState.workflowSteps.splice(idx, 1); updateStepsView(); };
        list.appendChild(item);
      });
    }

    updateStepsView();
    refreshPresets();

    document.getElementById('btnAddWorkflowStep')?.addEventListener('click', () => {
      appState.workflowSteps.push({ tool: document.getElementById('selAddStepTool').value, options: {} });
      updateStepsView();
    });
    document.getElementById('btnSaveWorkflowPreset')?.addEventListener('click', async () => {
      const name = window.prompt('Name this workflow preset:', 'My Custom Pipeline');
      if (!name) return;
      await fetch('/api/workflows/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, steps: appState.workflowSteps }),
      });
      showToast('Workflow preset saved!', 'success');
      refreshPresets();
    });
  }

  // ===========================================================================
  // 6. EXECUTE TOOL HANDLER (With Live SSE for Heavy Tools)
  // ===========================================================================
  btnExecuteTool?.addEventListener('click', handleExecuteTool);

  async function handleExecuteTool() {
    const tool = appState.selectedTool;
    if (!tool) return;
    const isUrlTool = (tool.id === 'html_to_pdf');
    const urlVal = document.getElementById('txtWebUrl')?.value.trim() || '';

    if (isUrlTool && !urlVal) { showToast('Please enter a Webpage URL or paste HTML code', 'error'); return; }
    if (!isUrlTool && appState.toolFiles.length === 0) { showToast('Please select at least one file first', 'error'); return; }

    const options = {};
    const studioData = UltraCanvasStudio.getExportPayload();

    if (tool.id === 'split_pdf') {
      options.mode = document.querySelector('input[name="split_mode"]:checked')?.value || 'ranges';
      options.ranges = document.getElementById('txtSplitRanges')?.value || '1-2';
      options.parts = document.getElementById('numSplitParts')?.value || 2;
    } else if (tool.id === 'compress_pdf') {
      options.preset = document.querySelector('input[name="comp_preset"]:checked')?.value || 'balanced';
      if (options.preset === 'target') options.target_mb = document.getElementById('numCompTarget')?.value || 5;
    } else if (tool.id === 'ocr_pdf') {
      options.lang = document.getElementById('selOcrLang')?.value || 'eng';
      options.force_ocr = !!document.getElementById('chkForceOcr')?.checked;
    } else if (tool.id === 'pdf_to_powerpoint') {
      options.editable = !!document.getElementById('chkPptEditable')?.checked;
    } else if (tool.id === 'watermark_pdf') {
      options.text = document.getElementById('txtWatermarkVal')?.value || 'CONFIDENTIAL';
      options.angle = document.getElementById('selWatermarkAngle')?.value || 45;
      options.opacity = (document.getElementById('numWatermarkOpacity')?.value || 35) / 100.0;
      options.font_size = document.getElementById('numWatermarkSize')?.value || 48;
    } else if (tool.id === 'protect_pdf') {
      const pw = document.getElementById('txtProtectPassword')?.value || '';
      if (!pw) { showToast('Password cannot be empty', 'error'); return; }
      options.password = pw;
      options.allow_print = !!document.getElementById('chkPermPrint')?.checked;
      options.allow_copy = !!document.getElementById('chkPermCopy')?.checked;
      options.allow_modify = !!document.getElementById('chkPermModify')?.checked;
    } else if (tool.id === 'unlock_pdf') {
      options.password = document.getElementById('txtUnlockPassword')?.value || '';
    } else if (tool.id === 'rotate_pdf') {
      options.angle = parseInt(document.querySelector('input[name="rot_angle"]:checked')?.value || '90', 10);
      options.pages = document.getElementById('selRotatePages')?.value || 'all';
    } else if (tool.id === 'page_numbers') {
      options.position = document.getElementById('selPageNumPos')?.value || 'bottom-center';
      options.format = document.getElementById('txtPageNumFormat')?.value || 'Page {page} of {total}';
    } else if (tool.id === 'crop_pdf') {
      options.custom_box = {
        left: (parseFloat(document.getElementById('numCropLeft')?.value || 5)) / 100,
        top: (parseFloat(document.getElementById('numCropTop')?.value || 5)) / 100,
        right: (parseFloat(document.getElementById('numCropRight')?.value || 5)) / 100,
        bottom: (parseFloat(document.getElementById('numCropBottom')?.value || 5)) / 100,
      };
    } else if (tool.id === 'impose_pdf') {
      options.mode = document.getElementById('selImposeMode')?.value || '2up';
      options.borders = !!document.getElementById('chkImposeBorders')?.checked;
    } else if (tool.id === 'header_footer_pdf') {
      options.header_left = document.getElementById('hfTopL')?.value || '';
      options.header_center = document.getElementById('hfTopC')?.value || '';
      options.header_right = document.getElementById('hfTopR')?.value || '';
      options.footer_left = document.getElementById('hfBotL')?.value || '';
      options.footer_center = document.getElementById('hfBotC')?.value || '';
      options.footer_right = document.getElementById('hfBotR')?.value || '';
      options.bates_start = parseInt(document.getElementById('hfBatesStart')?.value || '1', 10);
    } else if (tool.id === 'bookmarks_editor') {
      options.bookmarks = appState.bookmarksList;
      options.auto_detect = !!document.getElementById('chkAutoDetectToc')?.checked;
    } else if (tool.id === 'metadata_sanitizer') {
      options.metadata = {
        title: document.getElementById('metaTitle')?.value || '',
        author: document.getElementById('metaAuthor')?.value || '',
        subject: document.getElementById('metaSubject')?.value || '',
        keywords: document.getElementById('metaKeywords')?.value || '',
      };
      options.strip_all = !!document.getElementById('chkMetaStripAll')?.checked;
      options.remove_attachments = !!document.getElementById('chkSanitizeAttachments')?.checked;
      options.remove_links = !!document.getElementById('chkSanitizeLinks')?.checked;
      options.remove_annotations = !!document.getElementById('chkSanitizeAnnots')?.checked;
    } else if (tool.id === 'redact_pdf') {
      options.pii_types = Array.from(document.querySelectorAll('.chk-pii:checked')).map(c => c.value);
      options.keywords = (document.getElementById('txtCustomKeywords')?.value || '').split(',').map(s => s.trim()).filter(Boolean);
      options.manual_boxes = studioData.redactBoxes;
    } else if (tool.id === 'edit_pdf') {
      options.annotations = studioData.annotations;
    } else if (tool.id === 'sign_pdf') {
      syncCurrentSignatureToStudio();
      const srect = studioData.signatureRect;
      options.signature_data_url = appState.sigMode === 'upload'
        ? (appState.uploadedSigDataUrl || '')
        : (appState.sigMode === 'draw' ? (document.getElementById('sigPadCanvas')?.toDataURL('image/png') || '') : (function () {
          const off = document.createElement('canvas'); off.width = 420; off.height = 120;
          const ctx = off.getContext('2d'); ctx.font = 'italic 54px "Brush Script MT", Georgia, serif'; ctx.fillStyle = '#0f172a'; ctx.textBaseline = 'middle';
          ctx.fillText(document.getElementById('txtTypedSig')?.value || 'Signature', 16, 60); return off.toDataURL('image/png');
        })());
      options.page = srect.page || 1;
      options.x = srect.x; options.y = srect.y; options.width = srect.width; options.height = srect.height;
      options.cryptographic = !!document.getElementById('chkCryptoSign')?.checked;
      options.signer_name = document.getElementById('txtSignerName')?.value || 'UltraPDF Signer';
      options.reason = document.getElementById('txtSignReason')?.value || 'Document Approved';
      options.pfx_password = document.getElementById('txtPfxPass')?.value || '123456';
    } else if (tool.id === 'organize_pdf') {
      options.page_order = appState.organizePages.map(p => p.origIdx);
      options.rotations = appState.pageRotations;
    } else if (tool.id === 'ai_summarize') {
      options.bullets = parseInt(document.getElementById('numSummaryBullets')?.value || '6', 10);
      options.use_ollama = !!document.getElementById('chkSumOllama')?.checked;
    } else if (tool.id === 'chat_pdf') {
      options.question = appState.chatMessages.length ? appState.chatMessages.map(m => `Q: ${m.q}\nA: ${m.a}`).join('\n\n') : 'Summarize key sections';
      options.use_ollama = !!document.getElementById('chkChatOllama')?.checked;
    } else if (tool.id === 'translate_pdf') {
      options.language = document.getElementById('selTargetLang')?.value || 'es';
      options.engine = document.getElementById('selTransEngine')?.value || 'auto';
      options.bilingual = !!document.getElementById('chkBilingual')?.checked;
    } else if (tool.id === 'pdf_forms') {
      const formVals = {};
      document.querySelectorAll('.form-field-input').forEach(inp => { formVals[inp.dataset.field] = inp.value; });
      options.form_values = formVals;
      options.new_fields = studioData.newFormFields;
      options.flatten = !!document.getElementById('chkFlattenForm')?.checked;
    } else if (tool.id === 'workflow') {
      options.steps = appState.workflowSteps;
    }

    const formData = new FormData();
    formData.append('tool', tool.id);
    formData.append('options_json', JSON.stringify(options));
    if (isUrlTool) formData.append('url_or_html', urlVal);
    else appState.toolFiles.forEach(f => formData.append('files', f));
    if (tool.id === 'sign_pdf' && appState.certFile) formData.append('cert_file', appState.certFile);

    btnExecuteTool.disabled = true;
    toolProgressWrap.style.display = 'block';
    toolResultCard.style.display = 'none';
    toolProgressMsg.textContent = `Running ${tool.name}...`;
    toolProgressPct.textContent = '15%';
    toolProgressBarFill.style.width = '15%';

    const asyncTools = new Set(['ocr_pdf', 'translate_pdf', 'workflow', 'invoice_extractor', 'pdf_to_word', 'compare_pdf']);
    try {
      if (asyncTools.has(tool.id)) {
        const startRes = await fetch('/api/tool/execute-async', { method: 'POST', body: formData });
        const startData = await startRes.json();
        if (!startRes.ok || !startData.job_id) throw new Error(startData.detail || 'Failed to queue job');
        const sse = new EventSource(`/api/progress/${startData.job_id}`);
        sse.onmessage = (ev) => {
          const msg = JSON.parse(ev.data);
          toolProgressMsg.textContent = msg.message || 'Working...';
          toolProgressPct.textContent = `${msg.pct || 0}%`;
          toolProgressBarFill.style.width = `${msg.pct || 0}%`;
          if (msg.status === 'completed' && msg.tool_result) {
            sse.close();
            btnExecuteTool.disabled = false;
            renderToolResult(msg.tool_result, tool);
          } else if (msg.status === 'failed') {
            sse.close();
            btnExecuteTool.disabled = false;
            showToast('Error: ' + (msg.error || msg.message), 'error');
          }
        };
      } else {
        const res = await fetch('/api/tool/execute', { method: 'POST', body: formData });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.detail || 'Execution failed');
        toolProgressPct.textContent = '100%';
        toolProgressBarFill.style.width = '100%';
        renderToolResult(data, tool);
        btnExecuteTool.disabled = false;
      }
    } catch (err) {
      btnExecuteTool.disabled = false;
      showToast('Error: ' + err.message, 'error');
      toolProgressMsg.textContent = 'Failed: ' + err.message;
      toolProgressPct.textContent = 'Error';
    }
  }

  function renderToolResult(result, tool) {
    appState.lastToolResult = result;
    toolProgressWrap.style.display = 'none';
    toolResultCard.style.display = 'block';
    document.getElementById('toolResultTitle').textContent = `${tool.name} Completed!`;
    document.getElementById('toolResultSubtitle').textContent = `Generated: ${result.filename} (${result.output_size_str})`;

    const dlBtn = document.getElementById('toolDownloadBtn');
    if (result.download_url) {
      dlBtn.href = result.download_url;
      dlBtn.download = result.filename;
      dlBtn.style.display = 'inline-flex';
      document.getElementById('toolDownloadBtnText').textContent = `Download ${result.filename}`;
    } else {
      dlBtn.style.display = 'none';
    }

    const openFolderToolBtn = document.getElementById('btnOpenInFolderTool');
    if (openFolderToolBtn) {
      openFolderToolBtn.style.display = appState.publicMode ? 'none' : 'inline-flex';
      openFolderToolBtn.onclick = async () => {
        await fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: `temp_outputs/${result.job_id}` }) });
        showToast('Opened folder in Windows Explorer', 'success');
      };
    }

    if (appState.publicMode && result.filename) {
      savePublicHistoryItem({
        filename: result.filename,
        tool: tool.id,
        output_size_str: result.output_size_str || '',
        download_url: result.download_url || '',
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    const btnPrev = document.getElementById('btnPreviewResult');
    if (result.filename && result.filename.toLowerCase().endsWith('.pdf')) {
      btnPrev.style.display = 'inline-flex';
      btnPrev.onclick = async () => {
        const fd = new FormData();
        fd.append('job_id', result.job_id);
        fd.append('filename', result.filename);
        fd.append('max_pages', '30');
        const r = await fetch('/api/tool/pdf-preview-pages', { method: 'POST', body: fd });
        const d = await r.json();
        if (d.success && d.pages?.length) openMultiPageModal(result.filename, d.pages, 0);
      };
    } else {
      btnPrev.style.display = 'none';
    }

    // Populate "Send Output to Tool" chaining bar for PDF outputs
    const chainBar = document.getElementById('chainToolBar');
    const chainSel = document.getElementById('selChainTargetTool');
    if (chainBar && chainSel && result.download_url && result.filename.toLowerCase().endsWith('.pdf')) {
      chainBar.style.display = 'flex';
      chainSel.innerHTML = PDF_TOOLS.filter(t => !t.isUrl && t.id !== tool.id && (t.accept || '').includes('.pdf')).map(t => `<option value="${t.id}">${t.icon} ${t.name}</option>`).join('');
      document.getElementById('btnChainOutput').onclick = () => chainOutputToTool(result.download_url, result.filename, chainSel.value);
    } else if (chainBar) {
      chainBar.style.display = 'none';
    }

    specializedResultBox.style.display = 'none';
    specializedResultBox.innerHTML = '';
    const st = result.stats || {};

    if (tool.id === 'ai_summarize') {
      specializedResultBox.style.display = 'block';
      const ents = st.entities || {};
      specializedResultBox.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
          <h4 style="color:#38bdf8;">🧠 Executive AI Summary • ${escHtml(st.category || 'Document')} (${st.reading_time_min || 1} min read, ${st.word_count || 0} words)</h4>
          <button type="button" class="btn btn-secondary btn-sm" id="btnCopySummary">📋 Copy Summary</button>
        </div>
        <p style="font-size:13.5px;line-height:1.6;color:#f8fafc;margin-bottom:12px;">${escHtml(st.overview)}</p>
        <ul style="padding-left:20px;font-size:13px;color:#cbd5e1;line-height:1.6;">${(st.key_takeaways || []).map(b => `<li>${escHtml(b)}</li>`).join('')}</ul>
        <div style="margin-top:12px;font-size:12px;color:#94a3b8;">
          ${(ents.dates?.length) ? `<div>📅 Dates: ${ents.dates.map(escHtml).join(', ')}</div>` : ''}
          ${(ents.amounts?.length) ? `<div>💰 Amounts: ${ents.amounts.map(escHtml).join(', ')}</div>` : ''}
          ${(ents.emails?.length) ? `<div>✉️ Emails: ${ents.emails.map(escHtml).join(', ')}</div>` : ''}
        </div>`;
      document.getElementById('btnCopySummary').onclick = () => { navigator.clipboard.writeText(`${st.overview}\n\n` + (st.key_takeaways || []).map(b => `- ${b}`).join('\n')); showToast('Copied!', 'success'); };
    } else if (tool.id === 'compare_pdf') {
      renderCompareDiffViewer(st);
    } else if (tool.id === 'verify_signatures') {
      specializedResultBox.style.display = 'block';
      const sigs = st.signatures || [];
      specializedResultBox.innerHTML = sigs.length === 0
        ? `<div style="color:#fbbf24;">No cryptographic PKCS#7 digital signatures found in this PDF.</div>`
        : sigs.map(s => `<div style="padding:10px;background:rgba(255,255,255,0.04);border-radius:6px;margin-bottom:8px;font-size:13px;">
            <div><strong>${escHtml(s.field_name)}</strong> — <span style="color:${s.intact && s.valid ? '#34d399' : '#fb7185'};">${s.intact && s.valid ? '✓ Integrity Valid' : '✕ Invalid/Tampered'}</span> ${s.self_signed ? '(Self-Signed Cert)' : ''}</div>
            <div style="color:var(--text-secondary);font-size:12px;margin-top:4px;">Signer: ${escHtml(s.signer || 'Unknown')} • Time: ${escHtml(s.signing_time || '')}</div>
          </div>`).join('');
    } else if (tool.id === 'invoice_extractor') {
      specializedResultBox.style.display = 'block';
      const recs = st.records || [];
      specializedResultBox.innerHTML = `
        <h4 style="color:#38bdf8;margin-bottom:10px;">🧾 Extracted Invoice Records (${recs.length})</h4>
        <table style="width:100%;border-collapse:collapse;font-size:12.5px;">
          <thead><tr style="border-bottom:1px solid var(--border-subtle);text-align:left;"><th>File</th><th>Vendor</th><th>Invoice #</th><th>Date</th><th>Tax</th><th>Total</th></tr></thead>
          <tbody>${recs.map(r => `<tr style="border-bottom:1px solid rgba(255,255,255,0.05);"><td>${escHtml(r.filename)}</td><td>${escHtml(r.vendor)}</td><td>${escHtml(r.invoice_number)}</td><td>${escHtml(r.date)}</td><td>${escHtml(r.tax)}</td><td><strong>${escHtml(r.total)}</strong></td></tr>`).join('')}</tbody>
        </table>`;
    } else if (st.logs?.length) {
      specializedResultBox.style.display = 'block';
      specializedResultBox.innerHTML = `<h4 style="color:#a78bfa;margin-bottom:8px;">⚡ Workflow Execution Log</h4>` + st.logs.map(l => `<div style="font-size:12.5px;padding:4px 0;color:#cbd5e1;">✓ ${escHtml(l)}</div>`).join('');
    } else if (st.text_preview || st.preview_snippet) {
      const txt = st.text_preview || st.preview_snippet;
      specializedResultBox.style.display = 'block';
      specializedResultBox.innerHTML = `<div style="display:flex;justify-content:space-between;margin-bottom:8px;"><h4 style="color:#a78bfa;">Extracted Text Preview</h4><button type="button" class="btn btn-secondary btn-sm" id="btnCopySnippet">📋 Copy</button></div><pre>${escHtml(txt)}</pre>`;
      document.getElementById('btnCopySnippet').onclick = () => { navigator.clipboard.writeText(txt); showToast('Copied!', 'success'); };
    }

    refreshHistoryDrawer();
    showToast(`${tool.name} finished!`, 'success');
  }

  function renderCompareDiffViewer(st) {
    specializedResultBox.style.display = 'block';
    const diffs = st.page_diffs || [];
    if (diffs.length === 0) {
      specializedResultBox.innerHTML = `<div style="color:#34d399;font-size:14px;">✓ Documents are identical across all ${st.doc1_pages} page(s)!</div>`;
      return;
    }
    let idx = 0;
    function drawDiffPage() {
      const d = diffs[idx];
      specializedResultBox.innerHTML = `
        <div class="diff-nav-bar">
          <h4 style="color:#38bdf8;">⚖️ ${escHtml(st.doc1_name)} vs ${escHtml(st.doc2_name)} — Page ${d.page} (${d.pixel_diff_pct}% visual change)</h4>
          <div style="display:flex;gap:8px;align-items:center;">
            <button type="button" class="btn btn-ghost btn-sm" id="btnDiffPrev" ${idx === 0 ? 'disabled' : ''}>◀ Prev Diff</button>
            <span style="font-size:12px;">${idx + 1} / ${diffs.length}</span>
            <button type="button" class="btn btn-ghost btn-sm" id="btnDiffNext" ${idx >= diffs.length - 1 ? 'disabled' : ''}>Next Diff ▶</button>
          </div>
        </div>
        <div class="diff-grid-3">
          ${d.img1 ? `<div class="diff-img-card"><div style="font-size:11.5px;margin-bottom:4px;">Original</div><img src="${d.img1}"></div>` : ''}
          ${d.img2 ? `<div class="diff-img-card"><div style="font-size:11.5px;margin-bottom:4px;">Modified</div><img src="${d.img2}"></div>` : ''}
          ${d.diff_img ? `<div class="diff-img-card"><div style="font-size:11.5px;margin-bottom:4px;color:#fb7185;">Visual Diff Heatmap</div><img src="${d.diff_img}"></div>` : ''}
        </div>
        <div class="diff-lines-box">
          ${(d.removed_lines || []).map(l => `<div class="diff-line-del">- ${escHtml(l)}</div>`).join('')}
          ${(d.added_lines || []).map(l => `<div class="diff-line-add">+ ${escHtml(l)}</div>`).join('')}
        </div>`;
      document.getElementById('btnDiffPrev')?.addEventListener('click', () => { if (idx > 0) { idx--; drawDiffPage(); } });
      document.getElementById('btnDiffNext')?.addEventListener('click', () => { if (idx < diffs.length - 1) { idx++; drawDiffPage(); } });
    }
    drawDiffPage();
  }

  async function chainOutputToTool(downloadUrl, filename, targetToolId) {
    const targetTool = PDF_TOOLS.find(t => t.id === targetToolId);
    if (!targetTool) return;
    try {
      const resp = await fetch(downloadUrl);
      const blob = await resp.blob();
      const nextFile = new File([blob], filename, { type: blob.type || 'application/pdf' });
      openToolWorkspace(targetTool, [nextFile]);
      showToast(`Loaded "${filename}" into ${targetTool.name}`, 'success');
    } catch (err) {
      showToast('Could not transfer file: ' + err.message, 'error');
    }
  }

  // ===========================================================================
  // 7. MULTI-PAGE PREVIEW MODAL & BEFORE/AFTER SLIDER + HISTORY + HOTFOLDER
  // ===========================================================================
  const previewModal = document.getElementById('previewModal');
  function openMultiPageModal(title, pages, startIdx = 0) {
    appState.modalPages = pages;
    appState.modalPageIdx = startIdx;
    appState.modalZoom = 1.0;
    document.getElementById('modalDocTitle').textContent = title;
    document.getElementById('modalCompareSliderWrap').style.display = 'none';
    document.getElementById('modalPreviewImg').style.display = 'block';
    previewModal.style.display = 'flex';
    renderModalPage();
  }

  function renderModalPage() {
    const img = document.getElementById('modalPreviewImg');
    const p = appState.modalPages[appState.modalPageIdx];
    if (!p || !img) return;
    img.src = p.image || p;
    img.style.transform = `scale(${appState.modalZoom})`;
    document.getElementById('modalZoomLabel').textContent = `${Math.round(appState.modalZoom * 100)}%`;
    document.getElementById('modalPageInfo').textContent = `Page ${appState.modalPageIdx + 1} of ${appState.modalPages.length}`;
    const multi = appState.modalPages.length > 1;
    document.getElementById('btnModalPrevPage').style.display = multi ? 'inline-flex' : 'none';
    document.getElementById('btnModalNextPage').style.display = multi ? 'inline-flex' : 'none';
  }

  document.getElementById('btnModalPrevPage')?.addEventListener('click', () => { if (appState.modalPageIdx > 0) { appState.modalPageIdx--; renderModalPage(); } });
  document.getElementById('btnModalNextPage')?.addEventListener('click', () => { if (appState.modalPageIdx < appState.modalPages.length - 1) { appState.modalPageIdx++; renderModalPage(); } });
  document.getElementById('btnModalZoomIn')?.addEventListener('click', () => { appState.modalZoom = Math.min(2.2, appState.modalZoom + 0.2); renderModalPage(); });
  document.getElementById('btnModalZoomOut')?.addEventListener('click', () => { appState.modalZoom = Math.max(0.6, appState.modalZoom - 0.2); renderModalPage(); });
  const closePreviewModal = () => { if (previewModal) previewModal.style.display = 'none'; };
  document.getElementById('btnModalClose')?.addEventListener('click', closePreviewModal);
  document.getElementById('btnModalDone')?.addEventListener('click', closePreviewModal);
  previewModal?.addEventListener('click', (e) => { if (e.target === previewModal) closePreviewModal(); });

  // History Drawer
  const PUBLIC_HISTORY_KEY = 'ultrapdf_public_history';
  function getPublicHistory() {
    try {
      const raw = localStorage.getItem(PUBLIC_HISTORY_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }
  function savePublicHistoryItem(item) {
    try {
      const arr = getPublicHistory();
      arr.unshift(item);
      localStorage.setItem(PUBLIC_HISTORY_KEY, JSON.stringify(arr.slice(0, 25)));
    } catch (_) {}
  }

  const historyDrawer = document.getElementById('historyDrawer');
  async function refreshHistoryDrawer() {
    try {
      let hist = [];
      if (appState.publicMode) {
        hist = getPublicHistory();
      } else {
        const res = await fetch('/api/system/history');
        const data = await res.json();
        hist = data.history || [];
      }
      const badge = document.getElementById('historyCountBadge');
      if (badge) badge.textContent = hist.length;
      const body = document.getElementById('historyDrawerBody');
      if (!body) return;
      if (hist.length === 0) {
        body.innerHTML = `<p style="font-size:13px;color:var(--text-muted);">No outputs generated yet.</p>`;
        return;
      }
      body.innerHTML = '';
      hist.forEach(item => {
        const div = document.createElement('div');
        div.className = 'history-item';
        div.innerHTML = `
          <div style="display:flex;justify-content:space-between;font-size:12.5px;">
            <strong>${escHtml(item.filename)}</strong>
            <span style="color:var(--text-muted);">${item.timestamp}</span>
          </div>
          <div style="font-size:11.5px;color:var(--text-secondary);">Tool: ${escHtml(item.tool)} • Size: ${escHtml(item.output_size_str)}</div>
          <div style="display:flex;gap:8px;margin-top:4px;">
            ${item.download_url ? `<a href="${item.download_url}" class="btn btn-secondary btn-sm" download>Download</a>` : ''}
            ${item.download_url && item.filename?.endsWith('.pdf') ? `<button type="button" class="btn btn-ghost btn-sm btn-hist-chain">Send to Compress</button>` : ''}
          </div>`;
        div.querySelector('.btn-hist-chain')?.addEventListener('click', () => {
          historyDrawer.style.display = 'none';
          chainOutputToTool(item.download_url, item.filename, 'compress_pdf');
        });
        body.appendChild(div);
      });
    } catch (e) {}
  }

  document.getElementById('btnToggleHistory')?.addEventListener('click', () => {
    historyDrawer.style.display = historyDrawer.style.display === 'none' ? 'flex' : 'none';
    refreshHistoryDrawer();
  });
  document.getElementById('btnCloseHistory')?.addEventListener('click', () => { historyDrawer.style.display = 'none'; });
  document.getElementById('btnClearTempCache')?.addEventListener('click', async () => {
    const res = await fetch('/api/system/cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ max_age_hours: 0 }) });
    const d = await res.json();
    showToast(`Cleared ${d.removed_dirs} temp folder(s) (${d.reclaimed_str})`, 'success');
    refreshHistoryDrawer();
  });

  // Hotfolder Modal
  const hotfolderModal = document.getElementById('hotfolderModal');
  async function openHotfolderModal() {
    hotfolderModal.style.display = 'flex';
    const body = document.getElementById('hotfolderModalBody');
    try {
      const res = await fetch('/api/hotfolder/status');
      const d = await res.json();
      const pend = d.pending_counts || {};
      body.innerHTML = `
        <div style="font-size:13px;display:flex;flex-direction:column;gap:10px;">
          <div><strong>Input Path:</strong> <code>${escHtml(d.input_dir)}</code></div>
          <div><strong>Output Path:</strong> <code>${escHtml(d.output_dir)}</code></div>
          <div style="background:rgba(255,255,255,0.04);padding:10px;border-radius:8px;">
            <div style="font-weight:700;margin-bottom:6px;">Active Hotfolder Profiles (Pending Queue):</div>
            ${Object.entries(pend).map(([k, v]) => `<div>• <code>${escHtml(k)}</code>: <strong>${v}</strong> pending file(s)</div>`).join('')}
          </div>
          <div><strong>Recent Hotfolder Outputs:</strong> ${(d.recent_outputs || []).slice(0, 5).map(o => escHtml(o.name)).join(', ') || 'None yet'}</div>
        </div>`;
    } catch (e) { body.textContent = 'Error loading hotfolder status: ' + e.message; }
  }
  document.getElementById('btnOpenHotfolderModal')?.addEventListener('click', openHotfolderModal);
  document.getElementById('btnBannerHotfolder')?.addEventListener('click', openHotfolderModal);
  document.getElementById('btnCloseHotfolderModal')?.addEventListener('click', () => { hotfolderModal.style.display = 'none'; });
  document.getElementById('btnHotfolderOpenIn')?.addEventListener('click', () => fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: 'hotfolder_input' }) }));
  document.getElementById('btnHotfolderOpenOut')?.addEventListener('click', () => fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: 'hotfolder_output' }) }));
  document.getElementById('btnHotfolderScanNow')?.addEventListener('click', async () => {
    const res = await fetch('/api/hotfolder/run-once', { method: 'POST' });
    const d = await res.json();
    showToast(`Processed ${(d.events || []).length} hotfolder batch(es)`, 'success');
    openHotfolderModal();
  });

  // ===========================================================================
  // 8. BATCH 500MB+ MERGE & COMPRESS STUDIO (Wired in Full!)
  // ===========================================================================
  const batchMergeStudioCard = document.getElementById('batchMergeStudioCard');
  function openBatchStudio() {
    closeToolWorkspace();
    if (featuresGuideSection) featuresGuideSection.style.display = 'none';
    appState.batchStudioOpen = true;
    heroSection.style.display = 'none';
    toolsGridSection.style.display = 'none';
    batchMergeStudioCard.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function closeBatchStudio() {
    appState.batchStudioOpen = false;
    batchMergeStudioCard.style.display = 'none';
    heroSection.style.display = 'block';
    toolsGridSection.style.display = 'block';
  }
  document.getElementById('btnToggleBatchStudio')?.addEventListener('click', () => appState.batchStudioOpen ? closeBatchStudio() : openBatchStudio());
  document.getElementById('btnCloseBatchStudio')?.addEventListener('click', closeBatchStudio);

  function initBatchStudio() {
    const tabLocalFolder = document.getElementById('tabLocalFolder');
    const tabFileUpload = document.getElementById('tabFileUpload');
    const panelLocalFolder = document.getElementById('panelLocalFolder');
    const panelFileUpload = document.getElementById('panelFileUpload');
    const folderPathInput = document.getElementById('folderPathInput');
    const btnBrowseFolder = document.getElementById('btnBrowseFolder');
    const btnScanFolder = document.getElementById('btnScanFolder');
    const fileDropzone = document.getElementById('fileDropzone');
    const fileInput = document.getElementById('fileInput');
    const filesPreviewSection = document.getElementById('filesPreviewSection');
    const fileGalleryContainer = document.getElementById('fileGalleryContainer');
    const optionsSection = document.getElementById('optionsSection');
    const presetCards = document.querySelectorAll('.preset-card');
    const customSizeBox = document.getElementById('customSizeBox');
    const customTargetMbInput = document.getElementById('customTargetMbInput');
    const customTargetSlider = document.getElementById('customTargetSlider');
    const btnStartProcessing = document.getElementById('btnStartProcessing');

    const batchState = {
      activeTab: appState.publicMode ? 'fileUpload' : 'localFolder',
      localFolderPath: '',
      localFiles: [],
      uploadedFiles: [],
      viewMode: 'grid',
      compressionPreset: 'balanced',
      targetMb: 25,
      jobId: null,
      fileRotations: {},
      splitMode: 'parts',
      splitParts: 2,
      splitMaxSizeMb: 25,
    };

    tabLocalFolder?.addEventListener('click', () => {
      batchState.activeTab = 'localFolder';
      tabLocalFolder.classList.add('active'); tabFileUpload.classList.remove('active');
      panelLocalFolder.classList.add('active'); panelFileUpload.classList.remove('active');
      renderBatchFiles();
    });
    tabFileUpload?.addEventListener('click', () => {
      batchState.activeTab = 'fileUpload';
      tabFileUpload.classList.add('active'); tabLocalFolder.classList.remove('active');
      panelFileUpload.classList.add('active'); panelLocalFolder.classList.remove('active');
      renderBatchFiles();
    });

    btnBrowseFolder?.addEventListener('click', async () => {
      btnBrowseFolder.disabled = true;
      try {
        const res = await fetch('/api/choose-folder', { method: 'POST' });
        const data = await res.json();
        if (data.folder_path) {
          folderPathInput.value = data.folder_path;
          batchState.localFolderPath = data.folder_path;
          batchState.localFiles = data.files || [];
          renderBatchFiles();
        }
      } catch (e) { showToast('Folder error: ' + e.message, 'error'); } finally { btnBrowseFolder.disabled = false; }
    });

    btnScanFolder?.addEventListener('click', async () => {
      const path = folderPathInput.value.trim();
      if (!path) { showToast('Enter a folder path first', 'error'); return; }
      btnScanFolder.disabled = true;
      try {
        const res = await fetch('/api/scan-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folder_path: path }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Scan failed');
        batchState.localFolderPath = data.folder_path;
        batchState.localFiles = data.files || [];
        renderBatchFiles();
      } catch (e) { showToast('Scan error: ' + e.message, 'error'); } finally { btnScanFolder.disabled = false; }
    });

    if (fileDropzone && fileInput) {
      fileDropzone.addEventListener('click', () => fileInput.click());
      fileDropzone.addEventListener('dragover', (e) => { e.preventDefault(); fileDropzone.classList.add('dragover'); });
      fileDropzone.addEventListener('dragleave', () => fileDropzone.classList.remove('dragover'));
      fileDropzone.addEventListener('drop', (e) => {
        e.preventDefault(); fileDropzone.classList.remove('dragover');
        if (e.dataTransfer.files?.length) addUploadedFiles(Array.from(e.dataTransfer.files));
      });
      document.getElementById('btnTriggerBrowse')?.addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
      fileInput.addEventListener('change', (e) => { if (e.target.files?.length) addUploadedFiles(Array.from(e.target.files)); });
    }

    function addUploadedFiles(list) {
      const items = list.map(f => ({ name: f.name, size: f.size, size_str: (f.size / (1024 * 1024)).toFixed(2) + ' MB', pages: 1, file: f }));
      batchState.uploadedFiles = batchState.uploadedFiles.concat(items);
      renderBatchFiles();
    }

    document.getElementById('btnViewGrid')?.addEventListener('click', () => { batchState.viewMode = 'grid'; renderBatchFiles(); });
    document.getElementById('btnViewList')?.addEventListener('click', () => { batchState.viewMode = 'list'; renderBatchFiles(); });
    document.getElementById('btnSortNatural')?.addEventListener('click', () => {
      const arr = batchState.activeTab === 'localFolder' ? batchState.localFiles : batchState.uploadedFiles;
      arr.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
      renderBatchFiles();
    });
    document.getElementById('btnClearFiles')?.addEventListener('click', () => {
      if (batchState.activeTab === 'localFolder') batchState.localFiles = [];
      else batchState.uploadedFiles = [];
      renderBatchFiles();
    });

    function renderBatchFiles() {
      const files = batchState.activeTab === 'localFolder' ? batchState.localFiles : batchState.uploadedFiles;
      if (files.length === 0) {
        filesPreviewSection.style.display = 'none'; optionsSection.style.display = 'none';
        return;
      }
      filesPreviewSection.style.display = 'block'; optionsSection.style.display = 'block';
      document.getElementById('totalFilesCount').textContent = files.length;
      const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
      document.getElementById('totalSizeBadge').textContent = (totalSize / (1024 * 1024)).toFixed(2) + ' MB';
      document.getElementById('totalPagesBadge').textContent = `${files.reduce((acc, f) => acc + (f.pages || 1), 0)} pages`;

      fileGalleryContainer.style.display = batchState.viewMode === 'list' ? 'flex' : 'grid';
      fileGalleryContainer.style.flexDirection = batchState.viewMode === 'list' ? 'column' : '';
      fileGalleryContainer.innerHTML = '';

      files.forEach((f, idx) => {
        const rot = batchState.fileRotations[f.name] || 0;
        const item = document.createElement('div');
        item.className = 'file-item-card';
        item.style.cssText = batchState.viewMode === 'list'
          ? 'background:rgba(18,26,44,0.85);border:1px solid var(--border-subtle);border-radius:8px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;gap:10px;'
          : 'background:rgba(18,26,44,0.85);border:1px solid var(--border-subtle);border-radius:8px;padding:8px;display:flex;flex-direction:column;align-items:center;gap:4px;';
        item.innerHTML = batchState.viewMode === 'list'
          ? `<span>📄 <strong>${escHtml(f.name)}</strong> (${f.size_str || ''})</span><div style="display:flex;gap:6px;"><button type="button" class="btn-icon-xs btn-f-rot">↻ ${rot}°</button><button type="button" class="btn-icon-xs btn-icon-danger btn-f-rm">×</button></div>`
          : `${f.thumbnail ? `<img src="${f.thumbnail}" style="height:110px;object-fit:contain;border-radius:4px;transform:rotate(${rot}deg);">` : `<div style="height:110px;display:flex;align-items:center;justify-content:center;font-size:32px;">📄</div>`}
             <span style="font-size:11px;font-weight:600;text-align:center;width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(f.name)}</span>
             <div style="display:flex;align-items:center;justify-content:space-between;width:100%;font-size:10.5px;color:var(--text-muted);">
               <span>${f.size_str || ''}</span>
               <div><button type="button" class="btn-icon-xs btn-f-rot" title="Rotate">↻</button> <button type="button" class="btn-icon-xs btn-icon-danger btn-f-rm">×</button></div>
             </div>`;
        item.querySelector('.btn-f-rot').onclick = () => { batchState.fileRotations[f.name] = (rot + 90) % 360; renderBatchFiles(); };
        item.querySelector('.btn-f-rm').onclick = () => { files.splice(idx, 1); renderBatchFiles(); };
        fileGalleryContainer.appendChild(item);
      });
    }

    presetCards.forEach(card => card.addEventListener('click', () => {
      presetCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      const val = card.querySelector('input')?.value || 'balanced';
      batchState.compressionPreset = val;
      if (customSizeBox) customSizeBox.style.display = (val === 'custom') ? 'block' : 'none';
    }));

    document.querySelectorAll('.btn-chip[data-size]').forEach(ch => ch.addEventListener('click', () => {
      document.querySelectorAll('.btn-chip[data-size]').forEach(c => c.classList.remove('active'));
      ch.classList.add('active');
      batchState.targetMb = ch.dataset.size;
      if (customTargetMbInput) customTargetMbInput.value = ch.dataset.size;
      if (customTargetSlider) customTargetSlider.value = ch.dataset.size;
    }));

    customTargetSlider?.addEventListener('input', (e) => { customTargetMbInput.value = e.target.value; batchState.targetMb = e.target.value; });
    customTargetMbInput?.addEventListener('input', (e) => { customTargetSlider.value = e.target.value; batchState.targetMb = e.target.value; });

    document.getElementById('btnToggleAdvanced')?.addEventListener('click', () => {
      const ac = document.getElementById('advancedContent');
      const isExp = ac.style.display === 'block';
      ac.style.display = isExp ? 'none' : 'block';
      document.getElementById('advancedChevron').style.transform = isExp ? 'rotate(0deg)' : 'rotate(180deg)';
    });
    document.getElementById('chkAutoSplit')?.addEventListener('change', (e) => { document.getElementById('autoSplitOptions').style.display = e.target.checked ? 'flex' : 'none'; });

    btnStartProcessing?.addEventListener('click', async () => {
      const isLocal = batchState.activeTab === 'localFolder';
      const files = isLocal ? batchState.localFiles : batchState.uploadedFiles;
      if (files.length === 0) { showToast('No files to process', 'error'); return; }

      const options = {
        compression_level: batchState.compressionPreset,
        target_mb: batchState.compressionPreset === 'custom' ? parseFloat(batchState.targetMb) : null,
        grayscale: document.getElementById('chkGrayscale')?.checked || false,
        ultra_bw: batchState.compressionPreset === 'ultrabw',
        add_bookmarks: document.getElementById('chkAddBookmarks')?.checked ?? true,
        add_page_numbers: document.getElementById('chkAddPageNumbers')?.checked || false,
        remove_blank_pages: document.getElementById('chkRemoveBlankPages')?.checked || false,
        strip_metadata: document.getElementById('chkStripMetadata')?.checked ?? true,
        password: document.getElementById('txtPassword')?.value || null,
        watermark_text: document.getElementById('txtWatermark')?.value || null,
        redact_pii: document.getElementById('chkRedactPii')?.checked || false,
        add_executive_summary: document.getElementById('chkExecutiveSummary')?.checked || false,
        file_rotations: batchState.fileRotations,
        auto_split: document.getElementById('chkAutoSplit')?.checked || false,
        auto_split_threshold_mb: parseFloat(document.getElementById('txtAutoSplitThreshold')?.value || 100),
        auto_split_parts: parseInt(document.getElementById('selAutoSplitParts')?.value || 2, 10),
      };

      const outName = document.getElementById('outputFilenameInput')?.value || 'Merged_Compressed.pdf';
      btnStartProcessing.disabled = true;
      document.getElementById('progressSection').style.display = 'block';
      document.getElementById('resultSection').style.display = 'none';

      try {
        let startRes;
        if (isLocal) {
          startRes = await fetch('/api/process-folder', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_path: batchState.localFolderPath, file_paths: batchState.localFiles.map(f => f.path), output_filename: outName, ...options })
          });
        } else {
          const fd = new FormData();
          fd.append('options_json', JSON.stringify(options));
          fd.append('output_filename', outName);
          batchState.uploadedFiles.forEach(f => fd.append('files', f.file));
          startRes = await fetch('/api/upload-and-process', { method: 'POST', body: fd });
        }
        const startData = await startRes.json();
        if (!startData.job_id) throw new Error(startData.detail || 'No job ID returned');
        batchState.jobId = startData.job_id;

        const sse = new EventSource(`/api/progress/${startData.job_id}`);
        sse.onmessage = (event) => {
          const data = JSON.parse(event.data);
          document.getElementById('progressMessage').textContent = data.message;
          document.getElementById('progressPercent').textContent = `${data.pct}%`;
          document.getElementById('progressBarFill').style.width = `${data.pct}%`;
          if (data.status === 'completed') {
            sse.close(); btnStartProcessing.disabled = false;
            document.getElementById('progressSection').style.display = 'none';
            document.getElementById('resultSection').style.display = 'block';
            renderBatchResult(data);
          } else if (data.status === 'failed') {
            sse.close(); btnStartProcessing.disabled = false;
            showToast('Job failed: ' + data.message, 'error');
          }
        };
      } catch (err) { btnStartProcessing.disabled = false; showToast('Error: ' + err.message, 'error'); }
    });

    function renderBatchResult(data) {
      const stats = data.stats || {};
      document.getElementById('resultFilenameSubtitle').textContent = stats.output_filename || 'Merged_Compressed.pdf';
      document.getElementById('metricReductionPct').textContent = `${stats.reduction_pct || 0}% Saved`;
      document.getElementById('metricOriginalSize').textContent = stats.original_size_str || stats.initial_size_str || '0 MB';
      document.getElementById('metricFinalSize').textContent = stats.final_size_str || '0 MB';
      document.getElementById('metricSavedBytes').textContent = stats.saved_bytes_str || stats.saved_size_str || '0 MB';
      document.getElementById('metricElapsedSec').textContent = `${stats.elapsed_sec ?? stats.elapsed_seconds ?? 0}s`;
      document.getElementById('metricInputFilesCount').textContent = `${stats.input_files ?? stats.total_files ?? 0} files`;
      document.getElementById('metricTotalPages').textContent = `${stats.total_pages || 0} pages`;
      document.getElementById('metricImagesCompressed').textContent = `${stats.images_compressed ?? stats.images_optimized ?? 0} images compressed`;

      if (stats.bloat_info) {
        const bloat = stats.bloat_info;
        document.getElementById('bloatCard').style.display = 'block';
        document.getElementById('bloatBarImages').style.width = `${bloat.images_pct || 0}%`;
        document.getElementById('bloatBarStructure').style.width = `${bloat.other_pct || 0}%`;
        document.getElementById('bloatPctImages').textContent = `${bloat.images_pct || 0}%`;
        document.getElementById('bloatPctStructure').textContent = `${bloat.other_pct || 0}%`;
      }

      const dl = document.getElementById('btnDownloadMerged');
      dl.href = `/api/download/${data.job_id}`;
      dl.download = stats.output_filename || 'Merged_Compressed.pdf';

      const openFolderBtn = document.getElementById('btnOpenInFolder');
      if (openFolderBtn) {
        openFolderBtn.style.display = appState.publicMode ? 'none' : 'inline-flex';
        openFolderBtn.onclick = () => fetch('/api/open-folder', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: `temp_outputs/${data.job_id}` }) });
      }
      if (appState.publicMode) {
        savePublicHistoryItem({
          filename: stats.output_filename || 'Merged_Compressed.pdf',
          tool: 'batch_merge',
          output_size_str: stats.final_size_str || '',
          download_url: `/api/download/${data.job_id}`,
          timestamp: new Date().toLocaleTimeString(),
        });
        refreshHistoryDrawer();
      }
      document.getElementById('btnQualityDiffPreview').onclick = async () => {
        const res = await fetch('/api/get-diff-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ job_id: data.job_id }) });
        const d = await res.json();
        document.getElementById('modalDocTitle').textContent = `Quality Comparison: ${d.filename}`;
        if (d.original_preview && d.compressed_preview) {
          document.getElementById('modalPreviewImg').style.display = 'none';
          const wrap = document.getElementById('modalCompareSliderWrap');
          wrap.style.display = 'inline-block';
          document.getElementById('modalOrigImg').src = d.original_preview;
          document.getElementById('modalCompImg').src = d.compressed_preview;
          const rng = document.getElementById('modalDiffRange');
          const clip = document.getElementById('modalAfterClip');
          const div = document.getElementById('modalSliderDivider');
          rng.oninput = (ev) => { clip.style.width = `${ev.target.value}%`; div.style.left = `${ev.target.value}%`; };
          document.getElementById('modalPageInfo').textContent = 'Drag slider to compare Original vs Compressed (Page 1)';
          previewModal.style.display = 'flex';
        } else if (d.compressed_preview) {
          openMultiPageModal(d.filename, [{ image: d.compressed_preview }], 0);
        }
      };
    }

    document.getElementById('btnTriggerSplit')?.addEventListener('click', async () => {
      if (!batchState.jobId) { showToast('No processed document to split', 'error'); return; }
      const btn = document.getElementById('btnTriggerSplit');
      btn.disabled = true;
      try {
        const res = await fetch('/api/split-pdf', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_id: batchState.jobId, num_parts: batchState.splitParts, split_mode: batchState.splitMode, max_part_mb: batchState.splitMaxSizeMb })
        });
        const splitData = await res.json();
        document.getElementById('splitResultsWrap').style.display = 'block';
        const list = document.getElementById('splitPartsList');
        list.innerHTML = '';
        (splitData.parts || []).forEach(part => {
          const div = document.createElement('div');
          div.style.cssText = 'background:rgba(22,32,58,0.8);border:1px solid var(--border-subtle);border-radius:6px;padding:8px 12px;margin-top:6px;display:flex;align-items:center;justify-content:space-between;font-size:13px;';
          div.innerHTML = `<span>📄 <strong>${escHtml(part.filename)}</strong> (${part.size_str}, ${part.page_count || part.pages || ''} pages)</span><a href="/api/download-split/${batchState.jobId}/${part.filename}" class="btn btn-secondary btn-sm" download>Download</a>`;
          list.appendChild(div);
        });
        if (splitData.zip_filename) {
          const z = document.getElementById('btnDownloadAllZip');
          z.href = `/api/download-split/${batchState.jobId}/${splitData.zip_filename}`;
          z.download = splitData.zip_filename;
        }
        showToast('Document divided!', 'success');
      } catch (e) { showToast('Split error: ' + e.message, 'error'); } finally { btn.disabled = false; }
    });

    document.querySelectorAll('.split-chip').forEach(chip => chip.addEventListener('click', () => {
      document.querySelectorAll('.split-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      batchState.splitMode = chip.dataset.mode;
      if (chip.dataset.parts) batchState.splitParts = parseInt(chip.dataset.parts, 10);
      if (chip.dataset.max) batchState.splitMaxSizeMb = parseFloat(chip.dataset.max);
    }));
  }

  async function initSystemMode() {
    try {
      const res = await fetch('/api/system/config');
      if (res.ok) {
        const cfg = await res.json();
        appState.publicMode = Boolean(cfg.public_mode);
        appState.maxUploadMb = cfg.max_upload_mb || 100;
      }
    } catch (_) {}

    if (appState.publicMode) {
      [
        'tabLocalFolder',
        'panelLocalFolder',
        'btnOpenInFolder',
        'btnOpenInFolderTool',
        'btnOpenHotfolderModal',
        'hotfolderBannerCard',
        'btnClearTempCache',
      ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
      });
      const tabUpload = document.getElementById('tabFileUpload');
      const panelUpload = document.getElementById('panelFileUpload');
      tabUpload?.classList.add('active');
      panelUpload?.classList.add('active');

      const dzMeta = document.getElementById('workspaceDropzoneMeta');
      if (dzMeta) {
        dzMeta.textContent = `Public Web Mode • Max ${appState.maxUploadMb} MB per batch • Auto-purged temp storage`;
      }
      const metaStatusText = document.querySelector('.workspace-meta-status span:last-child');
      if (metaStatusText) {
        metaStatusText.textContent = `Public Web Mode (Max ${appState.maxUploadMb} MB)`;
      }
      const brandBadge = document.querySelector('.brand-badge');
      if (brandBadge) {
        brandBadge.textContent = '39+ PDF Tools • Public Web';
      }
    }
  }

  initSystemMode().then(() => {
    initBatchStudio();
    if (appState.publicMode) {
      document.getElementById('tabFileUpload')?.click();
    }
    updateCategoryCounts();
    renderToolsGrid();
    refreshHistoryDrawer();
  });
});
