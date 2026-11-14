# UltraPDF Studio Pro

link: https://papergrid-pdf.onrender.com/ 

> **39+ 100% Free, Private, Offline PDF Tools in One Local Web Studio, Batch CLI, and Hotfolder Automation Suite.**  
> Built with **FastAPI**, **PyMuPDF**, **Pillow**, **RapidOCR (ONNX)**, **pyHanko**, and **pdf2docx** — runs completely locally on `http://127.0.0.1:8000` with zero cloud uploads or file-size limits.

---

## Table of Contents
1. [Highlights & Interactive UI](#highlights--interactive-ui)
2. [Complete Tool Suite (39 Tools Across 7 Categories)](#complete-tool-suite-39-tools-across-7-categories)
3. [Project Architecture](#project-architecture)
4. [Setup & Installation](#setup--installation)
5. [How to Run](#how-to-run)
   - [Option 1: Web Studio UI (Recommended)](#option-1-web-studio-ui-recommended)
   - [Option 2: Rule-Based Desktop Hotfolder Watcher](#option-2-rule-based-desktop-hotfolder-watcher)
   - [Option 3: High-Scale Command-Line CLI](#option-3-high-scale-command-line-cli)
6. [REST API Reference](#rest-api-reference)
7. [Tech Stack](#tech-stack)

---

## Highlights & Interactive UI

* **Interactive Visual PDF Canvas Studio (`static/js/canvas_studio.js`)**:
  * **Edit PDF**: Click/drag directly onto live high-DPI PDF pages to place text, freehand ink strokes, highlights, rectangles, circles, arrows, sticky notes, and whiteouts with undo/clear and zoom controls.
  * **Sign PDF**: Draw on a touch/mouse pad, type a stylized signature, or upload an image — then **drag and resize** the signature box directly on the target PDF page. Optionally enable **PKCS#7 / PAdES cryptographic signing** using a `.pfx`/`.p12` certificate (or generate a self-signed `.pfx` in one click).
  * **Redact PDF**: Combine automatic regex PII detection (Cards, Emails, Phones, SSN, IBAN, Aadhaar, PAN, API Keys) + custom keywords + **interactive box-draw redaction** directly on PDF pages.
  * **Crop PDF**: Drag a live crop frame directly over the PDF page preview, bidirectionally synced with Top/Right/Bottom/Left percentage inputs.
  * **PDF Forms**: Auto-detect and fill existing AcroForm widgets, visually click to place new **Text**, **Checkbox**, or **Dropdown** fields, and optionally **flatten** fields permanently.
* **1-Click Tool Chaining & History Drawer**:
  * Send the PDF output of any tool directly into another tool (`Merge -> OCR -> Redact -> Sign -> Protect`) without re-uploading, or revisit outputs in the **Recent Outputs** side drawer.
* **Batch 500MB+ Studio**:
  * Read 30+ massive PDFs, images, text logs, or Office files directly from a local folder (zero upload lag) or drag-and-drop upload, toggle Grid/List views, rotate individual files, inspect Storage Bloat (Images vs Structure/Fonts), compare **Original vs Compressed** with an interactive split-slider modal, and auto-split outputs into size-safe parts/ZIPs.
* **Real-Time SSE Progress & Automatic Temp Cleanup**:
  * Heavy jobs (`ocr_pdf`, `translate_pdf`, `workflow`, `invoice_extractor`, `pdf_to_word`, `compare_pdf`, and Batch Studio merges) run in background threads with live Server-Sent Events (`/api/progress/{job_id}`) and automatic TTL cleanup for `temp_outputs/`.

---

## Complete Tool Suite (39 Tools Across 7 Categories)

### 1. Organize PDF (4 Tools)
| Tool | Capabilities |
| :--- | :--- |
| **Merge PDF** | Combine multiple PDFs in custom order with clickable bookmark TOC entries. |
| **Split PDF** | Split by custom page ranges (`1-3, 5, 7-10`), extract every page individually, or divide into equal parts with `.zip` bundling. |
| **Organize PDF** | Visual HTML5 drag-and-drop page reordering, per-page or bulk rotation, reverse order, drop even pages, and delete pages. |
| **Scan to PDF** | Capture live pages via webcam/mobile camera or upload photos with auto-contrast & sharpness document enhancement. |

### 2. Optimize PDF (3 Tools)
| Tool | Capabilities |
| :--- | :--- |
| **Compress PDF** | Presets: **Balanced** (150 DPI), **Maximum Quality** (200 DPI), **Ultra-B&W 1-Bit** (monochrome thresholding up to 98% savings), or **Exact Target MB** (multi-pass adaptive refinement). |
| **Repair PDF** | Rebuilds damaged cross-reference (xref) tables, cleans unreferenced streams, and recovers pages from malformed PDFs. |
| **OCR PDF** | **100% offline RapidOCR ONNX** engine detects text on scanned/image PDFs and embeds an invisible searchable text layer (`render_mode=3`) aligned to word bounding boxes. |

### 3. Convert PDF (11 Tools)
| Tool | Capabilities |
| :--- | :--- |
| **PDF to Word** | Layout-accurate conversion to `.docx` using `pdf2docx` (preserving tables, columns, and images) with PyMuPDF block fallback. |
| **PDF to PowerPoint** | Convert pages into **editable `.pptx` slides** (native text boxes & extracted images) or rasterized slide images. |
| **PDF to Excel** | Extract PDF tables cleanly into styled `.xlsx` worksheets (with delimiter fallback for non-grid tables). |
| **Word to PDF** | Convert `.docx` headings, bold/italic paragraphs, and bordered tables into styled multi-page PDF via PyMuPDF Story. |
| **PowerPoint to PDF** | Convert `.pptx` slides preserving original slide geometry, positioned text boxes, tables, and embedded images. |
| **Excel to PDF** | Render full multi-sheet `.xlsx` workbooks across all rows/columns with auto-wrapped landscape grid tables. |
| **PDF to JPG** | Export every PDF page to JPG/PNG at configurable DPI packaged in a `.zip` archive. |
| **JPG to PDF** | Convert JPG, PNG, and WEBP images to PDF with Portrait, Landscape, or Natural Fit orientation and margin controls. |
| **HTML to PDF** | Convert live URLs or raw HTML+CSS using headless Microsoft Edge / Google Chrome (`--print-to-pdf`), with PyMuPDF Story CSS fallback. |
| **PDF to PDF/A** | ISO 19005-2 **PDF/A-2b** archival conversion: strips encryption & launch links, embeds XMP `pdfaid` metadata and sRGB `OutputIntents`. |
| **PDF to Markdown** | Structured Markdown conversion preserving headings, bullet lists, and Markdown tables for notes and LLM ingestion. |

### 4. Edit PDF (8 Tools)
| Tool | Capabilities |
| :--- | :--- |
| **Edit PDF** | Interactive canvas annotations: Text, Freehand Ink, Highlights, Rectangles, Circles, Arrows, Sticky Notes, and Whiteout. |
| **Rotate PDF** | Rotate all, odd, or even pages by 90°, 180°, or 270°. |
| **Page numbers** | Insert customizable sequential or Bates-formatted footers/headers (`Page {page} of {total}`). |
| **Crop PDF** | Interactive draggable crop overlay on live page previews synced with Top/Right/Bottom/Left % trims. |
| **Watermark** | Stamp diagonal, horizontal, or vertical text watermarks with custom opacity and font size. |
| **N-Up & Booklet** | Arrange pages as **2-Up**, **4-Up**, **6-Up** handouts or **Saddle-Stitch Booklet** duplex ordering with optional cut borders. |
| **Header & Footer** | 6-slot placement (Left/Center/Right Header & Footer) supporting `{page}`, `{total}`, `{date}`, `{filename}`, and `{bates}` tokens. |
| **Bookmark Editor** | Inspect existing PDF bookmarks, edit/add hierarchical TOC entries, or auto-detect section headings. |

### 5. PDF Security (6 Tools)
| Tool | Capabilities |
| :--- | :--- |
| **Unlock PDF** | Remove password encryption and permission locks (with password authentication when encrypted). |
| **Protect PDF** | Encrypt PDFs with **AES-256** and granular Print, Copy, and Modify permission flags. |
| **Sign PDF** | Draw, type, or upload a signature, position/resize on page preview, and optionally apply **PKCS#7/PAdES** digital signatures via `.pfx`/`.p12` (with built-in self-signed cert generator). |
| **Verify Signatures** | Inspect and cryptographically validate embedded digital signatures, byte-range integrity, signer CN, and timestamps. |
| **Redact PDF** | Permanently erase text & graphics using 8 PII patterns (Cards, Emails, Phones, SSN, IBAN, Aadhaar, PAN, API Keys), custom keywords, and manual canvas redaction boxes. |
| **Metadata & Sanitizer** | Inspect/edit XMP & document metadata; strip metadata, embedded attachments, external hyperlinks, annotations, and `/OpenAction` JavaScript triggers. |

### 6. PDF Intelligence (6 Tools)
| Tool | Capabilities |
| :--- | :--- |
| **Compare PDF** | Ordered line-by-line `difflib` comparison + per-page **pixel diff heatmaps** + downloadable **Annotated Visual Diff PDF**. |
| **PDF Forms** | Detect & fill AcroForm fields, visually place new Text/Checkbox/Dropdown fields, and optionally flatten forms (`doc.bake()`). |
| **AI Summarizer** | Full-document extractive summarization with reading time, word count, topics, entities (dates, currency amounts, emails), and optional local **Ollama** refinement. |
| **Chat with PDF** | Interactive multi-PDF Q&A powered by BM25 chunk retrieval (or optional local Ollama) with clickable `[Page N]` citation pills that preview the exact page. |
| **Translate PDF** | Multi-tier translation (`Auto` / `Neural` / `Ollama` / `Offline Glossary`) with bilingual side-by-side mode and Unicode Windows font rendering (`Nirmala.ttc`, `msyh.ttc`, `msgothic.ttc`, `arial.ttf`). |
| **Invoice Extractor** | Batch extract Vendor, Invoice #, Date, Tax, Total, and Contact Email from PDFs/images (with automatic RapidOCR on scans) into a formatted `.xlsx` workbook. |

### 7. Workflows (1 Tool)
| Tool | Capabilities |
| :--- | :--- |
| **Create a workflow** | Chain **14 sequential tools** (`merge`, `remove_blank_pages`, `ocr`, `rotate`, `crop`, `redact`, `watermark`, `page_numbers`, `header_footer`, `impose`, `compress`, `pdf_to_pdfa`, `protect`, `split`) with step reordering, inline options, and saved JSON presets (`workflow_presets.json`). |

---

## Project Architecture

```text
Merge_Compress/
├── app.py                     # FastAPI web server, SSE job progress, tool routing & history/cleanup APIs
├── merge_and_compress.py      # Batch 500MB+ merge/compression engine, target-MB solver, bloat inspector & CLI
├── pdf_suite.py               # Core tool wrappers & unified suite interface
├── pdf_advanced.py            # Offline RapidOCR, translation, Story/Office/HTML engines, RAG chat, PKI, imposition, etc.
├── watcher.py                 # Rule-based desktop hotfolder automation & Windows system tray watcher
├── requirements.txt           # Pinned Python dependencies
├── run.bat                    # One-click Windows launcher for web studio (http://127.0.0.1:8000)
├── run_watcher.bat            # One-click launcher for desktop hotfolder watcher
├── templates/
│   └── index.html             # Single-page studio shell, modals, history drawer & Batch 500MB+ UI
├── static/
│   ├── css/style.css          # Dark glassmorphism design system + interactive canvas/diff/chat styles
│   ├── js/canvas_studio.js    # Reusable interactive SVG/HTML PDF overlay studio (Edit, Sign, Redact, Crop, Forms)
│   ├── js/app.js              # Tool registry, dynamic tool panels, SSE client, chaining & Batch Studio wiring
│   └── favicon.svg            # Application icon
└── temp_outputs/              # Ephemeral per-job output workspace (auto-cleaned via TTL sweeper)
```

---

## Setup & Installation

**Prerequisites:** Python 3.11+ (Windows recommended; headless Edge/Chrome optional for full-CSS `HTML to PDF`).

```powershell
# 1. Create and activate virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# 2. Install dependencies
pip install -r requirements.txt
```

> **Optional Local LLM Enhancement:** If [Ollama](https://ollama.com/) is running locally on `http://127.0.0.1:11434` (default model `llama3.2`), **AI Summarizer**, **Chat with PDF**, and **Translate PDF** can optionally route synthesis through your local LLM — otherwise they operate 100% offline using built-in NLP/BM25/glossary engines.

---

## How to Run

### Option 1: Web Studio UI (Recommended)
Double-click [`run.bat`](run.bat) or run from the project directory:
```powershell
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```
Open **http://127.0.0.1:8000** in your browser.

### Option 2: Rule-Based Desktop Hotfolder Watcher
Double-click [`run_watcher.bat`](run_watcher.bat), run from terminal, or launch in Windows System Tray mode:
```powershell
# Standard console mode
.\.venv\Scripts\python.exe watcher.py

# Windows System Tray mode (with quick Scan / Open Folder menu)
.\.venv\Scripts\python.exe watcher.py --tray
```
`watcher.py` creates `Desktop\AutoMerge\Input\` along with automated rule subfolders:
* `Desktop\AutoMerge\Input\` — Single-file or multi-file batch Merge & Compress (Balanced)
* `Desktop\AutoMerge\Input\UltraBW_Max\` — Extreme 1-bit monochrome compression
* `Desktop\AutoMerge\Input\OCR_Searchable\` — Offline RapidOCR searchable PDF conversion
* `Desktop\AutoMerge\Input\Redact_PII\` — Automatic PII Redaction + Compression
* `Desktop\AutoMerge\Input\PDF_to_Word\` — Convert dropped PDFs to `.docx`

Processed files appear in `Desktop\AutoMerge\Output\`, originals move to `Desktop\AutoMerge\Processed\`, and you can also inspect or trigger hotfolders directly from the **Hotfolder Automation Center** modal in the web UI.

### Option 3: High-Scale Command-Line CLI
Process folders or lists of PDFs, images (`jpg`, `png`, `webp`, `bmp`), and paginated text (`txt`, `log`, `csv`) or Office files directly via [`merge_and_compress.py`](merge_and_compress.py):

```powershell
.\.venv\Scripts\python.exe merge_and_compress.py "C:\Path\To\MyPDFs" `
  -o "Merged_Final.pdf" `
  --level balanced `
  --bookmarks `
  --redact-pii `
  --summary `
  --page-numbers `
  --remove-blank-pages `
  --watermark "CONFIDENTIAL" `
  --password "MyStrongPassword"
```

**Supported CLI Flags:**
* `--level`: `balanced` | `maximum` | `lossless` | `none` | `target` | `ultra_bw`
* `--target-mb <MB>`: Adaptive multi-pass size ceiling (e.g. `--level target --target-mb 25`)
* `--grayscale` / `--ultra-bw`: 8-bit grayscale or 1-bit monochrome thresholding
* `--bookmarks` / `--no-bookmarks`: Toggle clickable TOC outline
* `--page-numbers`, `--remove-blank-pages`, `--redact-pii`, `--summary`, `--watermark`, `--password`
* `--auto-split`, `--auto-split-mb <MB>`, `--auto-split-parts <N>`: Auto-split oversized outputs with ZIP packaging

---

## REST API Reference

| Category | Method & Endpoint | Purpose |
| :--- | :--- | :--- |
| **UI** | `GET /` | Serve UltraPDF Studio Pro web application |
| **Universal Tools** | `POST /api/tool/execute` | Execute any of the 39 tools synchronously |
| | `POST /api/tool/execute-async` | Execute heavy tools in background thread with SSE progress |
| | `GET /api/download-file/{job_id}/{filename}` | Download generated tool artifact |
| **Visual Canvas & Forms** | `POST /api/tool/page-thumbnails` | Render page thumbnails + rotations for Organize PDF |
| | `POST /api/tool/pdf-preview-pages` | Render high-res pages with PDF point dimensions (`width_pt`, `height_pt`) |
| | `POST /api/tool/form-fields` | Detect fillable AcroForm widgets |
| **Intelligence & PKI** | `POST /api/tool/chat-pdf` | BM25 / Ollama Q&A over uploaded PDFs with page citations |
| | `POST /api/tool/verify-signatures` | Verify embedded PKCS#7/PAdES digital signatures |
| | `POST /api/tool/generate-cert` | Generate downloadable self-signed `.pfx` signing certificate |
| | `POST /api/tool/inspect-metadata` | Inspect metadata, links, attachments, annotations & JS triggers |
| | `POST /api/tool/inspect-bookmarks` | Read current PDF TOC bookmarks |
| **Batch 500MB+ Studio** | `POST /api/choose-folder`, `POST /api/scan-folder` | Browse or scan local folder contents |
| | `POST /api/process-folder`, `POST /api/upload-and-process` | Start background merge & compression job |
| | `GET /api/progress/{job_id}` | SSE stream of real-time stage, percentage & result payload |
| | `POST /api/split-pdf`, `GET /api/download-split/{job_id}/{filename}` | Post-merge document divider & ZIP download |
| | `POST /api/get-diff-preview`, `POST /api/get-page-preview` | Original vs Compressed comparison & page previews |
| **Workflows, Hotfolder & System** | `GET / POST /api/workflows/presets`, `DELETE /api/workflows/presets/{id}` | Manage built-in & custom workflow templates |
| | `GET /api/hotfolder/status`, `POST /api/hotfolder/run-once`, `POST /api/hotfolder/config` | Monitor, trigger, and configure hotfolder automation |
| | `GET /api/system/history`, `POST /api/system/cleanup`, `POST /api/open-folder` | Recent outputs history, temp cleanup & Explorer integration |

---

## Tech Stack

* **Web Backend:** FastAPI, Uvicorn, Starlette, Pydantic, python-multipart, aiofiles
* **PDF Core & Rendering:** PyMuPDF (`pymupdf`), Pillow, NumPy, PyMuPDF Story, Headless Edge/Chrome (optional)
* **Offline OCR:** `rapidocr-onnxruntime`, `onnxruntime`, OpenCV, Shapely, PyClipper
* **Office Interop:** `pdf2docx`, `python-docx`, `python-pptx`, `openpyxl`, `XlsxWriter`
* **Security & PKI:** `pyHanko`, `pyhanko-certvalidator`, `cryptography`, `asn1crypto`
* **Translation & Web Parsing:** `deep-translator`, `requests`, `beautifulsoup4`, `lxml`
* **Desktop Automation:** `pystray` (System Tray), Windows `os.startfile` integration


---

## 🌐 Public Web Mode & Docker Deployment

UltraPDF Studio Pro includes a hardened **`PUBLIC_MODE=true`** environment flag so anyone on the internet can safely use all 39+ tools without accessing host folders:

- **Host Filesystem Isolation:** Disables `/api/choose-folder`, `/api/scan-folder`, `/api/process-folder`, `/api/open-folder`, hotfolder endpoints, global cache clearing, and server-side `file_path` arguments (`HTTP 403`).
- **Path Traversal & SSRF Protection:** Validates temp download paths via `_safe_temp_path()` and blocks private/loopback/link-local IPs in HTML-to-PDF URL fetching (`_validate_public_url()`).
- **Upload Quotas & Auto-Cleanup:** Enforces `MAX_UPLOAD_MB` (default `100` MB per batch) with `HTTP 413`, runs a 15-minute background cleanup sweep, and stores recent history strictly per browser via `localStorage`.

### Run Locally in Public Mode + Cloudflare Quick Tunnel

1. Start the server in Public Mode (or double-click `run_public.bat`):
   ```powershell
   $env:PUBLIC_MODE="true"; $env:MAX_UPLOAD_MB="100"
   .\.venv\Scripts\python.exe -m uvicorn app:app --host 0.0.0.0 --port 8000
   ```
2. Expose via Cloudflare Quick Tunnel (free instant HTTPS URL):
   ```powershell
   cloudflared tunnel --url http://127.0.0.1:8000
   ```

### Deploy with Docker (Render / Railway / Fly.io / Cloud Run)

A production `Dockerfile` (with Chromium + Noto fonts) and `.dockerignore` are included:

```bash
docker build -t ultrapdf-studio .
docker run -p 8000:8000 -e PUBLIC_MODE=true -e MAX_UPLOAD_MB=100 ultrapdf-studio
```
