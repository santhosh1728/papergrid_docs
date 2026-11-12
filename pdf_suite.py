"""
UltraPDF Studio Pro - Comprehensive Multi-Tool Engine (pdf_suite.py)
====================================================================
Implements all 30+ PDF tools inspired by iLovePDF:
- Organize: Merge, Split, Organize (reorder/delete/rotate), Scan to PDF
- Optimize: Compress, Repair, OCR Searchable PDF
- Convert: PDF to Word, PowerPoint, Excel, Images (JPG), PDF/A, Markdown
           Word to PDF, PowerPoint to PDF, Excel to PDF, JPG to PDF, HTML to PDF
- Edit: Edit PDF (annotations), Rotate, Page Numbers, Crop, Watermark
- Security: Unlock, Protect, Sign, Redact
- Intelligence: AI Summarizer, Translate PDF, Compare PDF, PDF Forms
- Workflows: Multi-tool automated sequential pipeline executor
"""

import os
import sys
import re
import io
import math
import json
import base64
import zipfile
import tempfile
import urllib.parse
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

import pymupdf  # PyMuPDF
from PIL import Image, ImageOps, ImageEnhance

# Office conversion libraries
try:
    import docx
    from docx.shared import Inches, Pt, RGBColor
except ImportError:
    docx = None

try:
    import pptx
    from pptx.util import Inches as PptxInches, Pt as PptxPt
except ImportError:
    pptx = None

try:
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
except ImportError:
    openpyxl = None

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    requests = None
    BeautifulSoup = None


def format_size(num_bytes: int) -> str:
    """Format bytes into readable string."""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if num_bytes < 1024.0 or unit == 'GB':
            return f"{num_bytes:.2f} {unit}"
        num_bytes /= 1024.0
    return f"{num_bytes:.2f} GB"


# ==============================================================================
# 1. ORGANIZE PDF
# ==============================================================================

def merge_pdfs_simple(file_paths: List[Path], output_path: Path, add_bookmarks: bool = True) -> Dict[str, Any]:
    """Merge multiple PDF files into one."""
    out_doc = pymupdf.open()
    toc = []
    current_page = 0
    total_input_size = 0

    for path in file_paths:
        total_input_size += path.stat().st_size
        doc = pymupdf.open(str(path))
        num_pages = len(doc)
        if num_pages > 0:
            if add_bookmarks:
                toc.append([1, path.stem, current_page + 1])
            out_doc.insert_pdf(doc)
            current_page += num_pages
        doc.close()

    if add_bookmarks and toc:
        out_doc.set_toc(toc)

    out_doc.save(str(output_path), garbage=4, deflate=True)
    out_doc.close()

    final_size = output_path.stat().st_size
    return {
        "success": True,
        "pages": current_page,
        "input_files": len(file_paths),
        "input_size": total_input_size,
        "output_size": final_size,
        "output_size_str": format_size(final_size)
    }


