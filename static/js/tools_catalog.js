/**
 * UltraPDF Studio Pro - Authoritative 39-Tool Catalog & Detailed Feature Encyclopedia
 * Shared by the Main Tools Grid, In-Workspace Guides, Quick-Peek Modals, and Features Explorer Page.
 */
window.ULTRA_PDF_CATALOG = [
  // ======================== 1. ORGANIZE PDF ========================
  {
    id: 'merge_pdf', name: 'Merge PDF', category: 'organize', icon: '📑', iconTheme: 'theme-organize',
    accept: '.pdf', multiple: true, actionText: 'Merge PDFs Now', engineTag: 'PyMuPDF TOC',
    desc: 'Combine multiple PDFs in custom order with clickable bookmark outlines.',
    howItWorks: 'Streams each uploaded PDF sequentially into a consolidated PyMuPDF document, builds clickable Level-1 outline bookmarks named after each file, and optimizes internal object streams with garbage=4 deflation.',
    formats: 'Input: 2+ .pdf files → Output: Single .pdf with Bookmarks',
    proTip: 'For 30+ massive files (500MB+) or mixed images/Office/TXT files, switch to the Batch 500MB+ Studio for zero-upload local disk scanning.',
    sampleKinds: ['standard', 'compare_v1']
  },
  {
    id: 'split_pdf', name: 'Split PDF', category: 'organize', icon: '✂️', iconTheme: 'theme-organize',
    accept: '.pdf', multiple: false, actionText: 'Split PDF Now', engineTag: 'ZIP Bundle',
    desc: 'Separate custom page ranges, extract every page, or split into equal parts.',
    howItWorks: 'Parses custom 1-indexed ranges (e.g. "1-3, 5, 7-10"), extracts every single page as an independent PDF, or divides the page count evenly into N equal files and bundles all parts into a 1-click ZIP archive.',
    formats: 'Input: .pdf → Output: Split .pdf files packaged in .zip',
    proTip: 'Use "Equal Parts" to evenly split large reports or use Batch Studio’s Post-Merge Divider to split strictly under a 25 MB WhatsApp/Email limit.',
    sampleKinds: ['standard']
  },
  {
    id: 'organize_pdf', name: 'Organize PDF', category: 'organize', icon: '🗂️', iconTheme: 'theme-organize',
    accept: '.pdf', multiple: false, actionText: 'Save Organized PDF', engineTag: 'Drag & Drop',
    desc: 'Drag-and-drop reorder, rotate individual pages, reverse order, or drop pages visually.',
    howItWorks: 'Renders live PNG thumbnails for every page via /api/tool/page-thumbnails, lets you drag cards to reorder, rotate 90° per page or all pages, reverse order, or drop even/unwanted pages before rebuilding the PDF.',
    formats: 'Input: .pdf → Output: Reordered & rotated .pdf',
    proTip: 'Click "Drop Even" to clean duplex scanner back-sides in one click, or drag thumbnails to rearrange slide decks.',
    sampleKinds: ['standard']
  },
  {
    id: 'scan_to_pdf', name: 'Scan to PDF', category: 'organize', icon: '📸', iconTheme: 'theme-organize',
    accept: 'image/*', multiple: true, actionText: 'Compile Scans to PDF', engineTag: 'Webcam + PIL',
    desc: 'Capture document scans from your webcam or photos and enhance into crisp PDF.',
    howItWorks: 'Captures live frames via navigator.mediaDevices.getUserMedia (or accepts uploaded photos), applies Pillow ImageOps.autocontrast and ImageEnhance.Sharpness(1.4) in Document Mode, and compiles pages into a deflated PDF.',
    formats: 'Input: Webcam frames / JPG / PNG / WEBP → Output: Enhanced .pdf',
    proTip: 'Follow Scan to PDF by clicking "Send Output to Tool → OCR PDF" to make your webcam scans fully searchable.',
    sampleKinds: null
  },

  // ======================== 2. OPTIMIZE PDF ========================
  {
    id: 'compress_pdf', name: 'Compress PDF', category: 'optimize', icon: '🗜️', iconTheme: 'theme-optimize',
    accept: '.pdf', multiple: false, actionText: 'Compress PDF Now', engineTag: 'Multi-Pass MB',
    desc: 'Shrink PDFs up to 98% or converge to an exact target MB ceiling.',
    howItWorks: 'Inspects embedded image xrefs, applies Lanczos downsampling + JPEG re-encoding (Balanced 150 DPI / Max Quality 200 DPI) or 1-bit monochrome thresholding (Ultra-B&W), strips metadata, deflates streams, and runs adaptive multi-pass tuning when targeting an exact MB limit.',
    formats: 'Input: .pdf → Output: Compressed .pdf',
    proTip: 'Choose "Ultra-B&W 1-Bit" for text-heavy scanned contracts/invoices to achieve up to 98% size reduction.',
    sampleKinds: ['scanned_invoice']
  },
  {
    id: 'repair_pdf', name: 'Repair PDF', category: 'optimize', icon: '🛠️', iconTheme: 'theme-optimize',
    accept: '.pdf', multiple: false, actionText: 'Repair PDF Now', engineTag: 'XRef Rebuild',
    desc: 'Reconstruct damaged cross-reference tables and recover pages from corrupt PDFs.',
    howItWorks: 'Uses PyMuPDF’s fault-tolerant parser to ingest damaged streams, transfers valid page trees into a clean document, and saves with garbage=4 stream compaction and syntax cleaning.',
    formats: 'Input: Corrupt/damaged .pdf → Output: Repaired .pdf',
    proTip: 'Also strips unreferenced/orphan objects left behind by broken PDF writers.',
    sampleKinds: ['standard']
  },
  {
    id: 'ocr_pdf', name: 'OCR PDF', category: 'optimize', icon: '🔍', iconTheme: 'theme-optimize', isNew: true,
    accept: '.pdf', multiple: false, actionText: 'Run Offline OCR', engineTag: 'RapidOCR ONNX',
    desc: '100% offline neural OCR embeds a searchable text layer onto scanned PDFs.',
    howItWorks: 'Renders pages lacking selectable text at 180 DPI with autocontrast, executes RapidOCR (ONNXRuntime CPU models) to detect text polygons & confidence scores, and inserts invisible searchable text (render_mode=3) aligned exactly to the scanned image.',
    formats: 'Input: Scanned/image .pdf → Output: Searchable .pdf + text preview',
    proTip: 'Runs asynchronously with live SSE progress! After OCR finishes, chain the output directly into Chat with PDF, AI Summarizer, or Redact PDF.',
    sampleKinds: ['scanned_invoice']
  },

  // ======================== 3. CONVERT PDF ========================
  {
    id: 'pdf_to_word', name: 'PDF to Word', category: 'convert', icon: '📝', iconTheme: 'theme-convert',
    accept: '.pdf', multiple: false, actionText: 'Convert PDF to Word', engineTag: 'pdf2docx',
    desc: 'Layout-accurate PDF to DOCX conversion preserving tables, columns, and images.',
    howItWorks: 'Uses pdf2docx to reconstruct multi-column paragraphs, border styles, fonts, embedded images, and Word tables into an editable .docx file, with a PyMuPDF table+block fallback for irregular layouts.',
    formats: 'Input: .pdf → Output: Editable .docx',
    proTip: 'If your PDF is a flat scan, run OCR PDF first so text becomes selectable before converting to Word.',
    sampleKinds: ['standard']
  },
  {
    id: 'pdf_to_powerpoint', name: 'PDF to PowerPoint', category: 'convert', icon: '📊', iconTheme: 'theme-convert',
    accept: '.pdf', multiple: false, actionText: 'Convert PDF to PowerPoint', engineTag: 'Editable PPTX',
    desc: 'Turn PDF pages into native editable PowerPoint text boxes & images or slide renders.',
    howItWorks: 'In Editable Slides mode, maps PDF text block coordinates and font sizes into native PowerPoint text frames and extracts embedded pictures onto 16:9 widescreen slides. Raster mode renders 2× high-DPI slide images.',
    formats: 'Input: .pdf → Output: Editable .pptx',
    proTip: 'Keep "Editable Slides Mode" checked when you want to edit bullet points inside PowerPoint.',
    sampleKinds: ['standard']
  },
  {
    id: 'pdf_to_excel', name: 'PDF to Excel', category: 'convert', icon: '📈', iconTheme: 'theme-convert',
    accept: '.pdf', multiple: false, actionText: 'Convert PDF to Excel', engineTag: 'Table Grid',
    desc: 'Pull structured tables from PDFs straight into styled Excel (.xlsx) sheets.',
    howItWorks: 'Uses PyMuPDF page.find_tables() to detect ruled/bordered tables per page and writes formatted Excel sheets with styled blue headers and thin cell borders (falling back to whitespace/tab splitting for borderless tables).',
    formats: 'Input: .pdf → Output: Multi-sheet .xlsx',
    proTip: 'Each PDF page becomes its own named worksheet ("Page 1", "Page 2", ...) for easy auditing.',
    sampleKinds: ['standard']
  },
  {
    id: 'word_to_pdf', name: 'Word to PDF', category: 'convert', icon: '📄', iconTheme: 'theme-convert',
    accept: '.docx,.doc', multiple: false, actionText: 'Convert Word to PDF', engineTag: 'Story CSS',
    desc: 'Convert DOCX documents into cleanly formatted multi-page PDFs with styled tables.',
    howItWorks: 'Parses Word headings (H1–H3), bold/italic text runs, and tables via python-docx into styled HTML/CSS and paginates them seamlessly onto A4 pages using PyMuPDF Story.',
    formats: 'Input: .docx → Output: .pdf',
    proTip: 'Supports multi-page tables and inline bold/italic run formatting automatically.',
    sampleKinds: null
  },
  {
    id: 'powerpoint_to_pdf', name: 'PowerPoint to PDF', category: 'convert', icon: '🖥️', iconTheme: 'theme-convert',
    accept: '.pptx,.ppt', multiple: false, actionText: 'Convert PowerPoint to PDF', engineTag: 'Slide Geometry',
    desc: 'Convert PPTX decks to PDF preserving exact slide aspect ratio, shapes, and images.',
    howItWorks: 'Reads exact presentation slide width/height points from python-pptx, places text frames, tables, and embedded picture blobs at their exact (left, top, width, height) positions.',
    formats: 'Input: .pptx → Output: .pdf',
    proTip: 'Supports both 4:3 and 16:9 widescreen slide dimensions automatically.',
    sampleKinds: null
  },
  {
    id: 'excel_to_pdf', name: 'Excel to PDF', category: 'convert', icon: '📑', iconTheme: 'theme-convert',
    accept: '.xlsx,.xls', multiple: false, actionText: 'Convert Excel to PDF', engineTag: 'Full Workbook',
    desc: 'Convert multi-sheet XLSX spreadsheets across all rows and columns with auto-wrapping.',
    howItWorks: 'Reads every worksheet with openpyxl (data_only=True evaluated formulas) and renders full paginated A4 Landscape HTML grid tables via PyMuPDF Story with alternating row shading and wrapped cells.',
    formats: 'Input: .xlsx → Output: Landscape .pdf',
    proTip: 'No row or text truncation — large workbooks automatically flow cleanly across multiple pages.',
    sampleKinds: null
  },
  {
    id: 'pdf_to_jpg', name: 'PDF to JPG', category: 'convert', icon: '🖼️', iconTheme: 'theme-convert',
    accept: '.pdf', multiple: false, actionText: 'Convert PDF to JPG', engineTag: 'High-DPI ZIP',
    desc: 'Render every PDF page as crisp JPG/PNG images bundled into a single ZIP.',
    howItWorks: 'Rasterizes each page using a scaled PyMuPDF Matrix (dpi / 72.0) and bundles all sequentially numbered page images into a compressed .zip file.',
    formats: 'Input: .pdf → Output: .zip of .jpg/.png images',
    proTip: 'Select 150 DPI for fast previews or 300 DPI for print-ready raster exports.',
    sampleKinds: ['standard']
  },
  {
    id: 'jpg_to_pdf', name: 'JPG to PDF', category: 'convert', icon: '🌄', iconTheme: 'theme-convert',
    accept: 'image/*', multiple: true, actionText: 'Convert Images to PDF', engineTag: 'Aspect Fit',
    desc: 'Combine JPG, PNG, and WEBP images into a PDF with orientation and margin controls.',
    howItWorks: 'Reads image dimensions with Pillow, centers and scales each image proportionally within Portrait A4, Landscape A4, or Natural Fit pages respecting your custom point margin.',
    formats: 'Input: .jpg, .png, .webp, .bmp → Output: .pdf',
    proTip: 'Great for compiling receipts, portfolios, or photo boards into a printable packet.',
    sampleKinds: null
  },
  {
    id: 'html_to_pdf', name: 'HTML to PDF', category: 'convert', icon: '🌐', iconTheme: 'theme-convert',
    accept: '', multiple: false, isUrl: true, actionText: 'Convert Webpage to PDF', engineTag: 'Headless Edge',
    desc: 'Render live URLs or raw HTML+CSS into PDF with modern layout fidelity.',
    howItWorks: 'Uses local headless Microsoft Edge or Google Chrome (--headless=new --print-to-pdf) for full Flexbox/Grid/CSS/JS rendering, automatically falling back to PyMuPDF Story CSS if browser rendering is unavailable.',
    formats: 'Input: https:// URL or HTML string → Output: .pdf',
    proTip: 'Paste full HTML/CSS invoice templates or click "Load Sample HTML" to preview instant CSS-to-PDF rendering.',
    sampleKinds: ['sample_html']
  },
  {
    id: 'pdf_to_pdfa', name: 'PDF to PDF/A', category: 'convert', icon: '🏛️', iconTheme: 'theme-convert',
    accept: '.pdf', multiple: false, actionText: 'Convert to PDF/A-2b', engineTag: 'ISO 19005-2',
    desc: 'Convert PDFs into long-term archival ISO 19005-2 PDF/A-2b format.',
    howItWorks: 'Strips encryption and unsafe launch links, embeds a standards-compliant PDF/A-2b XMP packet (pdfaid:part=2, conformance=B) and an sRGB IEC61966-2.1 OutputIntent dictionary directly into the PDF catalog.',
    formats: 'Input: .pdf → Output: Archival PDF/A-2b .pdf',
    proTip: 'Verify archival readiness via the returned compliance checklist (XMP, sRGB OutputIntent, unencrypted, clean streams).',
    sampleKinds: ['standard']
  },
  {
    id: 'pdf_to_markdown', name: 'PDF to Markdown', category: 'convert', icon: '🔖', iconTheme: 'theme-convert',
    accept: '.pdf', multiple: false, actionText: 'Convert to Markdown', engineTag: 'LLM Ready',
    desc: 'Extract clean Markdown with headings, bullets, and tables for notes & AI prompts.',
    howItWorks: 'Detects page tables first and formats them as GitHub-Flavored Markdown pipe tables, then converts non-table text blocks into headings and clean paragraphs separated by page dividers.',
    formats: 'Input: .pdf → Output: .md + live preview',
    proTip: 'Click "Copy" on the preview card to paste structured PDF tables directly into Notion, Obsidian, or an LLM.',
    sampleKinds: ['standard']
  },

  // ======================== 4. EDIT PDF ========================
  {
    id: 'edit_pdf', name: 'Edit PDF', category: 'edit', icon: '✏️', iconTheme: 'theme-edit', isNew: true,
    accept: '.pdf', multiple: false, actionText: 'Save Edited PDF', engineTag: 'Canvas UI',
    desc: 'Interactive canvas: place text, freehand ink, highlights, shapes, arrows, notes & whiteout.',
    howItWorks: 'Renders crisp 1.35× page previews with exact PDF point dimensions into UltraCanvasStudio. Every stroke, box, arrow, highlight, whiteout, sticky note, and text label maps normalized canvas coordinates cleanly into permanent PyMuPDF vector/text objects.',
    formats: 'Input: .pdf → Output: Annotated .pdf',
    proTip: 'Use Whiteout to cleanly cover outdated dates or numbers, then place a fresh Text annotation right on top.',
    sampleKinds: ['standard']
  },
  {
    id: 'rotate_pdf', name: 'Rotate PDF', category: 'edit', icon: '🔄', iconTheme: 'theme-edit',
    accept: '.pdf', multiple: false, actionText: 'Rotate PDF Now', engineTag: '90°/180°/270°',
    desc: 'Rotate all pages, odd pages only, or even pages only in one click.',
    howItWorks: 'Updates page rotation metadata losslessly via page.set_rotation((page.rotation + angle) % 360) for All, Odd, or Even pages without re-compressing content.',
    formats: 'Input: .pdf → Output: Rotated .pdf',
    proTip: 'Need different rotations per page? Use Organize PDF instead to rotate individual thumbnails.',
    sampleKinds: ['standard']
  },
  {
    id: 'page_numbers', name: 'Page numbers', category: 'edit', icon: '🔢', iconTheme: 'theme-edit',
    accept: '.pdf', multiple: false, actionText: 'Add Page Numbers', engineTag: 'Bates / N of M',
    desc: 'Add sequential or Bates-style page numbers with custom format & placement.',
    howItWorks: 'Evaluates format templates like "Page {page} of {total}" or "Bates: {page:04d}" across every page and stamps neatly aligned typography at your chosen corner or center position.',
    formats: 'Input: .pdf → Output: Numbered .pdf',
    proTip: 'Need both header dates and Bates footers? Try the new 6-slot Header & Footer tool.',
    sampleKinds: ['standard']
  },
  {
    id: 'crop_pdf', name: 'Crop PDF', category: 'edit', icon: '📐', iconTheme: 'theme-edit',
    accept: '.pdf', multiple: false, actionText: 'Crop PDF Margins', engineTag: 'Live Crop Box',
    desc: 'Drag an interactive crop frame directly over the PDF page preview to trim margins.',
    howItWorks: 'Displays a live resizable crop overlay synced bidirectionally with Left/Top/Right/Bottom % controls, then updates each page’s PDF CropBox via page.set_cropbox().',
    formats: 'Input: .pdf → Output: Margin-cropped .pdf',
    proTip: 'Drag the cyan handle on the preview box to visually frame out scanning borders or headers/footers.',
    sampleKinds: ['standard']
  },
  {
    id: 'watermark_pdf', name: 'Watermark', category: 'edit', icon: '💧', iconTheme: 'theme-edit',
    accept: '.pdf', multiple: false, actionText: 'Stamp Watermark', engineTag: 'Opacity + Angle',
    desc: 'Stamp customizable diagonal, horizontal, or vertical text watermarks over every page.',
    howItWorks: 'Applies affine rotation matrices (pymupdf.Matrix(angle)) and alpha fill opacity (fill_opacity) to stamp crisp vector text across every page.',
    formats: 'Input: .pdf → Output: Watermarked .pdf',
    proTip: '30%–35% opacity at 45° keeps underlying text completely readable while clearly marking drafts.',
    sampleKinds: ['standard']
  },
  {
    id: 'impose_pdf', name: 'N-Up & Booklet', category: 'edit', icon: '📖', iconTheme: 'theme-edit', isNew: true,
    accept: '.pdf', multiple: false, actionText: 'Impose Pages Now', engineTag: 'Print Layout',
    desc: 'Arrange pages into 2-Up, 4-Up, 6-Up grids or Saddle-Stitch Booklet order.',
    howItWorks: 'Uses PyMuPDF vector show_pdf_page() to tile multiple source pages onto A4 sheets cleanly without rasterizing text, or reorders padded 4-page signatures for duplex saddle-stitch booklet printing.',
    formats: 'Input: .pdf → Output: Imposed .pdf',
    proTip: 'Use "Booklet" when printing double-sided flyers or zines you intend to fold in half and staple.',
    sampleKinds: ['standard']
  },
  {
    id: 'header_footer_pdf', name: 'Header & Footer', category: 'edit', icon: '🏷️', iconTheme: 'theme-edit', isNew: true,
    accept: '.pdf', multiple: false, actionText: 'Apply Header & Footer', engineTag: '6-Slot Tokens',
    desc: 'Stamp 6-slot headers & footers with {page}, {total}, {date}, {filename}, and {bates}.',
    howItWorks: 'Divides header and footer margins into Left, Center, and Right aligned text boxes per page, dynamically interpolating current date, source filename, page totals, and auto-incrementing 6-digit Bates IDs.',
    formats: 'Input: .pdf → Output: Stamped .pdf',
    proTip: 'Put "{filename}" in Header Left, "{date}" in Header Right, and "{bates}" in Footer Right for instant legal packet stamping.',
    sampleKinds: ['standard']
  },
  {
    id: 'bookmarks_editor', name: 'Bookmark Editor', category: 'edit', icon: '📑', iconTheme: 'theme-edit', isNew: true,
    accept: '.pdf', multiple: false, actionText: 'Save PDF Bookmarks', engineTag: 'TOC Outline',
    desc: 'Inspect, edit, add, or auto-detect clickable PDF table-of-contents bookmarks.',
    howItWorks: 'Reads existing PDF outlines via doc.get_toc(), lets you add/edit title, nesting level (1–4), and target page, or automatically scans font sizes across pages to infer Level-1 and Level-2 headings.',
    formats: 'Input: .pdf → Output: Bookmarked .pdf',
    proTip: 'Check "Auto-detect headings if list is empty" to generate instant navigation outlines on long unbookmarked reports.',
    sampleKinds: ['standard']
  },

  // ======================== 5. PDF SECURITY ========================
  {
    id: 'unlock_pdf', name: 'Unlock PDF', category: 'security', icon: '🔓', iconTheme: 'theme-security',
    accept: '.pdf', multiple: false, actionText: 'Unlock PDF Now', engineTag: 'Decrypt',
    desc: 'Remove password encryption and usage restrictions from authorized PDFs.',
    howItWorks: 'Authenticates encrypted documents with doc.authenticate(password) and writes a clean unencrypted PDF using PDF_ENCRYPT_NONE.',
    formats: 'Input: Encrypted .pdf + password → Output: Unlocked .pdf',
    proTip: 'For PDFs that allow opening without a password but block printing/copying, leave the password blank to strip owner restrictions.',
    sampleKinds: null
  },
  {
    id: 'protect_pdf', name: 'Protect PDF', category: 'security', icon: '🔒', iconTheme: 'theme-security',
    accept: '.pdf', multiple: false, actionText: 'Encrypt & Protect PDF', engineTag: 'AES-256 Bit',
    desc: 'Encrypt PDFs with AES-256 bit protection and granular Print/Copy/Modify permissions.',
    howItWorks: 'Applies 256-bit AES encryption (PDF_ENCRYPT_AES_256) with separate user/owner passwords and bitmask permissions for PDF_PERM_PRINT, PDF_PERM_COPY, and PDF_PERM_MODIFY.',
    formats: 'Input: .pdf → Output: AES-256 Encrypted .pdf',
    proTip: 'Uncheck "Allow Copy" and "Allow Modify" when distributing confidential financial statements.',
    sampleKinds: ['standard']
  },
  {
    id: 'sign_pdf', name: 'Sign PDF', category: 'security', icon: '✍️', iconTheme: 'theme-security', isNew: true,
    accept: '.pdf', multiple: false, actionText: 'Sign PDF Document', engineTag: 'Visual + PKI',
    desc: 'Draw, type, or upload a signature, drag onto page & apply PKCS#7 .pfx crypto signing.',
    howItWorks: 'Supports Draw Pad, Cursive Typed Canvas, or Image Upload, lets you drag & resize placement directly on the live PDF page, and optionally signs the byte range using pyHanko IncrementalPdfFileWriter with your .pfx/.p12 certificate (or an instant generated RSA-2048 cert).',
    formats: 'Input: .pdf (+ optional .pfx) → Output: Visually &/or Cryptographically Signed .pdf',
    proTip: 'Click "New .pfx" to generate and download a reusable 2048-bit RSA signing certificate in one click.',
    sampleKinds: ['standard']
  },
  {
    id: 'verify_signatures', name: 'Verify Signatures', category: 'security', icon: '🛡️', iconTheme: 'theme-security', isNew: true,
    accept: '.pdf', multiple: false, actionText: 'Verify PDF Signatures', engineTag: 'pyHanko Audit',
    desc: 'Cryptographically audit embedded PKCS#7/PAdES digital signatures & detect tampering.',
    howItWorks: 'Parses embedded PDF signature dictionaries via pyHanko PdfFileReader and runs validate_pdf_signature() to verify cryptographic digest integrity, byte-range coverage, signer identity, and self-signed vs CA status.',
    formats: 'Input: Signed .pdf → Output: Integrity Audit UI + JSON report',
    proTip: 'Sign any PDF with Cryptographic mode enabled in Sign PDF, then click "Send Output to Tool → Verify Signatures" to see live verification.',
    sampleKinds: ['standard']
  },
  {
    id: 'redact_pdf', name: 'Redact PDF', category: 'security', icon: '⬛', iconTheme: 'theme-security',
    accept: '.pdf', multiple: false, actionText: 'Redact Sensitive Data', engineTag: 'PII + Box Draw',
    desc: 'Permanently erase Cards, Emails, Phones, SSN, IBAN, Aadhaar, PAN, API keys & drawn boxes.',
    howItWorks: 'Scans page text against 8 built-in PII regexes plus custom keywords AND collects any manual black rectangles you drag onto the live PDF canvas, calling PyMuPDF apply_redactions() to permanently purge underlying text/vector characters.',
    formats: 'Input: .pdf → Output: Permanently sanitized .pdf',
    proTip: 'True redaction removes text from the PDF content stream—not just drawing a black box on top—so redacted data cannot be copied or searched.',
    sampleKinds: ['standard']
  },
  {
    id: 'metadata_sanitizer', name: 'Metadata & Sanitizer', category: 'security', icon: '🧹', iconTheme: 'theme-security', isNew: true,
    accept: '.pdf', multiple: false, actionText: 'Sanitize & Save PDF', engineTag: 'Deep Clean',
    desc: 'Inspect & edit XMP metadata; strip hidden links, attachments, comments & JavaScript.',
    howItWorks: 'Audits PDF metadata dictionaries, embedded attachments, external URI links, annotations, and /JavaScript or /OpenAction catalog triggers, letting you update fields or purge active hidden elements cleanly.',
    formats: 'Input: .pdf → Output: Audited & sanitized .pdf',
    proTip: 'Run this before sharing external RFPs or legal filings to guarantee zero hidden attachments or author names leak.',
    sampleKinds: ['standard']
  },

  // ======================== 6. PDF INTELLIGENCE ========================
  {
    id: 'compare_pdf', name: 'Compare PDF', category: 'intelligence', icon: '⚖️', iconTheme: 'theme-intelligence',
    accept: '.pdf', multiple: true, actionText: 'Compare Two PDFs', engineTag: 'Visual Heatmap',
    desc: 'Side-by-side page comparison with pixel diff heatmaps, line diffs & Diff PDF report.',
    howItWorks: 'Runs ordered difflib.ndiff text comparison per page AND computes pixel-level image differences (ImageChops + NumPy) to paint changed pixels onto a red Visual Diff Heatmap and export an Annotated Visual Diff PDF.',
    formats: 'Input: 2 .pdf files → Output: Interactive Diff Viewer + Visual_Diff.pdf',
    proTip: 'Click "Load Sample" here to auto-load Contract v1.0 & Contract v2.0 and test the visual heatmap immediately!',
    sampleKinds: ['compare_v1', 'compare_v2']
  },
  {
    id: 'pdf_forms', name: 'PDF Forms', category: 'intelligence', icon: '📋', iconTheme: 'theme-intelligence', isNew: true,
    accept: '.pdf', multiple: false, actionText: 'Save Form PDF', engineTag: 'Form Designer',
    desc: 'Detect & fill AcroForm fields, visually place new widgets, or flatten forms permanently.',
    howItWorks: 'Inspects page.widgets() into live input controls, lets you click directly on the PDF canvas to create new Text, Checkbox, or Dropdown AcroForm fields, updates widget values, and optionally runs doc.bake() to flatten fields.',
    formats: 'Input: .pdf → Output: Filled/Designed/Flattened .pdf',
    proTip: 'Check "Flatten Form" before emailing completed contracts so recipients cannot alter your filled values.',
    sampleKinds: ['form']
  },
  {
    id: 'ai_summarize', name: 'AI Summarizer', category: 'intelligence', icon: '🧠', iconTheme: 'theme-intelligence',
    accept: '.pdf', multiple: false, actionText: 'Generate AI Summary', engineTag: 'NLP + Entities',
    desc: 'Full-document summary, reading time, topics, extracted entities & optional Ollama AI.',
    howItWorks: 'Scores sentences across all pages using normalized TF scoring + intro position weighting, extracts dates, currency amounts, emails, and document category, and optionally refines via local Ollama if running on :11434.',
    formats: 'Input: .pdf → Output: Interactive Summary UI + .md download',
    proTip: 'Produces both an instant copyable card and a downloadable _Executive_Summary.md file.',
    sampleKinds: ['standard']
  },
  {
    id: 'chat_pdf', name: 'Chat with PDF', category: 'intelligence', icon: '💬', iconTheme: 'theme-intelligence', isNew: true,
    accept: '.pdf', multiple: true, actionText: 'Export Q&A Transcript', engineTag: 'BM25 RAG',
    desc: 'Ask natural questions across 1+ PDFs and jump directly to cited source pages.',
    howItWorks: 'Splits all PDF pages into overlapping 620-character chunks, ranks relevance via offline BM25/TF-IDF scoring (or synthesizes via local Ollama if toggled), and attaches clickable [Page N] citation pills that open the exact page preview.',
    formats: 'Input: 1+ .pdf files → Output: Interactive Chat + Q&A .md export',
    proTip: 'Click any cyan [Page N] pill beneath an answer to jump straight to that rendered PDF page.',
    sampleKinds: ['standard']
  },
  {
    id: 'translate_pdf', name: 'Translate PDF', category: 'intelligence', icon: '🌐', iconTheme: 'theme-intelligence',
    accept: '.pdf', multiple: false, actionText: 'Translate Document', engineTag: 'Unicode Fonts',
    desc: 'Translate PDFs into 10+ languages with bilingual mode & CJK/Hindi/Arabic font support.',
    howItWorks: 'Translates page text blocks via Local Ollama, Neural Translator (deep-translator), or Offline Glossary fallback, and embeds Windows Unicode TTF/TTC fonts (Nirmala, msyh, msgothic, arial) so non-Latin scripts render cleanly without missing glyphs.',
    formats: 'Input: .pdf → Output: Translated .pdf (optional Bilingual)',
    proTip: 'Enable "Bilingual Mode" to display the original source text directly underneath each translated paragraph.',
    sampleKinds: ['standard']
  },
  {
    id: 'invoice_extractor', name: 'Invoice Extractor', category: 'intelligence', icon: '🧾', iconTheme: 'theme-intelligence', isNew: true,
    accept: '.pdf,image/*', multiple: true, actionText: 'Extract to Excel (.xlsx)', engineTag: 'OCR + XLSX',
    desc: 'Batch extract Vendor, Invoice #, Date, Tax & Total from PDFs/scans into Excel.',
    howItWorks: 'Inspects text on uploaded PDFs/images (automatically invoking RapidOCR ONNX on scanned documents), runs structured field parsers for Vendor, Invoice #, Date, Tax, Total, and Email, and builds an auto-sized .xlsx spreadsheet + interactive preview table.',
    formats: 'Input: 1+ .pdf or image receipts → Output: Extracted_Invoices.xlsx + UI Table',
    proTip: 'Drop an entire folder of mixed scanned & digital invoices at once to consolidate them into one Excel ledger.',
    sampleKinds: ['scanned_invoice']
  },

  // ======================== 7. WORKFLOWS ========================
  {
    id: 'workflow', name: 'Create a workflow', category: 'workflows', icon: '⚡', iconTheme: 'theme-workflows', isNew: true,
    accept: '.pdf', multiple: true, actionText: 'Run Workflow Pipeline', engineTag: '14-Step Chain',
    desc: 'Chain up to 14 tools sequentially with saved presets, reordering & live SSE progress.',
    howItWorks: 'Executes your ordered step array sequentially through a shared directory pipeline (supporting Merge, Blank Removal, OCR, Rotate, Crop, Redact, Watermark, Page Numbers, Header/Footer, N-Up, Compress, PDF/A, Protect, Split) and persists custom presets in workflow_presets.json.',
    formats: 'Input: 1+ .pdf files → Output: Final processed .pdf/.zip + step log',
    proTip: 'Try 1-click built-in presets like "Legal Discovery Pack" or "Email-Ready Scan Pack", or save your own custom sequence.',
    sampleKinds: ['standard', 'compare_v1']
  }
];

