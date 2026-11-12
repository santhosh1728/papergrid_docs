"""
UltraPDF Hotfolder Background Watcher (Drop & Done v2)
======================================================
Rule-based desktop hotfolder automation supporting:
- Root `Desktop/AutoMerge/Input` (single-file or multi-file batch merge & compress)
- Named profile subfolders:
    * Input/UltraBW_Max     -> 1-bit Monochrome up to 98% compression
    * Input/OCR_Searchable  -> Offline RapidOCR searchable PDF injection
    * Input/Redact_PII      -> Automatic PII Redaction + Compression
    * Input/PDF_to_Word     -> Layout-accurate DOCX conversion
- Optional Windows System Tray mode (`python watcher.py --tray`)
- Web UI integration via `get_hotfolder_status()` and `scan_hotfolder_once()`.
"""

import os
import sys
import json
import time
import shutil
import threading
from pathlib import Path
from typing import Any, Dict, List

from merge_and_compress import merge_and_compress_files, natural_sort_key

DESKTOP_PATH = Path(os.path.expanduser("~")) / "Desktop"
WATCH_BASE = DESKTOP_PATH / "AutoMerge"
INPUT_DIR = WATCH_BASE / "Input"
OUTPUT_DIR = WATCH_BASE / "Output"
PROCESSED_DIR = WATCH_BASE / "Processed"
CONFIG_FILE = Path(__file__).resolve().parent / "hotfolder_config.json"

VALID_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp", ".bmp", ".txt", ".docx", ".xlsx", ".pptx"}

DEFAULT_CONFIG: Dict[str, Any] = {
    "poll_interval_sec": 3,
    "min_files_root": 1,
    "default_preset": "balanced",
    "auto_bookmarks": True,
    "profiles": {
        "UltraBW_Max": {"action": "compress_ultrabw", "min_files": 1},
        "OCR_Searchable": {"action": "ocr", "min_files": 1},
        "Redact_PII": {"action": "redact_compress", "min_files": 1},
        "PDF_to_Word": {"action": "pdf_to_word", "min_files": 1},
    },
}


def load_hotfolder_config() -> Dict[str, Any]:
    """Load hotfolder configuration from disk or initialize defaults."""
    if CONFIG_FILE.is_file():
        try:
            cfg = json.loads(CONFIG_FILE.read_text(encoding="utf-8"))
            merged = dict(DEFAULT_CONFIG)
            merged.update(cfg)
            return merged
        except Exception:
            pass
    return dict(DEFAULT_CONFIG)


def save_hotfolder_config(cfg: Dict[str, Any]) -> Dict[str, Any]:
    """Persist hotfolder configuration to disk."""
    merged = load_hotfolder_config()
    merged.update(cfg)
    CONFIG_FILE.write_text(json.dumps(merged, indent=2), encoding="utf-8")
    return merged


def setup_hotfolders() -> Dict[str, Any]:
    """Create Desktop/AutoMerge Input, profile subfolders, Output, and Processed dirs."""
    cfg = load_hotfolder_config()
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    for prof_name in cfg.get("profiles", {}):
        (INPUT_DIR / prof_name).mkdir(parents=True, exist_ok=True)
    return cfg


def _archive_inputs(files: List[Path], tag: str) -> None:
    archive_dir = PROCESSED_DIR / f"{tag}_{time.strftime('%Y%m%d_%H%M%S')}"
    archive_dir.mkdir(parents=True, exist_ok=True)
    for f in files:
        try:
            shutil.move(str(f), str(archive_dir / f.name))
        except Exception:
            pass


