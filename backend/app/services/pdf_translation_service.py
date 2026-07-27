from __future__ import annotations

import logging
import os
import re
import socket
import threading
import time
import uuid
from pathlib import Path

import fitz

from app.core.config import settings
from app.services.llm_service import call_llm

logger = logging.getLogger(__name__)

RTL_LANGUAGES = {"arabic", "arab", "persian", "farsi", "urdu", "hebrew", "yiddish", "pashto", "dari", "kurdish", "sindhi"}

FONT_URLS = [
    "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/notosans/NotoSans-Regular.ttf",
    "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans%5Bwdth,wght%5D.ttf",
]
FONT_PATH = Path(__file__).resolve().parent.parent.parent / "fonts" / "NotoSans.ttf"

_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _ensure_font():
    if FONT_PATH.exists():
        return
    FONT_PATH.parent.mkdir(parents=True, exist_ok=True)
    for url in FONT_URLS:
        try:
            logger.info("Downloading font from %s...", url)
            import urllib.request
            socket.setdefaulttimeout(15)
            urllib.request.urlretrieve(url, str(FONT_PATH))
            logger.info("Font downloaded to %s", FONT_PATH)
            return
        except Exception as e:
            logger.warning("Font download failed from %s: %s", url, e)
    logger.warning("All font downloads failed — will use built-in font (RTL scripts may not render)")


def _is_rtl_language(language: str) -> bool:
    return language.lower() in RTL_LANGUAGES


FONT_MAP = {
    "helvetica": "Helvetica",
    "helvetica-bold": "Helvetica-Bold",
    "helvetica-oblique": "Helvetica-Oblique",
    "helvetica-boldoblique": "Helvetica-BoldOblique",
    "times-roman": "Times-Roman",
    "timesroman": "Times-Roman",
    "times-bold": "Times-Bold",
    "times-italic": "Times-Italic",
    "times-bolditalic": "Times-BoldItalic",
    "courier": "Courier",
    "courier-bold": "Courier-Bold",
    "courier-oblique": "Courier-Oblique",
    "courier-boldoblique": "Courier-BoldOblique",
    "symbol": "Symbol",
    "zapfdingbats": "ZapfDingbats",
}


def _resolve_font(pdf_font_name: str, flags: int = 0) -> str:
    key = pdf_font_name.lower().replace(" ", "-").replace("_", "-")
    is_bold = "bold" in key or (flags & 16)
    if is_bold and not key.endswith("bold"):
        key += "-bold"
    if key in FONT_MAP:
        return FONT_MAP[key]
    normalized = pdf_font_name.strip()
    if is_bold and "bold" not in normalized.lower():
        try:
            fitz.Font(fontname=normalized + "-Bold")
            return normalized + "-Bold"
        except Exception:
            pass
    try:
        fitz.Font(fontname=normalized)
        return normalized
    except Exception:
        return "Helvetica-Bold" if is_bold else "Helvetica"


def _wrap_text(text: str, font_obj, max_width: float, fontsize: float) -> list[str]:
    words = text.split()
    if not words:
        return [text]

    lines = []
    current_line = []
    current_width = 0.0
    space_width = font_obj.text_length(" ", fontsize=fontsize)

    for word in words:
        word_width = font_obj.text_length(word, fontsize=fontsize)
        if current_width + word_width + (space_width if current_line else 0) <= max_width:
            current_line.append(word)
            current_width += word_width + (space_width if len(current_line) > 1 else 0)
        else:
            if current_line:
                lines.append(" ".join(current_line))
            current_line = [word]
            current_width = word_width

    if current_line:
        lines.append(" ".join(current_line))

    return lines if lines else [text]


def _int_to_rgb(color_int: int) -> tuple[float, float, float]:
    if color_int == 0:
        return (0, 0, 0)
    r = ((color_int >> 16) & 0xFF) / 255.0
    g = ((color_int >> 8) & 0xFF) / 255.0
    b = (color_int & 0xFF) / 255.0
    return (r, g, b)


MAX_BATCH_SIZE = 30


def _translate_batch(texts: list[str], target_language: str) -> list[str]:
    if not texts:
        return texts

    if len(texts) > MAX_BATCH_SIZE:
        result = []
        for i in range(0, len(texts), MAX_BATCH_SIZE):
            chunk = texts[i:i + MAX_BATCH_SIZE]
            result.extend(_translate_batch(chunk, target_language))
        return result

    items = "\n".join(f"{i+1}. {t}" for i, t in enumerate(texts))
    prompt = (
        "You are a professional translator.\n\n"
        f"Translate each of the following texts into {target_language}.\n\n"
        "Rules:\n"
        "- Return ONLY the translations, one per line, in the same order.\n"
        "- Each line must start with the number followed by a period (e.g. '1. translated text').\n"
        "- Preserve meaning.\n"
        "- Do not summarize or explain.\n"
        "- Keep numbers, dates, and proper names unchanged.\n"
        "- If a text is empty or contains only numbers/punctuation, return it unchanged.\n\n"
        f"Texts:\n{items}"
    )
    messages = [{"role": "user", "content": prompt}]
    raw = call_llm(messages).strip()

    result = []
    for line in raw.split("\n"):
        line = line.strip()
        if re.match(r"^\d+\.\s*", line):
            result.append(re.sub(r"^\d+\.\s*", "", line, count=1).strip())

    if len(result) != len(texts):
        logger.warning("Batch mismatch: expected %d, got %d — trying per-text fallback", len(texts), len(result))
        return [_translate_single(t, target_language) for t in texts]

    return result


