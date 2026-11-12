"""
PDF Merger & Compressor - Advanced Web Application Server
=========================================================
FastAPI backend with Server-Sent Events (SSE) for real-time progress streaming,
file upload handling, visual thumbnails, universal ingestion, AI categorization,
PII redaction, watermarks, executive summary, and dynamic PDF splitting.
"""

import os
import re
import sys
import uuid
import json
import time
import shutil
import base64
import asyncio
import threading
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, StreamingResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles

from merge_and_compress import (
    merge_and_compress_files,
    natural_sort_key,
    format_size,
    generate_page_thumbnail,
    detect_document_category,
    split_pdf,
    inspect_pdf_bloat,
    universal_convert_to_pdf
)
import pymupdf
from PIL import Image
import pdf_suite
import pdf_advanced
import watcher

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
TEMPLATES_DIR = BASE_DIR / "templates"
TEMP_OUTPUTS_DIR = BASE_DIR / "temp_outputs"
TEMP_OUTPUTS_DIR.mkdir(exist_ok=True)

PUBLIC_MODE = os.getenv("PUBLIC_MODE", "false").lower() in ("1", "true", "yes")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "100"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

app = FastAPI(title="UltraPDF Studio Pro", version="4.0.0")

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

jobs: Dict[str, Dict[str, Any]] = {}
recent_history: List[Dict[str, Any]] = []

VALID_EXTENSIONS = {
    ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".bmp",
    ".txt", ".log", ".csv", ".docx", ".xlsx", ".pptx"
}


def _require_local_mode() -> None:
    if PUBLIC_MODE:
        raise HTTPException(status_code=403, detail="This local filesystem endpoint is disabled in Public Mode.")


def _safe_temp_path(*parts: str) -> Path:
    root = TEMP_OUTPUTS_DIR.resolve()
    cand = root.joinpath(*parts).resolve()
    try:
        cand.relative_to(root)
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid file path.")
    return cand


def cleanup_old_temp_outputs(max_age_hours: float = 12.0) -> Dict[str, Any]:
    """Remove expired temporary job folders to prevent unbounded disk usage."""
    cutoff = time.time() - (max_age_hours * 3600.0)
    removed_dirs = 0
    reclaimed_bytes = 0
    for item in TEMP_OUTPUTS_DIR.iterdir():
        if item.is_dir():
            try:
                if item.stat().st_mtime < cutoff:
                    size = sum(f.stat().st_size for f in item.rglob("*") if f.is_file())
                    shutil.rmtree(item, ignore_errors=True)
                    removed_dirs += 1
                    reclaimed_bytes += size
                    jobs.pop(item.name, None)
            except Exception:
                pass
    return {"removed_dirs": removed_dirs, "reclaimed_str": format_size(reclaimed_bytes)}


@app.on_event("startup")
async def on_startup_cleanup():
    cleanup_old_temp_outputs(max_age_hours=1.0 if PUBLIC_MODE else 24.0)
    if PUBLIC_MODE:
        async def _periodic_cleaner():
            while True:
                await asyncio.sleep(900)
                cleanup_old_temp_outputs(max_age_hours=1.0)
        asyncio.create_task(_periodic_cleaner())


def select_folder_native():
    """Trigger native Windows folder dialog."""
    try:
        import tkinter as tk
        from tkinter import filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        folder = filedialog.askdirectory(title="Select Folder Containing Documents or Images")
        root.destroy()
        return folder if folder else None
    except Exception:
        return None


def run_processing_job(
    job_id: str,
    file_paths: List[Path],
    output_path: Path,
    options: Dict[str, Any]
):
    """Worker function executed in background thread."""
    def callback(stage: str, current: int, total: int, pct: int, msg: str):
        if job_id in jobs:
            jobs[job_id]["stage"] = stage
            jobs[job_id]["current"] = current
            jobs[job_id]["total"] = total
            jobs[job_id]["pct"] = pct
            jobs[job_id]["message"] = msg

    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["message"] = "Starting processing..."
        jobs[job_id]["pct"] = 0

        stats = merge_and_compress_files(
            file_paths,
            output_path,
            compression_level=options.get("compression_level", "balanced"),
            target_mb=options.get("target_mb"),
            custom_dimension=options.get("custom_dimension"),
            custom_quality=options.get("custom_quality"),
            grayscale=options.get("grayscale", False),
            ultra_bw=options.get("ultra_bw", False),
            add_bookmarks=options.get("add_bookmarks", True),
            add_page_numbers=options.get("add_page_numbers", False),
            remove_blank_pages=options.get("remove_blank_pages", False),
            strip_metadata=options.get("strip_metadata", True),
            password=options.get("password"),
            watermark_text=options.get("watermark_text"),
            redact_pii=options.get("redact_pii", False),
            add_executive_summary=options.get("add_executive_summary", False),
            file_rotations=options.get("file_rotations", {}),
            auto_split=options.get("auto_split", False),
            auto_split_threshold_mb=float(options.get("auto_split_threshold_mb", 100.0)),
            auto_split_parts=int(options.get("auto_split_parts", 2)),
            verbose=False,
            progress_callback=callback
        )

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["pct"] = 100
        jobs[job_id]["message"] = f"Finished! Saved {stats['reduction_pct']}% of original size."
        jobs[job_id]["stats"] = stats
        jobs[job_id]["output_path"] = str(output_path)
        if stats.get("split_info"):
            jobs[job_id]["split_info"] = stats["split_info"]

    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["message"] = f"Error: {str(e)}"
        jobs[job_id]["error"] = str(e)


def extract_file_info(file_path: Path, include_thumbnail: bool = True) -> Dict[str, Any]:
    """Inspect a file for metadata, category, page count, and thumbnail."""
    info = {
        "name": file_path.name,
        "path": str(file_path.resolve()),
        "size": file_path.stat().st_size,
        "size_str": format_size(file_path.stat().st_size),
        "pages": 1,
        "category": "General Document",
        "thumbnail": None
    }
    suffix = file_path.suffix.lower()

    if suffix == ".pdf":
        try:
            doc = pymupdf.open(str(file_path))
            info["pages"] = len(doc)
            info["category"] = detect_document_category(doc)
            if include_thumbnail and len(doc) > 0:
                mat = pymupdf.Matrix(0.22, 0.22)
                pix = doc[0].get_pixmap(matrix=mat)
                import base64
                info["thumbnail"] = "data:image/png;base64," + base64.b64encode(pix.tobytes("png")).decode("utf-8")
            doc.close()
        except Exception:
            pass
    elif suffix in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
        info["category"] = "Scanned Image"
        if include_thumbnail:
            try:
                import io, base64
                im = Image.open(str(file_path))
                im.thumbnail((160, 200))
                buf = io.BytesIO()
                im.save(buf, format="JPEG", quality=70)
                info["thumbnail"] = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")
            except Exception:
                pass
    elif suffix == ".txt":
        info["category"] = "Text Document"

    return info