def split_pdf_advanced(
    input_path: Path,
    output_dir: Path,
    mode: str = "ranges",  # "ranges", "extract_all", "fixed_parts"
    ranges_str: str = "",  # e.g. "1-3, 5, 7-10"
    num_parts: int = 2
) -> Dict[str, Any]:
    """Split PDF by custom page ranges, extract each page, or divide into N equal parts."""
    doc = pymupdf.open(str(input_path))
    total_pages = len(doc)
    created_files = []

    if mode == "extract_all":
        for i in range(total_pages):
            out_doc = pymupdf.open()
            out_doc.insert_pdf(doc, from_page=i, to_page=i)
            part_name = f"{input_path.stem}_page_{i+1}.pdf"
            part_path = output_dir / part_name
            out_doc.save(str(part_path), deflate=True)
            out_doc.close()
            created_files.append({"name": part_name, "size": part_path.stat().st_size, "pages": 1})

    elif mode == "fixed_parts":
        parts = max(2, min(num_parts, total_pages))
        pages_per_part = math.ceil(total_pages / parts)
        for p in range(parts):
            start = p * pages_per_part
            end = min(total_pages - 1, (p + 1) * pages_per_part - 1)
            if start > end:
                break
            out_doc = pymupdf.open()
            out_doc.insert_pdf(doc, from_page=start, to_page=end)
            part_name = f"{input_path.stem}_part_{p+1}.pdf"
            part_path = output_dir / part_name
            out_doc.save(str(part_path), deflate=True)
            out_doc.close()
            created_files.append({"name": part_name, "size": part_path.stat().st_size, "pages": end - start + 1})

    else:
        # Custom ranges: e.g. "1-3, 5, 7-10" or "1, 2, 3"
        raw_parts = [r.strip() for r in ranges_str.split(",") if r.strip()]
        if not raw_parts:
            raw_parts = [f"1-{total_pages}"]

        for idx, part in enumerate(raw_parts):
            out_doc = pymupdf.open()
            if "-" in part:
                tokens = part.split("-")
                try:
                    p_start = max(1, int(tokens[0].strip()))
                    p_end = min(total_pages, int(tokens[1].strip()))
                except ValueError:
                    continue
                if p_start <= p_end:
                    out_doc.insert_pdf(doc, from_page=p_start - 1, to_page=p_end - 1)
            else:
                try:
                    p_num = int(part)
                    if 1 <= p_num <= total_pages:
                        out_doc.insert_pdf(doc, from_page=p_num - 1, to_page=p_num - 1)
                except ValueError:
                    continue

            if len(out_doc) > 0:
                part_name = f"{input_path.stem}_range_{part.replace(' ', '')}.pdf"
                part_path = output_dir / part_name
                out_doc.save(str(part_path), deflate=True)
                created_files.append({"name": part_name, "size": part_path.stat().st_size, "pages": len(out_doc)})
            out_doc.close()

    doc.close()

    # Package into ZIP for 1-click download if multiple parts
    zip_name = f"{input_path.stem}_split_bundle.zip"
    zip_path = output_dir / zip_name
    with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
        for f in created_files:
            file_disk = output_dir / f["name"]
            zf.write(str(file_disk), arcname=f["name"])

    return {
        "success": True,
        "files": created_files,
        "zip_file": zip_name,
        "zip_size": zip_path.stat().st_size,
        "total_parts": len(created_files)
    }


