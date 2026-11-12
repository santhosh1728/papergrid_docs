/**
 * UltraPDF Studio Pro - Interactive Visual PDF Canvas Studio
 * Powers live page previews & direct mouse/touch placement for:
 * Edit PDF, Sign PDF, Redact PDF, Crop PDF, and PDF Form Designer.
 */
window.UltraCanvasStudio = (function () {
  const state = {
    mode: null, // 'edit' | 'sign' | 'redact' | 'crop' | 'forms'
    pages: [],
    currentPageIdx: 0,
    zoom: 1.0,
    activeTool: 'text', // edit: text|ink|highlight|rect|circle|arrow|note|whiteout; forms: text|checkbox|dropdown
    color: '#ef4444',
    strokeWidth: 2.5,
    fontSize: 15,
    annotations: [], // {page, type, x, y, width, height, x2, y2, text, color, strokeWidth, fontSize, points}
    redactBoxes: [], // {page, x, y, width, height}
    newFormFields: [], // {page, type, name, x, y, width, height}
    sigPlacement: { page: 1, nx: 0.56, ny: 0.72, nw: 0.28, nh: 0.1, dataUrl: '' },
    cropBox: { left: 0.05, top: 0.05, right: 0.05, bottom: 0.05 }, // percentages 0..0.45
    onChangeCrop: null,
  };

  let mountEl = null;

  function _currPage() {
    return state.pages[state.currentPageIdx] || null;
  }

  async function loadPdfIntoStudio(pdfFile, mode, containerEl, opts = {}) {
    mountEl = containerEl;
    state.mode = mode;
    state.pages = [];
    state.currentPageIdx = 0;
    state.zoom = 1.0;
    state.annotations = [];
    state.redactBoxes = [];
    state.newFormFields = [];
    state.onChangeCrop = opts.onChangeCrop || null;
    if (mode === 'edit') state.activeTool = 'text';
    if (mode === 'forms') state.activeTool = 'text';
    if (mode === 'redact') state.activeTool = 'redact_box';

    mountEl.innerHTML = `<div style="padding:24px; text-align:center; color:#818cf8;">Rendering interactive PDF canvas for "${pdfFile.name}"...</div>`;

    const fd = new FormData();
    fd.append('file', pdfFile);
    fd.append('max_pages', '25');
    const res = await fetch('/api/tool/pdf-preview-pages', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.success || !data.pages?.length) {
      mountEl.innerHTML = `<div style="padding:20px; color:#fb7185;">Could not render PDF pages: ${data.detail || 'Error'}</div>`;
      return;
    }

    state.pages = data.pages;
    renderStudio();
  }

  function setSignatureDataUrl(dataUrl) {
    state.sigPlacement.dataUrl = dataUrl || '';
    if (state.mode === 'sign') renderOverlayElements();
  }

  function setCropMargins(box) {
    state.cropBox = { ...state.cropBox, ...box };
    if (state.mode === 'crop') renderCropBox();
  }

  function renderStudio() {
    if (!mountEl || state.pages.length === 0) return;
    const p = _currPage();

    let toolbarLeft = '';
    if (state.mode === 'edit') {
      const tools = [
        ['text', 'T Text'],
        ['ink', '✏️ Draw'],
        ['highlight', '🖍️ Highlight'],
        ['rect', '▭ Box'],
        ['circle', '◯ Circle'],
        ['arrow', '↗ Arrow'],
        ['note', '📌 Note'],
        ['whiteout', '⬜ Whiteout'],
      ];
      toolbarLeft = `
        ${tools.map(([id, lbl]) => `<button type="button" class="canvas-tool-btn ${state.activeTool === id ? 'active' : ''}" data-ctool="${id}">${lbl}</button>`).join('')}
        <input type="color" id="studioColorPicker" value="${state.color}" title="Color" style="width:28px;height:28px;border:none;background:none;cursor:pointer;">
        <button type="button" class="canvas-tool-btn" id="studioUndoBtn">↩ Undo</button>
        <button type="button" class="canvas-tool-btn" id="studioClearBtn">🗑 Clear</button>
      `;
    } else if (state.mode === 'redact') {
      toolbarLeft = `
        <span style="font-size:12px;color:#cbd5e1;">Click &amp; drag on page to draw black redaction boxes</span>
        <button type="button" class="canvas-tool-btn" id="studioUndoBtn">↩ Undo Box</button>
        <button type="button" class="canvas-tool-btn" id="studioClearBtn">🗑 Clear Boxes</button>
      `;
    } else if (state.mode === 'sign') {
      toolbarLeft = `<span style="font-size:12px;color:#cbd5e1;">Drag &amp; resize your signature box directly on Page ${p.page}</span>`;
    } else if (state.mode === 'crop') {
      toolbarLeft = `<span style="font-size:12px;color:#cbd5e1;">Drag crop frame or adjust sliders below</span>`;
    } else if (state.mode === 'forms') {
      toolbarLeft = `
        <span style="font-size:12px;color:#cbd5e1;">Place New Field:</span>
        <button type="button" class="canvas-tool-btn ${state.activeTool === 'text' ? 'active' : ''}" data-ctool="text">+ Text Field</button>
        <button type="button" class="canvas-tool-btn ${state.activeTool === 'checkbox' ? 'active' : ''}" data-ctool="checkbox">+ Checkbox</button>
        <button type="button" class="canvas-tool-btn ${state.activeTool === 'dropdown' ? 'active' : ''}" data-ctool="dropdown">+ Dropdown</button>
        <button type="button" class="canvas-tool-btn" id="studioUndoBtn">↩ Undo Field</button>
      `;
    }

    mountEl.innerHTML = `
      <div class="pdf-canvas-studio">
        <div class="canvas-toolbar">
          <div class="canvas-toolbar-group">${toolbarLeft}</div>
          <div class="canvas-toolbar-group">
            <button type="button" class="canvas-tool-btn" id="studioPrevPage" ${state.currentPageIdx === 0 ? 'disabled' : ''}>◀</button>
            <span style="font-size:12px;color:#e2e8f0;">Page ${p.page} / ${state.pages.length}</span>
            <button type="button" class="canvas-tool-btn" id="studioNextPage" ${state.currentPageIdx >= state.pages.length - 1 ? 'disabled' : ''}>▶</button>
            <button type="button" class="canvas-tool-btn" id="studioZoomOut">−</button>
            <span style="font-size:11.5px;color:#94a3b8;">${Math.round(state.zoom * 100)}%</span>
            <button type="button" class="canvas-tool-btn" id="studioZoomIn">+</button>
          </div>
        </div>
        <div class="canvas-stage-wrap">
          <div class="canvas-stage" id="studioStage" style="width:${Math.round(540 * state.zoom)}px;">
            <img class="canvas-bg-img" id="studioBgImg" src="${p.image}" alt="Page ${p.page}" style="width:100%;">
            <svg class="canvas-overlay-svg" id="studioSvgOverlay" viewBox="0 0 ${p.width_pt} ${p.height_pt}" preserveAspectRatio="none"></svg>
            <div id="studioHtmlOverlay" style="position:absolute;inset:0;pointer-events:none;"></div>
          </div>
        </div>
      </div>
    `;

    mountEl.querySelectorAll('[data-ctool]').forEach(btn => {
      btn.addEventListener('click', () => {
        state.activeTool = btn.dataset.ctool;
        mountEl.querySelectorAll('[data-ctool]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const cp = document.getElementById('studioColorPicker');
    if (cp) cp.addEventListener('input', (e) => { state.color = e.target.value; });

    document.getElementById('studioPrevPage')?.addEventListener('click', () => {
      if (state.currentPageIdx > 0) { state.currentPageIdx--; renderStudio(); }
    });
    document.getElementById('studioNextPage')?.addEventListener('click', () => {
      if (state.currentPageIdx < state.pages.length - 1) { state.currentPageIdx++; renderStudio(); }
    });
    document.getElementById('studioZoomOut')?.addEventListener('click', () => {
      state.zoom = Math.max(0.6, state.zoom - 0.15); renderStudio();
    });
    document.getElementById('studioZoomIn')?.addEventListener('click', () => {
      state.zoom = Math.min(1.8, state.zoom + 0.15); renderStudio();
    });

    document.getElementById('studioUndoBtn')?.addEventListener('click', () => {
      const pg = p.page;
      if (state.mode === 'edit') {
        const idx = [...state.annotations].reverse().findIndex(a => a.page === pg);
        if (idx > -1) state.annotations.splice(state.annotations.length - 1 - idx, 1);
      } else if (state.mode === 'redact') {
        const idx = [...state.redactBoxes].reverse().findIndex(b => b.page === pg);
        if (idx > -1) state.redactBoxes.splice(state.redactBoxes.length - 1 - idx, 1);
      } else if (state.mode === 'forms') {
        const idx = [...state.newFormFields].reverse().findIndex(f => f.page === pg);
        if (idx > -1) state.newFormFields.splice(state.newFormFields.length - 1 - idx, 1);
      }
      renderOverlayElements();
    });

    document.getElementById('studioClearBtn')?.addEventListener('click', () => {
      const pg = p.page;
      if (state.mode === 'edit') state.annotations = state.annotations.filter(a => a.page !== pg);
      if (state.mode === 'redact') state.redactBoxes = state.redactBoxes.filter(b => b.page !== pg);
      renderOverlayElements();
    });

    wireStagePointerEvents();
    renderOverlayElements();
  }

  function _clientToPdfPt(svg, clientX, clientY) {
    const p = _currPage();
    const r = svg.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (clientX - r.left) / Math.max(1, r.width)));
    const ny = Math.max(0, Math.min(1, (clientY - r.top) / Math.max(1, r.height)));
    return { x: nx * p.width_pt, y: ny * p.height_pt, nx, ny };
  }

  function wireStagePointerEvents() {
    const svg = document.getElementById('studioSvgOverlay');
    if (!svg || state.mode === 'sign' || state.mode === 'crop') return;

    let drawing = false;
    let startPt = null;
    let inkPts = [];
    let draftShape = null;

    svg.addEventListener('pointerdown', (e) => {
      const p = _currPage();
      const pt = _clientToPdfPt(svg, e.clientX, e.clientY);

      if (state.mode === 'edit' && (state.activeTool === 'text' || state.activeTool === 'note')) {
        const label = state.activeTool === 'text' ? 'Enter text to place on PDF:' : 'Enter Sticky Note text:';
        const txt = window.prompt(label, state.activeTool === 'text' ? 'Approved' : 'Review note');
        if (txt && txt.trim()) {
          state.annotations.push({
            page: p.page,
            type: state.activeTool,
            x: pt.x,
            y: pt.y,
            text: txt.trim(),
            color: state.color,
            fontSize: state.fontSize,
          });
          renderOverlayElements();
        }
        return;
      }

      if (state.mode === 'forms') {
        const defName = `${state.activeTool}_${state.newFormFields.length + 1}`;
        const fname = window.prompt('Field Name (identifier):', defName);
        if (!fname || !fname.trim()) return;
        let opts = null;
        if (state.activeTool === 'dropdown') {
          const rawOpts = window.prompt('Dropdown options (comma separated):', 'Yes, No, Maybe') || 'Option 1, Option 2';
          opts = rawOpts.split(',').map(s => s.trim()).filter(Boolean);
        }
        state.newFormFields.push({
          page: p.page,
          type: state.activeTool,
          name: fname.trim(),
          x: pt.x,
          y: pt.y,
          width: state.activeTool === 'checkbox' ? 18 : 160,
          height: state.activeTool === 'checkbox' ? 18 : 24,
          options: opts,
        });
        renderOverlayElements();
        return;
      }

      drawing = true;
      startPt = pt;
      inkPts = [[pt.x, pt.y]];
      svg.setPointerCapture(e.pointerId);
    });

    svg.addEventListener('pointermove', (e) => {
      if (!drawing || !startPt) return;
      const pt = _clientToPdfPt(svg, e.clientX, e.clientY);
      if (state.activeTool === 'ink') {
        inkPts.push([pt.x, pt.y]);
      } else {
        draftShape = { x: Math.min(startPt.x, pt.x), y: Math.min(startPt.y, pt.y), w: Math.abs(pt.x - startPt.x), h: Math.abs(pt.y - startPt.y), x2: pt.x, y2: pt.y };
      }
      renderOverlayElements(draftShape, state.activeTool === 'ink' ? inkPts : null);
    });

    svg.addEventListener('pointerup', (e) => {
      if (!drawing || !startPt) return;
      drawing = false;
      const p = _currPage();
      const pt = _clientToPdfPt(svg, e.clientX, e.clientY);
      const x = Math.min(startPt.x, pt.x);
      const y = Math.min(startPt.y, pt.y);
      const w = Math.max(8, Math.abs(pt.x - startPt.x));
      const h = Math.max(8, Math.abs(pt.y - startPt.y));

      if (state.mode === 'redact') {
        state.redactBoxes.push({ page: p.page, x, y, width: w, height: h });
      } else if (state.mode === 'edit') {
        if (state.activeTool === 'ink' && inkPts.length >= 2) {
          state.annotations.push({ page: p.page, type: 'ink', points: inkPts, color: state.color, strokeWidth: state.strokeWidth });
        } else if (state.activeTool === 'arrow') {
          state.annotations.push({ page: p.page, type: 'arrow', x: startPt.x, y: startPt.y, x2: pt.x, y2: pt.y, color: state.color, strokeWidth: state.strokeWidth });
        } else {
          state.annotations.push({ page: p.page, type: state.activeTool, x, y, width: w, height: h, color: state.activeTool === 'highlight' ? '#fde047' : state.color, strokeWidth: state.strokeWidth });
        }
      }
      startPt = null;
      draftShape = null;
      inkPts = [];
      renderOverlayElements();
    });
  }

  function renderOverlayElements(draftShape = null, draftInk = null) {
    const svg = document.getElementById('studioSvgOverlay');
    const htmlLayer = document.getElementById('studioHtmlOverlay');
    const p = _currPage();
    if (!svg || !htmlLayer || !p) return;

    let svgHtml = '';
    htmlLayer.innerHTML = '';

    if (state.mode === 'edit') {
      state.annotations.filter(a => a.page === p.page).forEach(a => {
        if (a.type === 'text') {
          svgHtml += `<text x="${a.x}" y="${a.y + (a.fontSize || 14)}" fill="${a.color || '#000'}" font-size="${a.fontSize || 14}" font-family="Helvetica, sans-serif">${_esc(a.text)}</text>`;
        } else if (a.type === 'note') {
          svgHtml += `<rect x="${a.x}" y="${a.y}" width="20" height="20" rx="3" fill="#facc15" stroke="#854d0e" stroke-width="1.5"/><text x="${a.x + 4}" y="${a.y + 15}" font-size="13">📌</text>`;
        } else if (a.type === 'highlight') {
          svgHtml += `<rect x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" fill="#fde047" fill-opacity="0.45"/>`;
        } else if (a.type === 'whiteout') {
          svgHtml += `<rect x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" fill="#ffffff" stroke="#cbd5e1" stroke-dasharray="3"/>`;
        } else if (a.type === 'rect') {
          svgHtml += `<rect x="${a.x}" y="${a.y}" width="${a.width}" height="${a.height}" fill="none" stroke="${a.color}" stroke-width="${a.strokeWidth || 2}"/>`;
        } else if (a.type === 'circle') {
          svgHtml += `<ellipse cx="${a.x + a.width / 2}" cy="${a.y + a.height / 2}" rx="${a.width / 2}" ry="${a.height / 2}" fill="none" stroke="${a.color}" stroke-width="${a.strokeWidth || 2}"/>`;
        } else if (a.type === 'arrow') {
          svgHtml += `<line x1="${a.x}" y1="${a.y}" x2="${a.x2}" y2="${a.y2}" stroke="${a.color}" stroke-width="${a.strokeWidth || 2}" stroke-linecap="round"/>`;
        } else if (a.type === 'ink' && a.points?.length) {
          svgHtml += `<polyline points="${a.points.map(pt => pt.join(',')).join(' ')}" fill="none" stroke="${a.color}" stroke-width="${a.strokeWidth || 2.5}" stroke-linecap="round" stroke-linejoin="round"/>`;
        }
      });

      if (draftInk && draftInk.length >= 2) {
        svgHtml += `<polyline points="${draftInk.map(pt => pt.join(',')).join(' ')}" fill="none" stroke="${state.color}" stroke-width="${state.strokeWidth}" stroke-dasharray="4"/>`;
      } else if (draftShape) {
        svgHtml += `<rect x="${draftShape.x}" y="${draftShape.y}" width="${draftShape.w}" height="${draftShape.h}" fill="rgba(99,102,241,0.12)" stroke="${state.color}" stroke-dasharray="4"/>`;
      }
    }

    if (state.mode === 'redact') {
      state.redactBoxes.filter(b => b.page === p.page).forEach(b => {
        svgHtml += `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="#000000" fill-opacity="0.88" stroke="#f43f5e" stroke-width="1"/>`;
      });
      if (draftShape) {
        svgHtml += `<rect x="${draftShape.x}" y="${draftShape.y}" width="${draftShape.w}" height="${draftShape.h}" fill="#000000" fill-opacity="0.65" stroke="#fb7185" stroke-dasharray="4"/>`;
      }
    }

    if (state.mode === 'forms') {
      state.newFormFields.filter(f => f.page === p.page).forEach(f => {
        svgHtml += `<rect x="${f.x}" y="${f.y}" width="${f.width}" height="${f.height}" fill="rgba(59,130,246,0.16)" stroke="#2563eb" stroke-width="1.2"/>
          <text x="${f.x + 4}" y="${f.y + 14}" font-size="10" fill="#1e3a8a">${_esc(f.name)} (${f.type})</text>`;
      });
    }

    svg.innerHTML = svgHtml;

    if (state.mode === 'sign') {
      htmlLayer.style.pointerEvents = 'auto';
      svg.style.pointerEvents = 'none';
      const box = document.createElement('div');
      box.className = 'canvas-draggable-sig';
      const sp = state.sigPlacement;
      sp.page = p.page;
      box.style.left = `${sp.nx * 100}%`;
      box.style.top = `${sp.ny * 100}%`;
      box.style.width = `${sp.nw * 100}%`;
      box.style.height = `${sp.nh * 100}%`;
      box.innerHTML = `
        ${sp.dataUrl ? `<img src="${sp.dataUrl}" alt="Signature">` : `<span style="font-size:11px;color:#4f46e5;font-weight:700;">Signature Box</span>`}
        <div class="sig-resize-handle"></div>
      `;
      let modeDrag = null, ox = 0, oy = 0, onx = 0, ony = 0, onw = 0, onh = 0;
      box.addEventListener('pointerdown', (e) => {
        modeDrag = e.target.classList.contains('sig-resize-handle') ? 'resize' : 'move';
        ox = e.clientX; oy = e.clientY;
        onx = sp.nx; ony = sp.ny; onw = sp.nw; onh = sp.nh;
        box.setPointerCapture(e.pointerId);
        e.stopPropagation();
      });
      box.addEventListener('pointermove', (e) => {
        if (!modeDrag) return;
        const sr = htmlLayer.getBoundingClientRect();
        const dx = (e.clientX - ox) / Math.max(1, sr.width);
        const dy = (e.clientY - oy) / Math.max(1, sr.height);
        if (modeDrag === 'move') {
          sp.nx = Math.max(0, Math.min(1 - sp.nw, onx + dx));
          sp.ny = Math.max(0, Math.min(1 - sp.nh, ony + dy));
        } else {
          sp.nw = Math.max(0.08, Math.min(1 - sp.nx, onw + dx));
          sp.nh = Math.max(0.04, Math.min(1 - sp.ny, onh + dy));
        }
        box.style.left = `${sp.nx * 100}%`;
        box.style.top = `${sp.ny * 100}%`;
        box.style.width = `${sp.nw * 100}%`;
        box.style.height = `${sp.nh * 100}%`;
      });
      box.addEventListener('pointerup', () => { modeDrag = null; });
      htmlLayer.appendChild(box);
    }

    if (state.mode === 'crop') {
      renderCropBox();
    }
  }

  function renderCropBox() {
    const htmlLayer = document.getElementById('studioHtmlOverlay');
    const svg = document.getElementById('studioSvgOverlay');
    if (!htmlLayer || !svg) return;
    htmlLayer.style.pointerEvents = 'auto';
    svg.style.pointerEvents = 'none';
    htmlLayer.innerHTML = '';

    const c = state.cropBox;
    const box = document.createElement('div');
    box.className = 'crop-overlay-box';
    box.style.left = `${c.left * 100}%`;
    box.style.top = `${c.top * 100}%`;
    box.style.width = `${Math.max(10, (1 - c.left - c.right) * 100)}%`;
    box.style.height = `${Math.max(10, (1 - c.top - c.bottom) * 100)}%`;
    box.innerHTML = `<div class="sig-resize-handle" style="background:#06b6d4;"></div>`;

    let dragging = null, ox = 0, oy = 0, startC = null;
    box.addEventListener('pointerdown', (e) => {
      dragging = e.target.classList.contains('sig-resize-handle') ? 'resize' : 'move';
      ox = e.clientX; oy = e.clientY;
      startC = { ...state.cropBox };
      box.setPointerCapture(e.pointerId);
    });
    box.addEventListener('pointermove', (e) => {
      if (!dragging || !startC) return;
      const sr = htmlLayer.getBoundingClientRect();
      const dx = (e.clientX - ox) / Math.max(1, sr.width);
      const dy = (e.clientY - oy) / Math.max(1, sr.height);
      if (dragging === 'move') {
        const w = 1 - startC.left - startC.right;
        const h = 1 - startC.top - startC.bottom;
        const nl = Math.max(0, Math.min(1 - w, startC.left + dx));
        const nt = Math.max(0, Math.min(1 - h, startC.top + dy));
        state.cropBox = { left: nl, top: nt, right: 1 - nl - w, bottom: 1 - nt - h };
      } else {
        state.cropBox.right = Math.max(0, Math.min(0.85 - state.cropBox.left, startC.right - dx));
        state.cropBox.bottom = Math.max(0, Math.min(0.85 - state.cropBox.top, startC.bottom - dy));
      }
      box.style.left = `${state.cropBox.left * 100}%`;
      box.style.top = `${state.cropBox.top * 100}%`;
      box.style.width = `${(1 - state.cropBox.left - state.cropBox.right) * 100}%`;
      box.style.height = `${(1 - state.cropBox.top - state.cropBox.bottom) * 100}%`;
      if (state.onChangeCrop) state.onChangeCrop({ ...state.cropBox });
    });
    box.addEventListener('pointerup', () => { dragging = null; });
    htmlLayer.appendChild(box);
  }

  function _esc(str) {
    return String(str || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
  }

  function getExportPayload() {
    const p = state.pages[Math.max(0, state.sigPlacement.page - 1)] || _currPage() || { width_pt: 595, height_pt: 842 };
    const sp = state.sigPlacement;
    return {
      annotations: state.annotations,
      redactBoxes: state.redactBoxes,
      newFormFields: state.newFormFields,
      cropBox: state.cropBox,
      signatureRect: {
        page: sp.page,
        x: Math.round(sp.nx * p.width_pt),
        y: Math.round(sp.ny * p.height_pt),
        width: Math.round(sp.nw * p.width_pt),
        height: Math.round(sp.nh * p.height_pt),
      },
    };
  }

  return {
    loadPdfIntoStudio,
    setSignatureDataUrl,
    setCropMargins,
    getExportPayload,
  };
})();