def _translate_single(text: str, target_language: str) -> str:
    if not text.strip():
        return text
    prompt = (
        "You are a professional translator.\n\n"
        f"Translate the following text into {target_language}.\n\n"
        "Rules:\n"
        "- Preserve meaning.\n"
        "- Do not summarize or explain.\n"
        "- Keep numbers unchanged.\n"
        "- Return ONLY the translated text.\n\n"
        f"Text:\n{text}"
    )
    messages = [{"role": "user", "content": prompt}]
    return call_llm(messages).strip()


class PDFExtractor:
    def extract(self, pdf_path: str) -> list[dict]:
        doc = fitz.open(pdf_path)
        pages = []
        for page_num in range(len(doc)):
            page = doc[page_num]
            blocks = page.get_text("dict")
            text_blocks = []
            for b in blocks["blocks"]:
                if b["type"] == 0:
                    block_info = {
                        "bbox": b["bbox"],
                        "lines": [],
                    }
                    for line in b["lines"]:
                        line_text_parts = []
                        spans_info = []
                        for span in line["spans"]:
                            line_text_parts.append(span["text"])
                            spans_info.append({
                                "text": span["text"],
                                "font": span["font"],
                                "size": span["size"],
                                "bbox": span["bbox"],
                                "color": span.get("color", 0),
                                "flags": span.get("flags", 0),
                            })
                        block_info["lines"].append({
                            "bbox": line["bbox"],
                            "dir": line["dir"],
                            "text": "".join(line_text_parts),
                            "spans": spans_info,
                            "wmode": line.get("wmode", 0),
                        })
                    text_blocks.append(block_info)
            images = []
            for b in blocks["blocks"]:
                if b["type"] == 1:
                    images.append({
                        "bbox": b["bbox"],
                        "width": b.get("width", 0),
                        "height": b.get("height", 0),
                    })
            pages.append({
                "page_num": page_num + 1,
                "width": page.rect.width,
                "height": page.rect.height,
                "text_blocks": text_blocks,
                "images": images,
            })
        doc.close()
        return pages


class TranslationService:
    def __init__(self, target_language: str):
        self._target = target_language

    def translate_page(self, page_data: dict, page_index: int, total_pages: int, progress_callback=None) -> dict:
        text_blocks = page_data["text_blocks"]

        flat_index = []
        all_texts = []
        for bi, block in enumerate(text_blocks):
            for li, line in enumerate(block["lines"]):
                flat_index.append((bi, li))
                all_texts.append(line["text"])

        translatable_indices = [i for i, t in enumerate(all_texts) if t.strip()]
        translatable_texts = [all_texts[i] for i in translatable_indices]

        if translatable_texts:
            translated = _translate_batch(translatable_texts, self._target)
        else:
            translated = []

        result_map = {}
        for idx, text in zip(translatable_indices, translated):
            result_map[idx] = text

        translated_blocks = []
        for bi, block in enumerate(text_blocks):
            translated_lines = []
            offset = sum(len(text_blocks[b]["lines"]) for b in range(bi))
            for li, line in enumerate(block["lines"]):
                idx = offset + li
                new_text = result_map.get(idx, line["text"])
                translated_lines.append({
                    **line,
                    "original_text": line["text"],
                    "text": new_text,
                })
            translated_blocks.append({**block, "lines": translated_lines})

        return {
            **page_data,
            "text_blocks": translated_blocks,
        }