def organize_pdf_pages(
    input_path: Path,
    output_path: Path,
    page_order: List[int],  # 0-indexed list of page indices to keep in order
    page_rotations: Optional[Dict[str, int]] = None  # str(idx): degrees (0, 90, 180, 270)
) -> Dict[str, Any]:
    """Reorder, rotate, or delete pages from a PDF."""
    doc = pymupdf.open(str(input_path))
    total_pages = len(doc)
    page_rotations = page_rotations or {}

    out_doc = pymupdf.open()
    for new_idx, orig_idx in enumerate(page_order):
        if 0 <= orig_idx < total_pages:
            out_doc.insert_pdf(doc, from_page=orig_idx, to_page=orig_idx)
            rot = page_rotations.get(str(orig_idx), 0)
            if rot:
                page = out_doc[new_idx]
                page.set_rotation((page.rotation + rot) % 360)

    out_doc.save(str(output_path), garbage=4, deflate=True)
    out_doc.close()
    doc.close()

    return {
        "success": True,
        "original_pages": total_pages,
        "new_pages": len(page_order),
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def scan_images_to_pdf(
    image_paths: List[Path],
    output_path: Path,
    enhance_mode: str = "document"  # "document" (contrast/sharpen), "grayscale", "color"
) -> Dict[str, Any]:
    """Compile scanned camera captures or uploaded photos into a clean PDF."""
    out_doc = pymupdf.open()

    for img_p in image_paths:
        im = Image.open(str(img_p))
        if enhance_mode == "grayscale":
            im = ImageOps.grayscale(im)
        elif enhance_mode == "document":
            # Auto-contrast & sharpen for document legibility
            im = ImageOps.autocontrast(im)
            enhancer = ImageEnhance.Sharpness(im)
            im = enhancer.enhance(1.4)

        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=88, optimize=True)
        img_bytes = buf.getvalue()

        img_doc = pymupdf.open(stream=img_bytes, filetype="jpeg")
        pdf_bytes = img_doc.convert_to_pdf()
        img_doc.close()

        page_doc = pymupdf.open("pdf", pdf_bytes)
        out_doc.insert_pdf(page_doc)
        page_doc.close()

    out_doc.save(str(output_path), garbage=4, deflate=True)
    out_doc.close()

    return {
        "success": True,
        "pages": len(image_paths),
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


# ==============================================================================
# 2. OPTIMIZE PDF
# ==============================================================================

def repair_pdf_file(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """Repair damaged or corrupt PDF by rebuilding xref, trailers and stream objects."""
    doc = pymupdf.open(str(input_path))
    num_pages = len(doc)
    # PyMuPDF automatically repairs syntax errors during opening.
    # Saving with garbage=4, deflate=True, clean=True, linear=True reconstructs cross-reference tables.
    out_doc = pymupdf.open()
    out_doc.insert_pdf(doc)
    doc.close()

    out_doc.save(
        str(output_path),
        garbage=4,
        deflate=True,
        clean=True
    )
    out_doc.close()

    return {
        "success": True,
        "pages_recovered": num_pages,
        "original_size": input_path.stat().st_size,
        "repaired_size": output_path.stat().st_size,
        "repaired_size_str": format_size(output_path.stat().st_size)
    }


def ocr_pdf_document(input_path: Path, output_path: Path, lang: str = "eng", force_ocr: bool = False) -> Dict[str, Any]:
    """Process scanned or image PDF into searchable text-indexed document using RapidOCR."""
    from pdf_advanced import ocr_pdf_document_real
    return ocr_pdf_document_real(input_path, output_path, lang=lang, force_ocr=force_ocr)


# ==============================================================================
# 3. CONVERT PDF (PDF to X and X to PDF)
# ==============================================================================

def _pdf_to_word_basic(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """Fallback PyMuPDF block/table extractor to Word (.docx)."""
    if not docx:
        raise RuntimeError("python-docx is not installed.")

    word_doc = docx.Document()
    pdf_doc = pymupdf.open(str(input_path))
    total_pages = len(pdf_doc)
    paragraphs_added = 0
    tables_added = 0

    for page_idx in range(total_pages):
        page = pdf_doc[page_idx]

        # Try extracting tables first
        tabs = page.find_tables()
        table_bboxes = []
        if tabs.tables:
            for t in tabs.tables:
                table_bboxes.append(t.bbox)
                extracted_table = t.extract()
                if extracted_table and len(extracted_table) > 0:
                    rows = len(extracted_table)
                    cols = max(len(r) for r in extracted_table)
                    table_elem = word_doc.add_table(rows=rows, cols=cols)
                    table_elem.style = 'Table Grid'
                    for r_idx, row in enumerate(extracted_table):
                        for c_idx, val in enumerate(row):
                            if c_idx < cols:
                                table_elem.cell(r_idx, c_idx).text = str(val or "")
                    tables_added += 1
                    word_doc.add_paragraph()

        # Extract text blocks
        blocks = page.get_text("blocks")
        for b in blocks:
            if b[6] == 0:
                rect = pymupdf.Rect(b[:4])
                if any(rect.intersects(pymupdf.Rect(tb)) for tb in table_bboxes):
                    continue
                text = b[4].strip()
                if text:
                    if len(text) < 60 and (text.isupper() or not text.endswith(".")):
                        word_doc.add_heading(text, level=2)
                    else:
                        word_doc.add_paragraph(text)
                    paragraphs_added += 1

        if page_idx < total_pages - 1:
            word_doc.add_page_break()

    pdf_doc.close()
    word_doc.save(str(output_path))

    return {
        "success": True,
        "engine": "PyMuPDF Block Extractor",
        "pages_processed": total_pages,
        "paragraphs_created": paragraphs_added,
        "tables_created": tables_added,
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def pdf_to_word(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """Convert PDF layout, tables, and images to editable Word (.docx)."""
    try:
        from pdf2docx import Converter
        cv = Converter(str(input_path))
        cv.convert(str(output_path))
        cv.close()
        doc = pymupdf.open(str(input_path))
        pages = len(doc)
        doc.close()
        return {
            "success": True,
            "engine": "pdf2docx Layout Converter",
            "pages_processed": pages,
            "output_size": output_path.stat().st_size,
            "output_size_str": format_size(output_path.stat().st_size),
        }
    except Exception:
        return _pdf_to_word_basic(input_path, output_path)


def pdf_to_excel(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """Extract tabular data and grids from PDF to Excel spreadsheet (.xlsx)."""
    if not openpyxl:
        raise RuntimeError("openpyxl is not installed.")

    wb = openpyxl.Workbook()
    # Remove default sheet
    wb.remove(wb.active)

    pdf_doc = pymupdf.open(str(input_path))
    total_pages = len(pdf_doc)
    tables_found = 0

    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="2B579A", end_color="2B579A", fill_type="solid")
    border_thin = Border(
        left=Side(style='thin', color='D0D7DE'),
        right=Side(style='thin', color='D0D7DE'),
        top=Side(style='thin', color='D0D7DE'),
        bottom=Side(style='thin', color='D0D7DE')
    )

    for page_idx in range(total_pages):
        page = pdf_doc[page_idx]
        tabs = page.find_tables()
        ws = wb.create_sheet(title=f"Page {page_idx + 1}")

        current_row = 1
        if tabs.tables:
            for t_idx, t in enumerate(tabs.tables):
                extracted = t.extract()
                if extracted:
                    tables_found += 1
                    for r_idx, row in enumerate(extracted):
                        for c_idx, val in enumerate(row):
                            cell = ws.cell(row=current_row + r_idx, column=c_idx + 1, value=str(val or ""))
                            cell.border = border_thin
                            if r_idx == 0:
                                cell.font = header_font
                                cell.fill = header_fill
                        ws.row_dimensions[current_row + r_idx].height = 20
                    current_row += len(extracted) + 2
        else:
            # Fallback: parse lines with tab or multi-space delimiters
            lines = page.get_text().split("\n")
            for line in lines:
                if line.strip():
                    cols = [c.strip() for c in re.split(r'\s{2,}|\t', line) if c.strip()]
                    for c_idx, val in enumerate(cols):
                        ws.cell(row=current_row, column=c_idx + 1, value=val)
                    current_row += 1

    pdf_doc.close()
    if len(wb.sheetnames) == 0:
        wb.create_sheet(title="Data")

    wb.save(str(output_path))

    return {
        "success": True,
        "pages_processed": total_pages,
        "tables_extracted": tables_found,
        "sheets_created": len(wb.sheetnames),
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def pdf_to_powerpoint(input_path: Path, output_path: Path, editable: bool = True) -> Dict[str, Any]:
    """Convert PDF pages into editable or image-based PowerPoint presentation (.pptx)."""
    from pdf_advanced import pdf_to_powerpoint_rich
    return pdf_to_powerpoint_rich(input_path, output_path, editable=editable)


def word_to_pdf(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """Convert Word (.docx) document to styled multi-page PDF."""
    from pdf_advanced import word_to_pdf_rich
    return word_to_pdf_rich(input_path, output_path)


def excel_to_pdf(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """Convert Excel spreadsheet (.xlsx) to formatted multi-page PDF."""
    from pdf_advanced import excel_to_pdf_rich
    return excel_to_pdf_rich(input_path, output_path)


def powerpoint_to_pdf(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """Convert PowerPoint slides (.pptx) to PDF preserving slide geometry and images."""
    from pdf_advanced import powerpoint_to_pdf_rich
    return powerpoint_to_pdf_rich(input_path, output_path)


def pdf_to_images_advanced(input_path: Path, output_dir: Path, img_format: str = "jpg", dpi: int = 150) -> Dict[str, Any]:
    """Convert each PDF page to image or package as ZIP."""
    doc = pymupdf.open(str(input_path))
    total_pages = len(doc)
    img_files = []
    scale = dpi / 72.0

    for i in range(total_pages):
        page = doc[i]
        pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale))
        filename = f"{input_path.stem}_page_{i+1}.{img_format.lower()}"
        out_file = output_dir / filename
        pix.save(str(out_file))
        img_files.append({"name": filename, "size": out_file.stat().st_size, "page": i + 1})

    doc.close()

    zip_name = f"{input_path.stem}_images.zip"
    zip_path = output_dir / zip_name
    with zipfile.ZipFile(str(zip_path), "w", zipfile.ZIP_DEFLATED) as zf:
        for f in img_files:
            zf.write(str(output_dir / f["name"]), arcname=f["name"])

    return {
        "success": True,
        "total_images": len(img_files),
        "images": img_files,
        "zip_file": zip_name,
        "zip_size": zip_path.stat().st_size,
        "zip_size_str": format_size(zip_path.stat().st_size)
    }


def images_to_pdf_advanced(
    image_paths: List[Path],
    output_path: Path,
    orientation: str = "portrait",  # "portrait", "landscape", "fit"
    margin_pt: int = 20
) -> Dict[str, Any]:
    """Convert images (JPG, PNG, WEBP) to PDF with configurable layout and margins."""
    out_doc = pymupdf.open()

    for p in image_paths:
        im = Image.open(str(p))
        w, h = im.size

        if orientation == "portrait":
            page_w, page_h = 595, 842
        elif orientation == "landscape":
            page_w, page_h = 842, 595
        else:
            # Fit natural aspect ratio
            page_w = w + (margin_pt * 2)
            page_h = h + (margin_pt * 2)

        page = out_doc.new_page(width=page_w, height=page_h)

        # Scale image to fit within margins
        avail_w = page_w - (margin_pt * 2)
        avail_h = page_h - (margin_pt * 2)
        scale = min(avail_w / w, avail_h / h)
        dest_w = w * scale
        dest_h = h * scale
        dest_x = (page_w - dest_w) / 2
        dest_y = (page_h - dest_h) / 2

        img_rect = pymupdf.Rect(dest_x, dest_y, dest_x + dest_w, dest_y + dest_h)

        buf = io.BytesIO()
        im.convert("RGB").save(buf, format="JPEG", quality=92)
        page.insert_image(img_rect, stream=buf.getvalue())

    out_doc.save(str(output_path), garbage=4, deflate=True)
    pages = len(out_doc)
    out_doc.close()

    return {
        "success": True,
        "pages_created": pages,
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def html_to_pdf(url_or_html: str, output_path: Path) -> Dict[str, Any]:
    """Convert webpage URL or raw HTML code to rich styled PDF document."""
    from pdf_advanced import html_to_pdf_rich
    return html_to_pdf_rich(url_or_html, output_path)


def pdf_to_pdfa(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """Convert PDF to ISO 19005-2 PDF/A-2b archival standard with XMP + sRGB OutputIntent."""
    from pdf_advanced import pdf_to_pdfa_real
    return pdf_to_pdfa_real(input_path, output_path)


def pdf_to_markdown(input_path: Path, output_path: Path) -> Dict[str, Any]:
    """Convert PDF into clean structured Markdown for LLMs, notes, and documentation."""
    doc = pymupdf.open(str(input_path))
    md_lines = []
    md_lines.append(f"# {input_path.stem}\n")

    for p_idx, page in enumerate(doc):
        md_lines.append(f"\n---\n*Page {p_idx + 1}*\n")

        # Try extracting tables first
        tabs = page.find_tables()
        table_bboxes = []
        if tabs.tables:
            for t in tabs.tables:
                table_bboxes.append(t.bbox)
                extracted = t.extract()
                if extracted and len(extracted) > 0:
                    headers = extracted[0]
                    md_lines.append("\n| " + " | ".join(str(h or "") for h in headers) + " |")
                    md_lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
                    for row in extracted[1:]:
                        md_lines.append("| " + " | ".join(str(c or "") for c in row) + " |")
                    md_lines.append("\n")

        blocks = page.get_text("blocks")
        for b in blocks:
            if b[6] == 0:  # text
                rect = pymupdf.Rect(b[:4])
                if any(rect.intersects(pymupdf.Rect(tb)) for tb in table_bboxes):
                    continue

                text = b[4].strip()
                if not text:
                    continue

                # Heuristics for headings
                if len(text) < 50 and (text.isupper() or not text.endswith(".")):
                    md_lines.append(f"\n### {text}\n")
                elif text.startswith("•") or text.startswith("- ") or text.startswith("* "):
                    md_lines.append(f"{text}")
                else:
                    md_lines.append(f"{text}\n")

    doc.close()

    full_md = "\n".join(md_lines)
    output_path.write_text(full_md, encoding="utf-8")

    return {
        "success": True,
        "markdown_length": len(full_md),
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size),
        "preview_snippet": full_md[:500]
    }


# ==============================================================================
# 4. EDIT PDF & PAGE SURGERY
# ==============================================================================

def rotate_pdf_pages_advanced(
    input_path: Path,
    output_path: Path,
    angle: int = 90,  # 90, 180, 270
    pages_selection: str = "all"  # "all", "odd", "even", or specific e.g. "1, 3, 5"
) -> Dict[str, Any]:
    """Rotate PDF pages by specified angle."""
    doc = pymupdf.open(str(input_path))
    total_pages = len(doc)
    rotated_count = 0

    target_pages = set()
    if pages_selection == "all":
        target_pages = set(range(total_pages))
    elif pages_selection == "odd":
        target_pages = {i for i in range(total_pages) if i % 2 == 0}
    elif pages_selection == "even":
        target_pages = {i for i in range(total_pages) if i % 2 != 0}
    else:
        for p in pages_selection.split(","):
            try:
                num = int(p.strip()) - 1
                if 0 <= num < total_pages:
                    target_pages.add(num)
            except ValueError:
                pass

    for i in target_pages:
        page = doc[i]
        page.set_rotation((page.rotation + angle) % 360)
        rotated_count += 1

    doc.save(str(output_path), garbage=4, deflate=True)
    doc.close()

    return {
        "success": True,
        "rotated_pages": rotated_count,
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def add_page_numbers_advanced(
    input_path: Path,
    output_path: Path,
    position: str = "bottom-center",  # "bottom-center", "bottom-right", "bottom-left", "top-right"
    format_template: str = "Page {page} of {total}",  # or "{page}", "Bates: {page:04d}"
    font_size: int = 10,
    margin_offset: int = 30
) -> Dict[str, Any]:
    """Add customized Bates or standard page numbering."""
    doc = pymupdf.open(str(input_path))
    total = len(doc)

    for idx in range(total):
        page = doc[idx]
        current_page = idx + 1
        text = format_template.format(page=current_page, total=total)

        rect = page.rect
        text_width = len(text) * font_size * 0.55

        if position == "bottom-center":
            pt = pymupdf.Point((rect.width - text_width) / 2, rect.height - margin_offset)
        elif position == "bottom-right":
            pt = pymupdf.Point(rect.width - text_width - margin_offset, rect.height - margin_offset)
        elif position == "bottom-left":
            pt = pymupdf.Point(margin_offset, rect.height - margin_offset)
        elif position == "top-right":
            pt = pymupdf.Point(rect.width - text_width - margin_offset, margin_offset)
        else:
            pt = pymupdf.Point((rect.width - text_width) / 2, rect.height - margin_offset)

        page.insert_text(pt, text, fontsize=font_size, fontname="helv", color=(0.3, 0.3, 0.3))

    doc.save(str(output_path), garbage=4, deflate=True)
    doc.close()

    return {
        "success": True,
        "pages_numbered": total,
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def crop_pdf_advanced(
    input_path: Path,
    output_path: Path,
    margin_pct: float = 5.0,  # Trim % from all borders
    custom_box: Optional[Dict[str, float]] = None
) -> Dict[str, Any]:
    """Crop margins or specific bounding rectangle across document pages."""
    doc = pymupdf.open(str(input_path))
    total_pages = len(doc)

    for page in doc:
        rect = page.rect
        if custom_box:
            # Custom percentages
            crop_rect = pymupdf.Rect(
                rect.width * custom_box.get("left", 0.05),
                rect.height * custom_box.get("top", 0.05),
                rect.width * (1.0 - custom_box.get("right", 0.05)),
                rect.height * (1.0 - custom_box.get("bottom", 0.05))
            )
        else:
            pct = margin_pct / 100.0
            dx = rect.width * pct
            dy = rect.height * pct
            crop_rect = pymupdf.Rect(dx, dy, rect.width - dx, rect.height - dy)

        page.set_cropbox(crop_rect)

    doc.save(str(output_path), garbage=4, deflate=True)
    doc.close()

    return {
        "success": True,
        "pages_cropped": total_pages,
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def watermark_pdf_advanced(
    input_path: Path,
    output_path: Path,
    text: str = "CONFIDENTIAL",
    opacity: float = 0.35,
    angle: int = 45,
    font_size: int = 48,
    color_rgb: Tuple[float, float, float] = (0.75, 0.15, 0.15),
    image_watermark_path: Optional[Path] = None
) -> Dict[str, Any]:
    """Stamp customizable text or image watermark over PDF pages."""
    doc = pymupdf.open(str(input_path))
    total_pages = len(doc)

    for page in doc:
        rect = page.rect
        if image_watermark_path and image_watermark_path.is_file():
            # Image watermark
            im_w = rect.width * 0.4
            im_h = rect.height * 0.3
            im_rect = pymupdf.Rect(
                (rect.width - im_w) / 2,
                (rect.height - im_h) / 2,
                (rect.width + im_w) / 2,
                (rect.height + im_h) / 2
            )
            page.insert_image(im_rect, filename=str(image_watermark_path), overlay=True)
        else:
            # Text watermark
            text_str = text.strip()
            if text_str:
                # Insert angled text watermark
                p = pymupdf.Point(rect.width / 4, rect.height / 2)
                page.insert_text(
                    p,
                    text_str,
                    fontsize=font_size,
                    fontname="helv",
                    color=color_rgb,
                    morph=(p, pymupdf.Matrix(angle)),
                    fill_opacity=opacity
                )

    doc.save(str(output_path), garbage=4, deflate=True)
    doc.close()

    return {
        "success": True,
        "pages_watermarked": total_pages,
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def edit_pdf_annotations(
    input_path: Path,
    output_path: Path,
    annotations: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Apply rich interactive annotations (text, ink, highlight, shapes, notes, whiteout)."""
    from pdf_advanced import edit_pdf_annotations_rich
    return edit_pdf_annotations_rich(input_path, output_path, annotations)


# ==============================================================================
# 5. PDF SECURITY
# ==============================================================================

def unlock_pdf_document(input_path: Path, output_path: Path, password: str = "") -> Dict[str, Any]:
    """Remove encryption and restrictions from password-protected PDF."""
    doc = pymupdf.open(str(input_path))

    if doc.is_encrypted:
        auth_success = doc.authenticate(password)
        if not auth_success:
            doc.close()
            raise ValueError("Incorrect password. Unable to unlock PDF.")

    # Save without encryption
    doc.save(str(output_path), encryption=pymupdf.PDF_ENCRYPT_NONE, garbage=4, deflate=True)
    pages = len(doc)
    doc.close()

    return {
        "success": True,
        "unlocked_pages": pages,
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def protect_pdf_document(
    input_path: Path,
    output_path: Path,
    user_password: str,
    owner_password: Optional[str] = None,
    allow_print: bool = True,
    allow_copy: bool = True,
    allow_modify: bool = False,
) -> Dict[str, Any]:
    """Encrypt PDF document with AES-256 password protection and granular permissions."""
    if not user_password:
        raise ValueError("Password cannot be empty.")

    doc = pymupdf.open(str(input_path))
    owner_pw = owner_password or (user_password + "_owner")

    perm = 0
    if allow_print:
        perm |= pymupdf.PDF_PERM_PRINT
    if allow_copy:
        perm |= pymupdf.PDF_PERM_COPY
    if allow_modify:
        perm |= pymupdf.PDF_PERM_MODIFY

    doc.save(
        str(output_path),
        encryption=pymupdf.PDF_ENCRYPT_AES_256,
        user_pw=user_password,
        owner_pw=owner_pw,
        permissions=perm,
        garbage=4,
        deflate=True
    )
    pages = len(doc)
    doc.close()

    return {
        "success": True,
        "protected_pages": pages,
        "encryption": "AES-256 Bit Enterprise",
        "permissions": {"print": allow_print, "copy": allow_copy, "modify": allow_modify},
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def sign_pdf_document(
    input_path: Path,
    output_path: Path,
    signature_data_url: str,
    page_num: int = 1,
    x: float = 100,
    y: float = 650,
    width: float = 160,
    height: float = 60
) -> Dict[str, Any]:
    """Stamp digital signature drawing or image onto specified PDF page."""
    doc = pymupdf.open(str(input_path))
    p_idx = max(0, min(len(doc) - 1, page_num - 1))
    page = doc[p_idx]

    # Decode base64 image data url
    if "base64," in signature_data_url:
        _, b64_str = signature_data_url.split("base64,", 1)
        img_bytes = base64.b64decode(b64_str)
    else:
        img_bytes = base64.b64decode(signature_data_url)

    sig_rect = pymupdf.Rect(x, y, x + width, y + height)
    page.insert_image(sig_rect, stream=img_bytes, overlay=True)

    doc.save(str(output_path), garbage=4, deflate=True)
    doc.close()

    return {
        "success": True,
        "signed_page": p_idx + 1,
        "output_size": output_path.stat().st_size,
        "output_size_str": format_size(output_path.stat().st_size)
    }


def redact_pdf_custom(
    input_path: Path,
    output_path: Path,
    pii_types: Optional[List[str]] = None,
    keywords: Optional[List[str]] = None,
    manual_boxes: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """Permanently blackout and erase PII, custom keywords, and manual canvas boxes."""
    from pdf_advanced import redact_pdf_rich
    return redact_pdf_rich(input_path, output_path, pii_types=pii_types, keywords=keywords, manual_boxes=manual_boxes)


# ==============================================================================
# 6. PDF INTELLIGENCE (NEW!)
# ==============================================================================

def ai_summarize_document(input_path: Path, max_bullets: int = 6, use_ollama: bool = False) -> Dict[str, Any]:
    """Extract and analyze full-document themes, executive summary, entities, and takeaways."""
    from pdf_advanced import ai_summarize_rich
    return ai_summarize_rich(input_path, max_bullets=max_bullets, use_ollama=use_ollama)


def translate_pdf_document(
    input_path: Path,
    output_path: Path,
    target_lang: str = "es",
    engine: str = "auto",
    bilingual: bool = False,
) -> Dict[str, Any]:
    """Translate PDF content and render using Unicode fonts."""
    from pdf_advanced import translate_pdf_document_real
    return translate_pdf_document_real(input_path, output_path, target_lang=target_lang, engine=engine, bilingual=bilingual)


def compare_two_pdfs(file1_path: Path, file2_path: Path, output_pdf_path: Optional[Path] = None) -> Dict[str, Any]:
    """Compare two PDF files with ordered line diffs and pixel-level visual heatmaps."""
    from pdf_advanced import compare_two_pdfs_rich
    return compare_two_pdfs_rich(file1_path, file2_path, output_pdf_path=output_pdf_path)


def inspect_and_fill_forms(
    input_path: Path,
    form_values: Optional[Dict[str, str]] = None,
    output_path: Optional[Path] = None,
    new_fields: Optional[List[Dict[str, Any]]] = None,
    flatten: bool = False,
) -> Dict[str, Any]:
    """Detect form fields or create/fill/flatten them interactively."""
    if output_path and (form_values or new_fields or flatten):
        from pdf_advanced import create_and_fill_forms_rich
        return create_and_fill_forms_rich(
            input_path, output_path, form_values=form_values, new_fields=new_fields, flatten=flatten
        )

    doc = pymupdf.open(str(input_path))
    fields = []
    try:
        for p_idx, page in enumerate(doc):
            for widget in page.widgets():
                fields.append({
                    "page": p_idx + 1,
                    "name": widget.field_name or f"field_{len(fields)+1}",
                    "type": widget.field_type_string,
                    "value": widget.field_value or "",
                    "rect": [widget.rect.x0, widget.rect.y0, widget.rect.x1, widget.rect.y1]
                })
    finally:
        doc.close()

    return {
        "success": True,
        "fields_detected": len(fields),
        "fields": fields
    }


# ==============================================================================
# 7. WORKFLOW PIPELINE EXECUTOR
# ==============================================================================

def compress_pdf_file(
    input_path: Path,
    output_path: Path,
    preset: str = "balanced",
    target_mb: Optional[float] = None
) -> Dict[str, Any]:
    """Compress a single PDF file using presets or target MB."""
    from merge_and_compress import merge_and_compress_files
    ultra_bw = (preset == "ultrabw")
    grayscale = (preset == "grayscale")
    allowed = {"balanced", "maximum", "lossless", "ultrabw", "target", "custom"}
    stats = merge_and_compress_files(
        [input_path],
        output_path,
        compression_level=preset if preset in allowed else "balanced",
        target_mb=target_mb,
        ultra_bw=ultra_bw,
        grayscale=grayscale,
        add_bookmarks=False,
        strip_metadata=True
    )
    return {
        "success": True,
        "original_size": stats.get("initial_bytes", input_path.stat().st_size),
        "compressed_size": stats.get("final_bytes", output_path.stat().st_size),
        "compressed_size_str": stats.get("final_size_str", format_size(output_path.stat().st_size)),
        "reduction_pct": stats.get("reduction_pct", 0)
    }


def execute_workflow_pipeline(
    input_paths: List[Path],
    steps: List[Dict[str, Any]],
    output_dir: Path,
    progress_callback=None,
) -> Dict[str, Any]:
    """Chain up to 14 tools sequentially with live progress reporting."""
    from pdf_advanced import execute_workflow_pipeline_rich
    return execute_workflow_pipeline_rich(input_paths, steps, output_dir, progress_callback=progress_callback)