def scan_hotfolder_once() -> List[Dict[str, Any]]:
    """Scan root Input and all profile subfolders once and process pending files."""
    cfg = setup_hotfolders()
    events: List[Dict[str, Any]] = []
    ts = time.strftime("%Y%m%d_%H%M%S")

    # 1. Process root Input folder
    root_files = sorted(
        [f for f in INPUT_DIR.iterdir() if f.is_file() and f.suffix.lower() in VALID_EXTENSIONS],
        key=lambda f: natural_sort_key(f.name),
    )
    if len(root_files) >= int(cfg.get("min_files_root", 1)):
        time.sleep(1.0)
        out_name = f"Auto_{cfg.get('default_preset', 'balanced').capitalize()}_{ts}.pdf" if len(root_files) > 1 else f"Compressed_{root_files[0].stem}_{ts}.pdf"
        out_file = OUTPUT_DIR / out_name
        stats = merge_and_compress_files(
            root_files,
            out_file,
            compression_level=cfg.get("default_preset", "balanced"),
            ultra_bw=(cfg.get("default_preset") == "ultrabw"),
            add_bookmarks=bool(cfg.get("auto_bookmarks", True)),
            verbose=False,
        )
        _archive_inputs(root_files, "root")
        events.append({"profile": "Root Input", "files": len(root_files), "output": out_file.name, "reduction_pct": stats.get("reduction_pct", 0)})

    # 2. Process named profile subfolders
    for prof_name, prof_cfg in cfg.get("profiles", {}).items():
        sub_dir = INPUT_DIR / prof_name
        if not sub_dir.is_dir():
            continue
        p_files = sorted(
            [f for f in sub_dir.iterdir() if f.is_file() and f.suffix.lower() in VALID_EXTENSIONS],
            key=lambda f: natural_sort_key(f.name),
        )
        if len(p_files) < int(prof_cfg.get("min_files", 1)):
            continue
        time.sleep(1.0)
        action = prof_cfg.get("action", "compress_balanced")

        if action == "ocr":
            from pdf_advanced import ocr_pdf_document_real
            for f in p_files:
                if f.suffix.lower() == ".pdf":
                    out_p = OUTPUT_DIR / f"OCR_{f.stem}_{ts}.pdf"
                    ocr_pdf_document_real(f, out_p)
                    events.append({"profile": prof_name, "files": 1, "output": out_p.name})
            _archive_inputs(p_files, prof_name)

        elif action == "pdf_to_word":
            from pdf_suite import pdf_to_word
            for f in p_files:
                if f.suffix.lower() == ".pdf":
                    out_p = OUTPUT_DIR / f"{f.stem}_{ts}.docx"
                    pdf_to_word(f, out_p)
                    events.append({"profile": prof_name, "files": 1, "output": out_p.name})
            _archive_inputs(p_files, prof_name)

        elif action == "redact_compress":
            out_file = OUTPUT_DIR / f"Redacted_{prof_name}_{ts}.pdf"
            merge_and_compress_files(p_files, out_file, compression_level="balanced", redact_pii=True, verbose=False)
            _archive_inputs(p_files, prof_name)
            events.append({"profile": prof_name, "files": len(p_files), "output": out_file.name})

        elif action == "compress_ultrabw":
            out_file = OUTPUT_DIR / f"UltraBW_{ts}.pdf"
            merge_and_compress_files(p_files, out_file, compression_level="ultrabw", ultra_bw=True, verbose=False)
            _archive_inputs(p_files, prof_name)
            events.append({"profile": prof_name, "files": len(p_files), "output": out_file.name})

    return events


def get_hotfolder_status() -> Dict[str, Any]:
    """Return current hotfolder folder paths, pending file counts, and recent outputs."""
    cfg = setup_hotfolders()
    pending = {
        "root": len([f for f in INPUT_DIR.iterdir() if f.is_file() and f.suffix.lower() in VALID_EXTENSIONS]),
    }
    for prof_name in cfg.get("profiles", {}):
        d = INPUT_DIR / prof_name
        pending[prof_name] = len([f for f in d.iterdir() if f.is_file() and f.suffix.lower() in VALID_EXTENSIONS]) if d.is_dir() else 0

    outputs = sorted(
        [f for f in OUTPUT_DIR.iterdir() if f.is_file()],
        key=lambda f: f.stat().st_mtime,
        reverse=True,
    )[:10]

    return {
        "input_dir": str(INPUT_DIR),
        "output_dir": str(OUTPUT_DIR),
        "config": cfg,
        "pending_counts": pending,
        "recent_outputs": [{"name": f.name, "size": f.stat().st_size} for f in outputs],
    }


def _launch_tray_app():
    """Run hotfolder watcher with a Windows system tray icon."""
    import pystray
    from PIL import Image, ImageDraw

    img = Image.new("RGB", (64, 64), (15, 23, 42))
    draw = ImageDraw.Draw(img)
    draw.rectangle((10, 10, 54, 54), fill=(99, 102, 241), outline=(255, 255, 255), width=2)
    draw.text((20, 22), "PDF", fill=(255, 255, 255))

    stop_event = threading.Event()

    def worker():
        while not stop_event.is_set():
            try:
                scan_hotfolder_once()
            except Exception as exc:
                print(f"[!] Tray scan error: {exc}")
            stop_event.wait(load_hotfolder_config().get("poll_interval_sec", 3))

    t = threading.Thread(target=worker, daemon=True)
    t.start()

    menu = pystray.Menu(
        pystray.MenuItem("Scan Hotfolders Now", lambda: scan_hotfolder_once()),
        pystray.MenuItem("Open Input Folder", lambda: os.startfile(str(INPUT_DIR))),
        pystray.MenuItem("Open Output Folder", lambda: os.startfile(str(OUTPUT_DIR))),
        pystray.MenuItem("Quit Watcher", lambda icon, item: (stop_event.set(), icon.stop())),
    )
    icon = pystray.Icon("UltraPDFWatcher", img, "UltraPDF Hotfolder Watcher", menu)
    icon.run()


def run_hotfolder_loop(poll_interval: int = 3):
    cfg = setup_hotfolders()
    print(f"[*] Hotfolder watching: {INPUT_DIR}")
    print(f"[*] Profile subfolders: {', '.join(cfg.get('profiles', {}).keys())}")
    print(f"[*] Output destination: {OUTPUT_DIR}")
    print("[*] Press Ctrl+C anytime to stop.\n")

    while True:
        try:
            events = scan_hotfolder_once()
            for ev in events:
                print(f"[✓] [{ev['profile']}] Processed {ev['files']} file(s) -> {ev['output']}")
            time.sleep(poll_interval)
        except KeyboardInterrupt:
            print("\nHotfolder watcher stopped.")
            break
        except Exception as e:
            print(f"[!] Error: {e}")
            time.sleep(poll_interval)


if __name__ == "__main__":
    if "--tray" in sys.argv:
        _launch_tray_app()
    else:
        run_hotfolder_loop()