class LayoutRebuilder:
    def __init__(self, output_dir: str):
        self._output_dir = output_dir
        _ensure_font()

    def rebuild(self, pages_data: list[dict], original_pdf: str) -> str:
        job_id = str(uuid.uuid4())
        output_path = os.path.join(self._output_dir, f"{job_id}.pdf")
        os.makedirs(self._output_dir, exist_ok=True)

        src_doc = fitz.open(original_pdf)
        out_doc = fitz.open()

        font_file = str(FONT_PATH) if FONT_PATH.exists() else None

        for page_data in pages_data:
            src_page = src_doc[page_data["page_num"] - 1]

            for block in page_data["text_blocks"]:
                for line in block["lines"]:
                    if line["text"].strip():
                        src_page.add_redact_annot(fitz.Rect(*line["bbox"]), fill=None)
            src_page.apply_redactions()

            out_doc.insert_pdf(src_doc, from_page=page_data["page_num"] - 1, to_page=page_data["page_num"] - 1)
            new_page = out_doc[-1]

            for block in page_data["text_blocks"]:
                lines = block["lines"]
                if not lines:
                    continue

                bbox = block["bbox"]
                block_width = bbox[2] - bbox[0]
                block_x = bbox[0]
                block_y0 = bbox[1]
                block_y1 = bbox[3]

                first_span = lines[0]["spans"][0] if lines[0]["spans"] else {}
                font_name = first_span.get("font", "helv")
                font_size = first_span.get("size", 10)
                flags = first_span.get("flags", 0)
                font_color = first_span.get("color", 0)

                resolved = _resolve_font(font_name, flags)

                parts = []
                for li, line in enumerate(lines):
                    t = line["text"].strip()
                    if t:
                        if parts and not t[0] in ".!?,:;)]}%":
                            parts.append(" ")
                        parts.append(t)
                full_text = "".join(parts)
                if not full_text:
                    continue

                font_obj = fitz.Font(fontname=resolved, fontfile=font_file) if font_file else fitz.Font(fontname=resolved)
                tw = font_obj.text_length(full_text, fontsize=font_size)

                used_size = font_size
                if tw > block_width * 0.95:
                    wrapped = _wrap_text(full_text, font_obj, block_width * 0.95, font_size)
                    max_wl = max(font_obj.text_length(wl, fontsize=font_size) for wl in wrapped)
                    if max_wl > block_width * 0.95 and used_size > 4:
                        ratio = block_width * 0.9 / max_wl
                        used_size = max(font_size * ratio, font_size * 0.7)
                        font_obj = fitz.Font(fontname=resolved, fontfile=font_file) if font_file else fitz.Font(fontname=resolved)
                        wrapped = _wrap_text(full_text, font_obj, block_width * 0.95, used_size)
                else:
                    wrapped = [full_text]

                line_height = used_size * 1.3
                total_height = len(wrapped) * line_height
                block_height = block_y1 - block_y0
                if total_height > block_height and used_size > 5:
                    ratio = block_height / total_height
                    used_size = max(used_size * ratio * 0.9, font_size * 0.7)
                    line_height = used_size * 1.3
                    font_obj = fitz.Font(fontname=resolved, fontfile=font_file) if font_file else fitz.Font(fontname=resolved)
                    wrapped = _wrap_text(full_text, font_obj, block_width * 0.95, used_size)

                color = _int_to_rgb(font_color)
                first_line = lines[0]
                start_y = first_line["bbox"][3] - 1

                y = start_y
                for wl in wrapped:
                    new_page.insert_text((block_x, y), wl, fontsize=used_size, color=color, fontname=resolved, fontfile=font_file)
                    y += line_height

        src_doc.close()
        out_doc.save(output_path, garbage=4, deflate=True)
        out_doc.close()
        return output_path


class PDFTranslationService:
    def start(self, pdf_path: str, target_language: str) -> str:
        job_id = str(uuid.uuid4())
        with _jobs_lock:
            _jobs[job_id] = {
                "id": job_id,
                "status": "queued",
                "progress": 0,
                "message": "Queued for processing",
                "error": None,
                "output_path": None,
            }
        thread = threading.Thread(
            target=self._process,
            args=(job_id, pdf_path, target_language),
            daemon=True,
        )
        thread.start()
        return job_id

    def get_status(self, job_id: str) -> dict | None:
        with _jobs_lock:
            return _jobs.get(job_id)

    def _process(self, job_id: str, pdf_path: str, target_language: str):
        try:
            self._update(job_id, "processing", 5, "Extracting PDF content...")
            extractor = PDFExtractor()
            pages = extractor.extract(pdf_path)

            total = len(pages)
            translator = TranslationService(target_language)
            translated_pages = []

            for i, page in enumerate(pages):
                pct = 5 + int(((i + 1) / total) * 70)
                self._update(job_id, "processing", pct, f"Translating page {i + 1}/{total}...")
                translated = translator.translate_page(page, i, total)
                translated_pages.append(translated)

            self._update(job_id, "processing", 80, "Rebuilding PDF layout...")
            rebuilder = LayoutRebuilder(settings.upload_dir)
            output_path = rebuilder.rebuild(translated_pages, pdf_path)

            self._update(job_id, "completed", 100, "Translation complete", output_path=output_path)
        except Exception as e:
            logger.exception("Translation job %s failed", job_id)
            self._update(job_id, "failed", 0, str(e), error=str(e))

    def _update(self, job_id: str, status: str, progress: int, message: str = "", output_path: str | None = None, error: str | None = None):
        with _jobs_lock:
            if job_id in _jobs:
                _jobs[job_id].update({
                    "status": status,
                    "progress": progress,
                    "message": message,
                    "output_path": output_path or _jobs[job_id].get("output_path"),
                    "error": error or _jobs[job_id].get("error"),
                })


def cleanup_old_jobs(max_age: int = 3600):
    now = time.time()
    with _jobs_lock:
        stale = [jid for jid, j in _jobs.items() if j.get("_created", now) < now - max_age]
        for jid in stale:
            j = _jobs[jid]
            if j.get("output_path") and os.path.exists(j["output_path"]):
                try:
                    os.remove(j["output_path"])
                except Exception:
                    pass
            del _jobs[jid]