@app.get("/", response_class=HTMLResponse)
async def serve_index():
    index_file = TEMPLATES_DIR / "index.html"
    if not index_file.is_file():
        raise HTTPException(status_code=404, detail="Index template not found.")
    return HTMLResponse(content=index_file.read_text(encoding="utf-8"))


@app.post("/api/choose-folder")
async def choose_folder():
    _require_local_mode()
    loop = asyncio.get_event_loop()
    selected = await loop.run_in_executor(None, select_folder_native)
    if not selected:
        return {"folder_path": None, "files": []}

    folder_path = Path(selected)
    raw_files = [f for f in folder_path.iterdir() if f.is_file() and f.suffix.lower() in VALID_EXTENSIONS]
    raw_files = sorted(raw_files, key=lambda f: natural_sort_key(f.name))

    files_data = [extract_file_info(f, include_thumbnail=True) for f in raw_files]
    total_size = sum(f["size"] for f in files_data)

    return {
        "folder_path": str(folder_path.resolve()),
        "files": files_data,
        "total_files": len(files_data),
        "total_size": total_size,
        "total_size_str": format_size(total_size)
    }


@app.post("/api/scan-folder")
async def scan_folder(payload: Dict[str, str]):
    _require_local_mode()
    folder_str = payload.get("folder_path", "").strip()
    if not folder_str:
        raise HTTPException(status_code=400, detail="Folder path is required.")

    folder_path = Path(folder_str)
    if not folder_path.is_dir():
        raise HTTPException(status_code=400, detail=f"Directory '{folder_str}' does not exist.")

    raw_files = [f for f in folder_path.iterdir() if f.is_file() and f.suffix.lower() in VALID_EXTENSIONS]
    raw_files = sorted(raw_files, key=lambda f: natural_sort_key(f.name))

    files_data = [extract_file_info(f, include_thumbnail=True) for f in raw_files]
    total_size = sum(f["size"] for f in files_data)

    return {
        "folder_path": str(folder_path.resolve()),
        "files": files_data,
        "total_files": len(files_data),
        "total_size": total_size,
        "total_size_str": format_size(total_size)
    }


@app.post("/api/get-page-preview")
async def get_page_preview(payload: Dict[str, Any]):
    _require_local_mode()
    file_path = payload.get("file_path")
    page_num = int(payload.get("page", 0))
    if not file_path or not Path(file_path).is_file():
        raise HTTPException(status_code=400, detail="Invalid file path.")

    try:
        doc = pymupdf.open(file_path)
        total_pages = len(doc)
        if page_num < 0 or page_num >= total_pages:
            doc.close()
            raise HTTPException(status_code=400, detail="Page index out of range.")
        page = doc[page_num]
        mat = pymupdf.Matrix(0.9, 0.9)
        pix = page.get_pixmap(matrix=mat)
        b64 = "data:image/png;base64," + base64.b64encode(pix.tobytes("png")).decode("utf-8")
        doc.close()
        return {"preview": b64, "page": page_num + 1, "total_pages": total_pages}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/get-diff-preview")
async def get_diff_preview(payload: Dict[str, Any]):
    """Generate Before/After preview images for quality comparison."""
    job_id = payload.get("job_id")
    if not job_id or job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")

    job = jobs[job_id]
    out_path = Path(job.get("output_path", ""))
    if not out_path.is_file():
        raise HTTPException(status_code=404, detail="Output file not found.")

    try:
        out_doc = pymupdf.open(str(out_path))
        pix_comp = out_doc[0].get_pixmap(matrix=pymupdf.Matrix(0.9, 0.9))
        b64_compressed = "data:image/png;base64," + base64.b64encode(pix_comp.tobytes("png")).decode("utf-8")
        total_pages = len(out_doc)
        out_doc.close()

        b64_original = None
        first_in = job.get("first_input_path")
        if first_in and Path(first_in).is_file() and Path(first_in).suffix.lower() == ".pdf":
            in_doc = pymupdf.open(str(first_in))
            if len(in_doc) > 0:
                pix_orig = in_doc[0].get_pixmap(matrix=pymupdf.Matrix(0.9, 0.9))
                b64_original = "data:image/png;base64," + base64.b64encode(pix_orig.tobytes("png")).decode("utf-8")
            in_doc.close()

        return {
            "compressed_preview": b64_compressed,
            "original_preview": b64_original,
            "total_pages": total_pages,
            "filename": out_path.name
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/open-folder")
async def open_folder(payload: Dict[str, str]):
    """Open an output folder or hotfolder safely in Windows Explorer."""
    _require_local_mode()
    req_path = (payload.get("path") or "").strip()
    if not req_path:
        target = TEMP_OUTPUTS_DIR
    elif req_path == "hotfolder_input":
        target = watcher.INPUT_DIR
    elif req_path == "hotfolder_output":
        target = watcher.OUTPUT_DIR
    else:
        cand = (BASE_DIR / req_path).resolve()
        if str(cand).startswith(str(BASE_DIR.resolve())) or str(cand).startswith(str(watcher.WATCH_BASE.resolve())):
            target = cand
        else:
            raise HTTPException(status_code=403, detail="Access denied outside workspace.")
    if target.is_file():
        target = target.parent
    if not target.exists():
        target.mkdir(parents=True, exist_ok=True)
    try:
        os.startfile(str(target))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"success": True, "opened": str(target)}


@app.post("/api/process-folder")
async def process_folder(payload: Dict[str, Any]):
    _require_local_mode()
    folder_path = payload.get("folder_path")
    file_paths = payload.get("file_paths", [])
    custom_filename = payload.get("output_filename", "").strip()

    if not file_paths and folder_path:
        folder = Path(folder_path)
        if folder.is_dir():
            files = [f for f in folder.iterdir() if f.is_file() and f.suffix.lower() in VALID_EXTENSIONS]
            file_paths = [str(f.resolve()) for f in sorted(files, key=lambda x: natural_sort_key(x.name))]

    if not file_paths:
        raise HTTPException(status_code=400, detail="No valid documents provided.")

    valid_paths = [Path(p) for p in file_paths if Path(p).is_file()]
    if not valid_paths:
        raise HTTPException(status_code=400, detail="None of the specified files exist.")

    job_id = str(uuid.uuid4())
    job_dir = TEMP_OUTPUTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)

    preset = payload.get("compression_level", "balanced")
    if not custom_filename:
        custom_filename = f"Merged_Compressed_{preset.capitalize()}.pdf"
    if not custom_filename.lower().endswith(".pdf"):
        custom_filename += ".pdf"

    output_path = job_dir / custom_filename

    jobs[job_id] = {
        "id": job_id,
        "status": "queued",
        "stage": "starting",
        "pct": 0,
        "message": "Initializing UltraPDF Pro engine...",
        "output_filename": custom_filename,
        "output_path": str(output_path),
        "first_input_path": str(valid_paths[0]),
        "stats": None
    }

    thread = threading.Thread(
        target=run_processing_job,
        args=(job_id, valid_paths, output_path, payload),
        daemon=True
    )
    thread.start()

    return {"job_id": job_id, "output_filename": custom_filename}


@app.post("/api/upload-and-process")
async def upload_and_process(
    files: List[UploadFile] = File(...),
    options_json: str = Form("{}"),
    output_filename: str = Form("")
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    try:
        options = json.loads(options_json)
    except Exception:
        options = {}

    job_id = str(uuid.uuid4())
    job_dir = TEMP_OUTPUTS_DIR / job_id
    inputs_dir = job_dir / "inputs"
    inputs_dir.mkdir(parents=True, exist_ok=True)

    saved_paths = []
    sorted_files = sorted(files, key=lambda f: natural_sort_key(f.filename or "file"))

    for upload in sorted_files:
        if not upload.filename:
            continue
        ext = Path(upload.filename).suffix.lower()
        if ext not in VALID_EXTENSIONS:
            continue
        safe_name = Path(upload.filename or "upload.bin").name
        if safe_name in ("", ".", ".."):
            safe_name = "upload.bin"
        dest = (inputs_dir / safe_name).resolve()
        try:
            dest.relative_to(inputs_dir.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Invalid upload filename.")
        content = await upload.read()
        already_bytes = sum(p.stat().st_size for p in saved_paths if p.is_file())
        if already_bytes + len(content) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=413,
                detail=f"Upload exceeds maximum allowed batch limit of {MAX_UPLOAD_MB} MB."
            )
        dest.write_bytes(content)
        saved_paths.append(dest)

    if not saved_paths:
        raise HTTPException(status_code=400, detail="No valid document or image files found in upload.")

    preset = options.get("compression_level", "balanced")
    if not output_filename:
        output_filename = f"Merged_Compressed_{preset.capitalize()}.pdf"
    if not output_filename.lower().endswith(".pdf"):
        output_filename += ".pdf"

    output_path = job_dir / output_filename

    jobs[job_id] = {
        "id": job_id,
        "status": "queued",
        "stage": "starting",
        "pct": 0,
        "message": "Initializing UltraPDF Pro engine...",
        "output_filename": output_filename,
        "output_path": str(output_path),
        "first_input_path": str(saved_paths[0]),
        "stats": None
    }

    thread = threading.Thread(
        target=run_processing_job,
        args=(job_id, saved_paths, output_path, options),
        daemon=True
    )
    thread.start()

    return {"job_id": job_id, "output_filename": output_filename}


@app.post("/api/split-pdf")
async def handle_split_pdf(payload: Dict[str, Any]):
    """Split a processed PDF on demand into parts or target size."""
    job_id = payload.get("job_id")
    num_parts = int(payload.get("num_parts", 2))
    split_mode = payload.get("split_mode", "parts")
    max_part_mb = payload.get("max_part_mb")

    if not job_id or job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")

    job = jobs[job_id]
    output_path = Path(job.get("output_path", ""))
    if not output_path.is_file():
        raise HTTPException(status_code=404, detail="Processed file not found on disk.")

    splits_dir = output_path.parent / "splits"
    splits_dir.mkdir(parents=True, exist_ok=True)

    try:
        split_result = split_pdf(
            str(output_path),
            output_dir=str(splits_dir),
            split_mode=split_mode,
            num_parts=num_parts,
            max_part_mb=float(max_part_mb) if max_part_mb else None
        )
        job["split_info"] = split_result
        return split_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/download-split/{job_id}/{filename}")
async def download_split_part(job_id: str, filename: str):
    """Download a split PDF part or the zipped archive."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")

    job = jobs[job_id]
    output_path = Path(job.get("output_path", ""))
    splits_dir = (output_path.parent / "splits").resolve()
    target_file = (splits_dir / filename).resolve()
    try:
        target_file.relative_to(splits_dir)
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid file path.")
    if PUBLIC_MODE:
        try:
            target_file.relative_to(TEMP_OUTPUTS_DIR.resolve())
        except ValueError:
            raise HTTPException(status_code=403, detail="Invalid public file path.")

    if not target_file.is_file():
        raise HTTPException(status_code=404, detail=f"Split file '{filename}' not found.")

    media_type = "application/zip" if filename.lower().endswith(".zip") else "application/pdf"
    return FileResponse(
        path=str(target_file),
        filename=filename,
        media_type=media_type
    )


@app.get("/api/progress/{job_id}")
async def get_progress(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found.")

    async def event_generator():
        while True:
            job = jobs.get(job_id)
            if not job:
                yield f"data: {json.dumps({'status': 'failed', 'message': 'Job expired'})}\n\n"
                break

            data = {
                "job_id": job_id,
                "status": job.get("status", "running"),
                "stage": job.get("stage", "working"),
                "pct": job.get("pct", 0),
                "message": job.get("message", ""),
                "stats": job.get("stats"),
                "split_info": job.get("split_info"),
                "tool_result": job.get("tool_result"),
                "error": job.get("error"),
            }
            yield f"data: {json.dumps(data)}\n\n"

            if job.get("status") in ["completed", "failed"]:
                break

            await asyncio.sleep(0.35)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/api/download/{job_id}")
async def download_result(job_id: str):
    job = jobs.get(job_id)
    if not job or job.get("status") != "completed":
        raise HTTPException(status_code=404, detail="Processed file not ready or not found.")

    output_path = Path(job.get("output_path", ""))
    if not output_path.is_file():
        raise HTTPException(status_code=404, detail="Output file does not exist on disk.")

    return FileResponse(
        path=str(output_path),
        filename=job.get("output_filename", "Merged_Compressed.pdf"),
        media_type="application/pdf"
    )


@app.post("/api/tool/page-thumbnails")
async def get_tool_page_thumbnails(
    file: Optional[UploadFile] = File(None),
    file_path: Optional[str] = Form(None)
):
    """Generate high-resolution thumbnails for all pages of a PDF for visual tools."""
    doc = None
    temp_path = None
    try:
        if file and file.filename:
            content = await file.read()
            if len(content) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_MB} MB limit.")
            doc = pymupdf.open(stream=content, filetype="pdf")
        elif file_path:
            _require_local_mode()
            if Path(file_path).is_file():
                doc = pymupdf.open(file_path)
        else:
            raise HTTPException(status_code=400, detail="No PDF file provided.")

        pages_data = []
        import base64
        for idx in range(len(doc)):
            page = doc[idx]
            pix = page.get_pixmap(matrix=pymupdf.Matrix(0.35, 0.35))
            b64 = "data:image/png;base64," + base64.b64encode(pix.tobytes("png")).decode("utf-8")
            pages_data.append({
                "page": idx + 1,
                "width": page.rect.width,
                "height": page.rect.height,
                "rotation": page.rotation,
                "thumbnail": b64
            })

        doc.close()
        return {"success": True, "total_pages": len(pages_data), "pages": pages_data}
    except Exception as e:
        if doc:
            doc.close()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tool/form-fields")
async def get_form_fields(
    file: Optional[UploadFile] = File(None),
    file_path: Optional[str] = Form(None)
):
    """Detect fillable form fields in a PDF."""
    try:
        target_path = None
        temp_dir = None
        if file and file.filename:
            job_id = str(uuid.uuid4())
            temp_dir = TEMP_OUTPUTS_DIR / job_id
            temp_dir.mkdir(parents=True, exist_ok=True)
            safe_name = Path(file.filename).name
            if safe_name in ("", ".", ".."):
                safe_name = "form.pdf"
            target_path = _safe_temp_path(job_id, safe_name)
            content = await file.read()
            if len(content) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_MB} MB limit.")
            target_path.write_bytes(content)
        elif file_path:
            _require_local_mode()
            if Path(file_path).is_file():
                target_path = Path(file_path)
        else:
            raise HTTPException(status_code=400, detail="No PDF file provided.")

        result = pdf_suite.inspect_and_fill_forms(target_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


async def _save_single_upload(upload: UploadFile, target_dir: Path) -> Path:
    safe_name = Path(upload.filename or "upload.bin").name
    if safe_name in ("", ".", ".."):
        safe_name = "upload.bin"
    dest = (target_dir / safe_name).resolve()
    try:
        dest.relative_to(target_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Invalid upload filename.")
    content = await upload.read()
    existing_bytes = sum(f.stat().st_size for f in target_dir.rglob("*") if f.is_file())
    if existing_bytes + len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"Upload exceeds maximum limit of {MAX_UPLOAD_MB} MB.")
    dest.write_bytes(content)
    return dest


@app.post("/api/tool/pdf-preview-pages")
async def get_pdf_preview_pages(
    file: Optional[UploadFile] = File(None),
    file_path: Optional[str] = Form(None),
    job_id: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
    max_pages: int = Form(25),
):
    """Render high-res pages with PDF point dimensions for the interactive canvas studio."""
    doc = None
    try:
        if file and file.filename:
            content = await file.read()
            if len(content) > MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_MB} MB limit.")
            doc = pymupdf.open(stream=content, filetype="pdf")
        elif job_id and filename:
            safe_preview = _safe_temp_path(job_id, filename)
            if safe_preview.is_file():
                doc = pymupdf.open(str(safe_preview))
        elif file_path:
            _require_local_mode()
            if Path(file_path).is_file():
                doc = pymupdf.open(file_path)
        else:
            raise HTTPException(status_code=400, detail="No PDF file provided.")

        total_pages = len(doc)
        pages_out = []
        for idx in range(min(total_pages, max_pages)):
            page = doc[idx]
            pix = page.get_pixmap(matrix=pymupdf.Matrix(1.35, 1.35))
            b64 = "data:image/png;base64," + base64.b64encode(pix.tobytes("png")).decode("utf-8")
            pages_out.append({
                "page": idx + 1,
                "width_pt": round(float(page.rect.width), 2),
                "height_pt": round(float(page.rect.height), 2),
                "rotation": page.rotation,
                "image": b64,
            })
        return {"success": True, "total_pages": total_pages, "pages": pages_out}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if doc:
            doc.close()


@app.post("/api/tool/chat-pdf")
async def chat_with_pdf(
    question: str = Form(...),
    use_ollama: bool = Form(False),
    files: List[UploadFile] = File(default=[]),
):
    """Interactive Q&A with uploaded PDFs returning cited passages."""
    if not files:
        raise HTTPException(status_code=400, detail="Please upload at least one PDF.")
    job_dir = TEMP_OUTPUTS_DIR / f"chat_{uuid.uuid4()}"
    job_dir.mkdir(parents=True, exist_ok=True)
    saved: List[Path] = []
    try:
        for up in files:
            if up.filename:
                saved.append(await _save_single_upload(up, job_dir))
        return await asyncio.to_thread(pdf_advanced.chat_with_pdf_query, saved, question, use_ollama=use_ollama)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


@app.post("/api/tool/verify-signatures")
async def api_verify_signatures(file: UploadFile = File(...)):
    """Verify embedded cryptographic signatures in a PDF."""
    job_dir = TEMP_OUTPUTS_DIR / f"sig_{uuid.uuid4()}"
    job_dir.mkdir(parents=True, exist_ok=True)
    try:
        saved = await _save_single_upload(file, job_dir)
        return await asyncio.to_thread(pdf_advanced.verify_pdf_signatures, saved)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


@app.post("/api/tool/generate-cert")
async def api_generate_cert(
    common_name: str = Form("UltraPDF Signer"),
    organization: str = Form("UltraPDF Studio"),
    email: str = Form("signer@local"),
    password: str = Form("123456"),
):
    """Generate a reusable self-signed .pfx certificate."""
    job_id = str(uuid.uuid4())
    job_dir = TEMP_OUTPUTS_DIR / job_id
    job_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{re.sub(r'[^A-Za-z0-9_-]', '_', common_name)}.pfx" if 're' in globals() else "certificate.pfx"
    pfx_path = job_dir / fname
    pdf_advanced.generate_self_signed_pfx(pfx_path, common_name=common_name, organization=organization, email=email, password=password)
    return {"success": True, "job_id": job_id, "filename": fname, "download_url": f"/api/download-file/{job_id}/{fname}"}


@app.post("/api/tool/inspect-metadata")
async def api_inspect_metadata(file: UploadFile = File(...)):
    job_dir = TEMP_OUTPUTS_DIR / f"meta_{uuid.uuid4()}"
    job_dir.mkdir(parents=True, exist_ok=True)
    try:
        saved = await _save_single_upload(file, job_dir)
        return await asyncio.to_thread(pdf_advanced.inspect_metadata_security, saved)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


@app.post("/api/tool/inspect-bookmarks")
async def api_inspect_bookmarks(file: UploadFile = File(...)):
    job_dir = TEMP_OUTPUTS_DIR / f"toc_{uuid.uuid4()}"
    job_dir.mkdir(parents=True, exist_ok=True)
    try:
        saved = await _save_single_upload(file, job_dir)
        return await asyncio.to_thread(pdf_advanced.inspect_bookmarks, saved)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        shutil.rmtree(job_dir, ignore_errors=True)


@app.get("/api/workflows/presets")
async def api_get_workflow_presets():
    return {"success": True, "presets": pdf_advanced.load_workflow_presets()}


@app.post("/api/workflows/presets")
async def api_save_workflow_preset(payload: Dict[str, Any]):
    preset = pdf_advanced.save_workflow_preset(
        name=payload.get("name", "Custom Workflow"),
        desc=payload.get("desc", ""),
        steps=payload.get("steps", []),
    )
    return {"success": True, "preset": preset}


@app.delete("/api/workflows/presets/{preset_id}")
async def api_delete_workflow_preset(preset_id: str):
    deleted = pdf_advanced.delete_workflow_preset(preset_id)
    return {"success": deleted}


@app.get("/api/hotfolder/status")
async def api_hotfolder_status():
    _require_local_mode()
    return {"success": True, **watcher.get_hotfolder_status()}


@app.post("/api/hotfolder/run-once")
async def api_hotfolder_run_once():
    _require_local_mode()
    events = watcher.scan_hotfolder_once()
    return {"success": True, "events": events, "status": watcher.get_hotfolder_status()}


@app.post("/api/hotfolder/config")
async def api_hotfolder_config(payload: Dict[str, Any]):
    _require_local_mode()
    cfg = watcher.save_hotfolder_config(payload)
    return {"success": True, "config": cfg}


@app.get("/api/system/config")
async def api_system_config():
    return {"success": True, "public_mode": PUBLIC_MODE, "max_upload_mb": MAX_UPLOAD_MB}


@app.get("/api/system/history")
async def api_get_history():
    if PUBLIC_MODE:
        return {"success": True, "public_mode": True, "history": []}
    return {"success": True, "public_mode": False, "history": recent_history[:25]}


@app.post("/api/system/cleanup")
async def api_system_cleanup(payload: Dict[str, Any] = None):
    _require_local_mode()
    hrs = float((payload or {}).get("max_age_hours", 0))
    res = cleanup_old_temp_outputs(max_age_hours=hrs)
    if hrs == 0:
        recent_history.clear()
    return {"success": True, **res}


def _record_history(item: Dict[str, Any]) -> None:
    if PUBLIC_MODE:
        return
    recent_history.insert(0, {
        "job_id": item.get("job_id"),
        "tool": item.get("tool"),
        "filename": item.get("filename"),
        "output_size_str": item.get("output_size_str"),
        "download_url": item.get("download_url"),
        "timestamp": time.strftime("%H:%M:%S"),
    })
    if len(recent_history) > 30:
        recent_history.pop()


def _run_tool_sync(
    tool: str,
    options: Dict[str, Any],
    saved_inputs: List[Path],
    url_or_html: str,
    job_id: str,
    job_dir: Path,
    cert_path: Optional[Path] = None,
    progress_callback=None,
) -> Dict[str, Any]:
    """Unified synchronous execution engine for all 39+ tools."""
    out_filename = ""
    out_path: Optional[Path] = None
    result_data: Dict[str, Any] = {}
    preview_b64: Optional[str] = None

    if tool == "merge_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please upload or select PDF files to merge.")
        out_filename = options.get("filename", "Merged_Document.pdf")
        if not out_filename.endswith(".pdf"):
            out_filename += ".pdf"
        out_path = job_dir / out_filename
        result_data = pdf_suite.merge_pdfs_simple(saved_inputs, out_path, add_bookmarks=options.get("bookmarks", True))

    elif tool == "split_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to split.")
        result_data = pdf_suite.split_pdf_advanced(
            saved_inputs[0], job_dir, mode=options.get("mode", "ranges"),
            ranges_str=options.get("ranges", ""), num_parts=int(options.get("parts", 2)),
        )
        out_filename = result_data.get("zip_file") or (result_data.get("files", [{}])[0].get("name", "Split.pdf"))
        out_path = job_dir / out_filename

    elif tool == "compress_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to compress.")
        preset = options.get("preset", "balanced")
        target_mb = float(options["target_mb"]) if options.get("target_mb") else None
        out_filename = f"Compressed_{preset.capitalize()}_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.compress_pdf_file(saved_inputs[0], out_path, preset=preset, target_mb=target_mb)

    elif tool == "organize_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to organize.")
        out_filename = f"Organized_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.organize_pdf_pages(
            saved_inputs[0], out_path, page_order=options.get("page_order", []), page_rotations=options.get("rotations", {})
        )

    elif tool == "scan_to_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="No scanned images provided.")
        out_filename = options.get("filename", "Scanned_Document.pdf")
        if not out_filename.endswith(".pdf"):
            out_filename += ".pdf"
        out_path = job_dir / out_filename
        result_data = pdf_suite.scan_images_to_pdf(saved_inputs, out_path, enhance_mode=options.get("enhance", "document"))

    elif tool == "repair_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to repair.")
        out_filename = f"Repaired_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.repair_pdf_file(saved_inputs[0], out_path)

    elif tool == "ocr_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file for OCR.")
        out_filename = f"Searchable_OCR_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_advanced.ocr_pdf_document_real(
            saved_inputs[0], out_path, lang=options.get("lang", "eng"),
            force_ocr=bool(options.get("force_ocr", False)), progress_callback=progress_callback,
        )

    elif tool == "pdf_to_word":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"{saved_inputs[0].stem}.docx"
        out_path = job_dir / out_filename
        result_data = pdf_suite.pdf_to_word(saved_inputs[0], out_path)

    elif tool == "pdf_to_powerpoint":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"{saved_inputs[0].stem}.pptx"
        out_path = job_dir / out_filename
        result_data = pdf_suite.pdf_to_powerpoint(saved_inputs[0], out_path, editable=bool(options.get("editable", True)))

    elif tool == "pdf_to_excel":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"{saved_inputs[0].stem}.xlsx"
        out_path = job_dir / out_filename
        result_data = pdf_suite.pdf_to_excel(saved_inputs[0], out_path)

    elif tool == "word_to_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a Word (.docx) file.")
        out_filename = f"{saved_inputs[0].stem}.pdf"
        out_path = job_dir / out_filename
        result_data = pdf_suite.word_to_pdf(saved_inputs[0], out_path)

    elif tool == "powerpoint_to_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PowerPoint (.pptx) file.")
        out_filename = f"{saved_inputs[0].stem}.pdf"
        out_path = job_dir / out_filename
        result_data = pdf_suite.powerpoint_to_pdf(saved_inputs[0], out_path)

    elif tool == "excel_to_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide an Excel (.xlsx) file.")
        out_filename = f"{saved_inputs[0].stem}.pdf"
        out_path = job_dir / out_filename
        result_data = pdf_suite.excel_to_pdf(saved_inputs[0], out_path)

    elif tool == "pdf_to_jpg":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        result_data = pdf_suite.pdf_to_images_advanced(
            saved_inputs[0], job_dir, img_format=options.get("format", "jpg"), dpi=int(options.get("dpi", 150))
        )
        out_filename = result_data["zip_file"]
        out_path = job_dir / out_filename

    elif tool == "jpg_to_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide images to convert.")
        out_filename = options.get("filename", "Images_Converted.pdf")
        if not out_filename.endswith(".pdf"):
            out_filename += ".pdf"
        out_path = job_dir / out_filename
        result_data = pdf_suite.images_to_pdf_advanced(
            saved_inputs, out_path, orientation=options.get("orientation", "portrait"), margin_pt=int(options.get("margin", 20))
        )

    elif tool == "html_to_pdf":
        content_in = url_or_html or options.get("url_or_html", "")
        if not content_in:
            raise HTTPException(status_code=400, detail="Please provide a Web URL or HTML string.")
        out_filename = options.get("filename", "Webpage.pdf")
        if not out_filename.endswith(".pdf"):
            out_filename += ".pdf"
        out_path = job_dir / out_filename
        result_data = pdf_suite.html_to_pdf(content_in, out_path)

    elif tool == "pdf_to_pdfa":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"PDFA_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.pdf_to_pdfa(saved_inputs[0], out_path)

    elif tool == "pdf_to_markdown":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"{saved_inputs[0].stem}.md"
        out_path = job_dir / out_filename
        result_data = pdf_suite.pdf_to_markdown(saved_inputs[0], out_path)

    elif tool == "rotate_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"Rotated_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.rotate_pdf_pages_advanced(
            saved_inputs[0], out_path, angle=int(options.get("angle", 90)), pages_selection=options.get("pages", "all")
        )

    elif tool == "page_numbers":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"Numbered_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.add_page_numbers_advanced(
            saved_inputs[0], out_path, position=options.get("position", "bottom-center"),
            format_template=options.get("format", "Page {page} of {total}"), font_size=int(options.get("font_size", 10)),
        )

    elif tool == "crop_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"Cropped_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.crop_pdf_advanced(
            saved_inputs[0], out_path, margin_pct=float(options.get("margin_pct", 5.0)), custom_box=options.get("custom_box")
        )

    elif tool == "watermark_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"Watermarked_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.watermark_pdf_advanced(
            saved_inputs[0], out_path, text=options.get("text", "CONFIDENTIAL"),
            opacity=float(options.get("opacity", 0.35)), angle=int(options.get("angle", 45)), font_size=int(options.get("font_size", 48)),
        )

    elif tool == "unlock_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"Unlocked_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.unlock_pdf_document(saved_inputs[0], out_path, password=options.get("password", ""))

    elif tool == "protect_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        password = options.get("password", "")
        if not password:
            raise HTTPException(status_code=400, detail="Password is required.")
        out_filename = f"Protected_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.protect_pdf_document(
            saved_inputs[0], out_path, user_password=password,
            allow_print=bool(options.get("allow_print", True)),
            allow_copy=bool(options.get("allow_copy", True)),
            allow_modify=bool(options.get("allow_modify", False)),
        )

    elif tool == "sign_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to sign.")
        sig_data = options.get("signature_data_url", "")
        use_crypto = bool(options.get("cryptographic", False))
        if not sig_data and not use_crypto:
            raise HTTPException(status_code=400, detail="Please draw/type a signature or enable Cryptographic PKI signing.")
        out_filename = f"Signed_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        if use_crypto:
            result_data = pdf_advanced.sign_pdf_cryptographic(
                saved_inputs[0], out_path, pfx_path=cert_path,
                pfx_password=options.get("pfx_password", "123456"),
                signer_name=options.get("signer_name", "UltraPDF Signer"),
                reason=options.get("reason", "Document Approval"),
                signature_data_url=sig_data or None,
                page_num=int(options.get("page", 1)),
                x=float(options.get("x", 80)), y=float(options.get("y", 650)),
                width=float(options.get("width", 160)), height=float(options.get("height", 60)),
            )
        else:
            result_data = pdf_suite.sign_pdf_document(
                saved_inputs[0], out_path, signature_data_url=sig_data,
                page_num=int(options.get("page", 1)),
                x=float(options.get("x", 100)), y=float(options.get("y", 650)),
                width=float(options.get("width", 160)), height=float(options.get("height", 60)),
            )

    elif tool == "verify_signatures":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to inspect.")
        result_data = pdf_advanced.verify_pdf_signatures(saved_inputs[0])
        out_filename = f"{saved_inputs[0].stem}_Signature_Audit.json"
        out_path = job_dir / out_filename
        out_path.write_text(json.dumps(result_data, indent=2), encoding="utf-8")

    elif tool == "edit_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to edit.")
        out_filename = f"Edited_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.edit_pdf_annotations(saved_inputs[0], out_path, annotations=options.get("annotations", []))

    elif tool == "redact_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to redact.")
        out_filename = f"Redacted_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.redact_pdf_custom(
            saved_inputs[0], out_path,
            pii_types=options.get("pii_types", []),
            keywords=options.get("keywords", []),
            manual_boxes=options.get("manual_boxes", []),
        )

    elif tool == "ai_summarize":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to summarize.")
        result_data = pdf_suite.ai_summarize_document(
            saved_inputs[0], max_bullets=int(options.get("bullets", 6)), use_ollama=bool(options.get("use_ollama", False))
        )
        out_filename = f"{saved_inputs[0].stem}_Executive_Summary.md"
        out_path = job_dir / out_filename
        md_content = f"# Executive AI Summary: {result_data['document_title']}\n\n**Overview:**\n{result_data['overview']}\n\n### Key Takeaways:\n"
        for b in result_data.get("key_takeaways", []):
            md_content += f"- {b}\n"
        out_path.write_text(md_content, encoding="utf-8")

    elif tool == "chat_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        q = options.get("question", "Summarize the main points of this document.")
        result_data = pdf_advanced.chat_with_pdf_query(saved_inputs, q, use_ollama=bool(options.get("use_ollama", False)))
        out_filename = f"{saved_inputs[0].stem}_QA_Answer.md"
        out_path = job_dir / out_filename
        out_path.write_text(f"# Q: {q}\n\n{result_data.get('answer', '')}\n", encoding="utf-8")

    elif tool == "translate_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file to translate.")
        target_lang = options.get("language", "es")
        out_filename = f"Translated_{target_lang.upper()}_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_advanced.translate_pdf_document_real(
            saved_inputs[0], out_path, target_lang=target_lang,
            engine=options.get("engine", "auto"), bilingual=bool(options.get("bilingual", False)),
            progress_callback=progress_callback,
        )

    elif tool == "compare_pdf":
        if len(saved_inputs) < 2:
            raise HTTPException(status_code=400, detail="Please provide two PDF files to compare.")
        out_filename = f"Visual_Diff_{saved_inputs[0].stem}_vs_{saved_inputs[1].stem}.pdf"
        out_path = job_dir / out_filename
        result_data = pdf_suite.compare_two_pdfs(saved_inputs[0], saved_inputs[1], output_pdf_path=out_path)

    elif tool == "pdf_forms":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF form.")
        out_filename = f"Form_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_suite.inspect_and_fill_forms(
            saved_inputs[0],
            form_values=options.get("form_values", {}),
            output_path=out_path,
            new_fields=options.get("new_fields", []),
            flatten=bool(options.get("flatten", False)),
        )

    elif tool == "invoice_extractor":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide one or more invoice PDFs/images.")
        out_filename = "Extracted_Invoices.xlsx"
        out_path = job_dir / out_filename
        result_data = pdf_advanced.extract_invoices_batch(saved_inputs, out_path)

    elif tool == "impose_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        mode = options.get("mode", "2up")
        out_filename = f"Imposed_{mode}_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_advanced.impose_pdf_layout(saved_inputs[0], out_path, mode=mode, draw_borders=bool(options.get("borders", True)))

    elif tool == "header_footer_pdf":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"Stamped_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_advanced.add_header_footer_bates(
            saved_inputs[0], out_path,
            header_left=options.get("header_left", ""),
            header_center=options.get("header_center", ""),
            header_right=options.get("header_right", ""),
            footer_left=options.get("footer_left", ""),
            footer_center=options.get("footer_center", "Page {page} of {total}"),
            footer_right=options.get("footer_right", ""),
            bates_start=int(options.get("bates_start", 1)),
            font_size=int(options.get("font_size", 9)),
            color_hex=options.get("color", "#475569"),
        )

    elif tool == "bookmarks_editor":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"Bookmarked_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_advanced.save_bookmarks(
            saved_inputs[0], out_path,
            bookmarks=options.get("bookmarks", []),
            auto_detect=bool(options.get("auto_detect", False)),
        )

    elif tool == "metadata_sanitizer":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide a PDF file.")
        out_filename = f"Sanitized_{saved_inputs[0].name}"
        out_path = job_dir / out_filename
        result_data = pdf_advanced.update_and_sanitize_metadata(
            saved_inputs[0], out_path,
            metadata=options.get("metadata"),
            strip_all_metadata=bool(options.get("strip_all", False)),
            remove_links=bool(options.get("remove_links", False)),
            remove_attachments=bool(options.get("remove_attachments", True)),
            remove_annotations=bool(options.get("remove_annotations", False)),
        )

    elif tool == "workflow":
        if not saved_inputs:
            raise HTTPException(status_code=400, detail="Please provide files to run through the workflow.")
        steps = options.get("steps", [])
        if not steps:
            raise HTTPException(status_code=400, detail="No workflow steps defined.")
        result_data = pdf_suite.execute_workflow_pipeline(saved_inputs, steps, job_dir, progress_callback=progress_callback)
        out_filename = result_data.get("final_filename", "Workflow_Output.pdf")
        out_path = job_dir / out_filename

    else:
        raise HTTPException(status_code=400, detail=f"Unknown tool: '{tool}'")

    if out_path and out_path.is_file() and out_path.suffix.lower() == ".pdf":
        try:
            out_doc = pymupdf.open(str(out_path))
            if len(out_doc) > 0:
                pix = out_doc[0].get_pixmap(matrix=pymupdf.Matrix(0.45, 0.45))
                preview_b64 = "data:image/png;base64," + base64.b64encode(pix.tobytes("png")).decode("utf-8")
            out_doc.close()
        except Exception:
            pass

    download_url = f"/api/download-file/{job_id}/{out_filename}" if out_path and out_path.is_file() else None
    out_bytes = out_path.stat().st_size if out_path and out_path.is_file() else 0

    payload = {
        "success": True,
        "tool": tool,
        "job_id": job_id,
        "filename": out_filename,
        "download_url": download_url,
        "output_size": out_bytes,
        "output_size_str": format_size(out_bytes),
        "preview": preview_b64,
        "stats": result_data,
    }
    _record_history(payload)
    return payload


async def _prepare_tool_inputs(
    files: List[UploadFile],
    file_paths_json: str,
    cert_file: Optional[UploadFile],
    job_dir: Path,
) -> tuple[List[Path], Optional[Path]]:
    inputs_dir = job_dir / "inputs"
    inputs_dir.mkdir(parents=True, exist_ok=True)
    saved_inputs: List[Path] = []
    for upload in files:
        if upload.filename:
            saved_inputs.append(await _save_single_upload(upload, inputs_dir))
    if not saved_inputs and file_paths_json:
        try:
            parsed_paths = json.loads(file_paths_json)
        except Exception:
            parsed_paths = []
        if parsed_paths:
            _require_local_mode()
            for lp in parsed_paths:
                p = Path(lp)
                if p.is_file():
                    saved_inputs.append(p)
    cert_path = None
    if cert_file and cert_file.filename:
        cert_path = await _save_single_upload(cert_file, inputs_dir)
    return saved_inputs, cert_path


@app.post("/api/tool/execute")
async def execute_tool(
    tool: str = Form(...),
    options_json: str = Form("{}"),
    files: List[UploadFile] = File(default=[]),
    file_paths_json: str = Form("[]"),
    url_or_html: str = Form(""),
    cert_file: Optional[UploadFile] = File(None),
):
    """Universal executor for all 39+ PDF tools."""
    try:
        options = json.loads(options_json) if options_json else {}
    except Exception:
        options = {}

    job_id = str(uuid.uuid4())
    job_dir = TEMP_OUTPUTS_DIR / job_id
    saved_inputs, cert_path = await _prepare_tool_inputs(files, file_paths_json, cert_file, job_dir)

    try:
        return await asyncio.to_thread(_run_tool_sync, tool, options, saved_inputs, url_or_html, job_id, job_dir, cert_path=cert_path)
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/tool/execute-async")
async def execute_tool_async(
    tool: str = Form(...),
    options_json: str = Form("{}"),
    files: List[UploadFile] = File(default=[]),
    file_paths_json: str = Form("[]"),
    url_or_html: str = Form(""),
    cert_file: Optional[UploadFile] = File(None),
):
    """Run heavy tools in a background thread with real-time SSE progress via /api/progress/{job_id}."""
    try:
        options = json.loads(options_json) if options_json else {}
    except Exception:
        options = {}

    job_id = str(uuid.uuid4())
    job_dir = TEMP_OUTPUTS_DIR / job_id
    saved_inputs, cert_path = await _prepare_tool_inputs(files, file_paths_json, cert_file, job_dir)

    jobs[job_id] = {
        "id": job_id,
        "status": "processing",
        "stage": "starting",
        "pct": 5,
        "message": f"Starting {tool}...",
        "tool_result": None,
        "error": None,
    }

    def worker():
        def cb(stage, current, total, pct, msg):
            if job_id in jobs:
                jobs[job_id].update({"stage": stage, "pct": pct, "message": msg})
        try:
            res = _run_tool_sync(tool, options, saved_inputs, url_or_html, job_id, job_dir, cert_path=cert_path, progress_callback=cb)
            jobs[job_id].update({"status": "completed", "pct": 100, "message": "Completed!", "tool_result": res})
        except Exception as exc:
            jobs[job_id].update({"status": "failed", "message": str(exc), "error": str(exc)})

    threading.Thread(target=worker, daemon=True).start()
    return {"success": True, "job_id": job_id}


@app.get("/api/download-file/{job_id}/{filename}")
async def download_generic_file(job_id: str, filename: str):
    """Download any output file by job_id and filename."""
    target_file = _safe_temp_path(job_id, filename)
    if not target_file.is_file():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found.")

    ext = target_file.suffix.lower()
    media_map = {
        ".pdf": "application/pdf",
        ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".zip": "application/zip",
        ".md": "text/markdown; charset=utf-8",
        ".json": "application/json",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".csv": "text/csv",
        ".txt": "text/plain",
        ".pfx": "application/x-pkcs12"
    }
    media_type = media_map.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(target_file),
        filename=filename,
        media_type=media_type
    )


@app.get("/api/demo/sample/{sample_kind}")
async def get_demo_sample_pdf(sample_kind: str):
    """Generate rich in-memory sample PDFs so users can test any tool in one click."""
    import io
    from PIL import ImageDraw

    doc = pymupdf.open()
    filename = f"Sample_{sample_kind}.pdf"

    if sample_kind == "scanned_invoice":
        im = Image.new("RGB", (920, 520), "white")
        d = ImageDraw.Draw(im)
        lines = [
            "NORTHSTAR CLOUD SYSTEMS INC.",
            "TAX INVOICE # INV-2026-4108",
            "Date: 11/12/2026",
            "Billed To: UltraPDF Enterprise Workspace",
            "Item 1: Enterprise PDF OCR License ..... $1,200.00",
            "Item 2: PKI Signing Hardware Module .... $450.00",
            "Tax (10%): $165.00",
            "Total Amount: $1,815.00",
            "Contact: billing@northstar.example",
        ]
        y = 40
        for ln in lines:
            d.text((40, y), ln, fill="black")
            y += 46
        buf = io.BytesIO()
        im.save(buf, format="PNG")
        p = doc.new_page(width=595, height=420)
        p.insert_image(p.rect, stream=buf.getvalue())
        filename = "Sample_Scanned_Invoice.pdf"

    elif sample_kind in ("compare_v1", "compare_v2"):
        p = doc.new_page(width=595, height=842)
        p.insert_text((48, 60), "SERVICE LEVEL AGREEMENT — VERSION " + ("1.0" if sample_kind == "compare_v1" else "2.0"), fontsize=16, color=(0.1, 0.25, 0.6))
        p.insert_text((48, 105), "Effective Date: January 15, 2026", fontsize=11)
        if sample_kind == "compare_v1":
            p.insert_text((48, 135), "1. Uptime Guarantee: 99.5% monthly availability.", fontsize=11)
            p.insert_text((48, 165), "2. Support Window: Monday to Friday, 9 AM - 5 PM.", fontsize=11)
            p.insert_text((48, 195), "3. Monthly Retainer Fee: $2,500.00 USD.", fontsize=11)
        else:
            p.insert_text((48, 135), "1. Uptime Guarantee: 99.95% monthly availability with SLA credits.", fontsize=11)
            p.insert_text((48, 165), "2. Support Window: 24/7 Priority Incident Response.", fontsize=11)
            p.insert_text((48, 195), "3. Monthly Retainer Fee: $3,200.00 USD.", fontsize=11)
            p.draw_rect(pymupdf.Rect(48, 230, 540, 270), color=(0.1, 0.6, 0.3), width=1.5)
            p.insert_text((58, 255), "ADDED CLAUSE: Includes AES-256 Zero-Knowledge Local Archival.", fontsize=11, color=(0.1, 0.5, 0.25))
        filename = f"Contract_{'v1' if sample_kind == 'compare_v1' else 'v2'}.pdf"

    elif sample_kind == "form":
        p = doc.new_page(width=595, height=842)
        p.insert_text((48, 60), "PROJECT INTAKE & APPROVAL FORM", fontsize=17, color=(0.12, 0.28, 0.62))
        labels = [("Full Name:", "full_name", 110, "text", "Santhosh K."), ("Department:", "department", 155, "text", "Engineering"), ("Email Address:", "email", 200, "text", "team@ultrapdf.local")]
        for lbl, fname, y, ftype, default in labels:
            p.insert_text((48, y + 16), lbl, fontsize=11)
            w = pymupdf.Widget()
            w.field_name = fname
            w.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
            w.field_value = default
            w.rect = pymupdf.Rect(170, y, 480, y + 24)
            w.border_color = (0.3, 0.4, 0.75)
            w.border_width = 1
            p.add_widget(w)
        p.insert_text((48, 265), "Approved for Release:", fontsize=11)
        chk = pymupdf.Widget()
        chk.field_name = "approved_check"
        chk.field_type = pymupdf.PDF_WIDGET_TYPE_CHECKBOX
        chk.field_value = True
        chk.rect = pymupdf.Rect(175, 250, 195, 270)
        p.add_widget(chk)
        filename = "Sample_Fillable_Form.pdf"

    else:
        p1 = doc.new_page(width=595, height=842)
        p1.draw_rect(pymupdf.Rect(0, 0, 595, 95), fill=(0.06, 0.1, 0.2))
        p1.insert_text((44, 54), "QUARTERLY OPERATIONS & SECURITY REPORT 2026", fontsize=16, color=(1, 1, 1))
        p1.insert_text((44, 78), "Prepared for UltraPDF Studio Pro Interactive Demo", fontsize=10, color=(0.6, 0.8, 1.0))
        body_p1 = [
            "1. Executive Overview",
            "In Q3 2026, local document processing reduced cloud egress costs by 94% across 12,400 files.",
            "Total infrastructure savings reached $18,450.00 by October 15, 2026.",
            "Primary technical contact: ops-lead@enterprise.example | Phone: +1-415-555-0192",
            "Test Sensitive Token (for PII Redaction): SSN 123-45-6789 | Card 4111-2222-3333-4444",
            "",
            "2. Key Milestones & Deliverables",
            "- Deployed RapidOCR ONNX for offline searchable PDF generation across scanned archives.",
            "- Standardized PKCS#7 / PAdES certificate signing and AES-256 document protection.",
            "- Migrated batch archiving to ISO 19005-2 PDF/A-2b compliance.",
        ]
        y = 135
        for ln in body_p1:
            fs = 13 if ln.startswith(("1.", "2.")) else 10.5
            col = (0.12, 0.28, 0.65) if ln.startswith(("1.", "2.")) else (0.15, 0.18, 0.25)
            p1.insert_text((44, y), ln, fontsize=fs, color=col)
            y += 22

        # Draw a clean table on page 1
        p1.draw_rect(pymupdf.Rect(44, 385, 550, 412), fill=(0.15, 0.28, 0.58))
        p1.insert_text((56, 403), "Department           Documents       Savings ($)      Compliance", fontsize=10, color=(1, 1, 1))
        rows = [
            ("Legal & Risk", "4,200", "$6,800.00", "PDF/A-2b"),
            ("Finance & AP", "5,100", "$7,450.00", "OCR + XLSX"),
            ("Engineering", "3,100", "$4,200.00", "AES-256"),
        ]
        ty = 412
        for dept, cnt, sav, comp in rows:
            p1.draw_rect(pymupdf.Rect(44, ty, 550, ty + 24), color=(0.8, 0.84, 0.9))
            p1.insert_text((56, ty + 16), f"{dept:<20} {cnt:<15} {sav:<16} {comp}", fontsize=9.5)
            ty += 24

        p2 = doc.new_page(width=595, height=842)
        p2.insert_text((44, 65), "3. Risk Assessment & Q4 Roadmap", fontsize=14, color=(0.12, 0.28, 0.65))
        p2.insert_text((44, 100), "All confidential attachments and embedded JavaScript links must be sanitized before external sharing.", fontsize=10.5)
        p2.insert_text((44, 130), "Recommended Q4 Workflow: Merge -> OCR -> Redact PII -> Watermark -> Compress -> Protect.", fontsize=10.5)
        filename = "Sample_UltraPDF_Report.pdf"

    pdf_bytes = doc.tobytes()
    doc.close()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)
