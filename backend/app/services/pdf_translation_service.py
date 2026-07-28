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



def _int_to_rgb(color_int: int) -> tuple[float, float, float]:
    if color_int == 0:
        return (0, 0, 0)
    r = ((color_int >> 16) & 0xFF) / 255.0
    g = ((color_int >> 8) & 0xFF) / 255.0
    b = (color_int & 0xFF) / 255.0
    return (r, g, b)


MAX_BATCH_SIZE = 30


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


def _translate_spans(spans_with_context: list[tuple[str, str]], target_language: str) -> list[str]:
    if not spans_with_context:
        return []

    if len(spans_with_context) > MAX_BATCH_SIZE:
        result = []
        for i in range(0, len(spans_with_context), MAX_BATCH_SIZE):
            chunk = spans_with_context[i:i + MAX_BATCH_SIZE]
            result.extend(_translate_spans(chunk, target_language))
        return result

    items = "\n".join(
        f"[{i+1}] text=\"{text}\" context=\"{line}\""
        for i, (text, line) in enumerate(spans_with_context)
    )
    prompt = (
        "You are a professional text translator.\n\n"
        f"Translate each text into {target_language}.\n\n"
        "Rules:\n"
        "- Return ONLY a numbered list of translations, nothing else.\n"
        "- Each line: N. translated_text\n"
        "- Preserve original whitespace before/after the text.\n"
        "- Use the 'context' to translate each fragment accurately.\n"
        "- Keep numbers, dates, and proper names unchanged.\n\n"
        "Example:\n"
        'Input: [1] text="Hello " context="Hello world"\n'
        'Input: [2] text="world" context="Hello world"\n'
        "Output:\n"
        "1. مرحبا \n"
        "2. العالم\n\n"
        "Translate these:\n"
        f"{items}"
    )
    logger.info("Translating %d spans in batch", len(spans_with_context))
    messages = [{"role": "user", "content": prompt}]
    raw = call_llm(messages).strip()
    logger.debug("LLM response: %s", raw[:500])

    result = [""] * len(spans_with_context)
    for line in raw.split("\n"):
        line = line.strip()
        m = re.match(r"^(\d+)\.\s*(.*)", line)
        if m:
            idx = int(m.group(1)) - 1
            if 0 <= idx < len(result):
                result[idx] = m.group(2)
            continue
        m = re.match(r"^\[(\d+)\]\s*(.*)", line)
        if m:
            idx = int(m.group(1)) - 1
            if 0 <= idx < len(result):
                result[idx] = m.group(2)

    if any(not r for r in result):
        logger.warning("Span batch mismatch: %d/%d filled — per-text fallback",
                       sum(1 for r in result if r), len(result))
        return [_translate_single(t, target_language) for t, _ in spans_with_context]

    return result


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

        flat_spans = []
        for bi, block in enumerate(text_blocks):
            block_lines_text = [line["text"] for line in block["lines"]]
            block_full_text = " ".join(t for t in block_lines_text if t.strip())
            for li, line in enumerate(block["lines"]):
                for si, span in enumerate(line["spans"]):
                    flat_spans.append((bi, li, si, span, block_full_text))

        all_texts = [fs[3]["text"] for fs in flat_spans]
        translatable_indices = [i for i, t in enumerate(all_texts) if t.strip()]
        spans_with_context = [(all_texts[i], flat_spans[i][4]) for i in translatable_indices]

        if spans_with_context:
            translated = _translate_spans(spans_with_context, self._target)
        else:
            translated = []

        for idx, new_text in zip(translatable_indices, translated):
            orig = flat_spans[idx][3].get("text", "")
            flat_spans[idx][3]["text"] = new_text
            flat_spans[idx][3]["original_text"] = orig

        blocks_with_untranslated = set()
        for idx in translatable_indices:
            bi, li, si, span, _ = flat_spans[idx]
            if span.get("text") == span.get("original_text", ""):
                blocks_with_untranslated.add(bi)

        if blocks_with_untranslated:
            block_texts = []
            block_map = []
            for bi in sorted(blocks_with_untranslated):
                block_lines = [l["text"] for l in text_blocks[bi]["lines"]]
                t = " ".join(l for l in block_lines if l.strip())
                if t.strip():
                    block_texts.append(t)
                    block_map.append(bi)
            if block_texts:
                items = "\n".join(f"{i+1}. {t}" for i, t in enumerate(block_texts))
                prompt = (
                    "You are a professional translator.\n\n"
                    f"Translate each text into {self._target}.\n\n"
                    "Rules:\n"
                    "- Return ONLY the translations, one per line, in the same order.\n"
                    "- Each line must start with the number followed by a period (e.g. '1. translated text').\n"
                    "- Preserve meaning, numbers, dates, and proper names.\n"
                    "- Do not summarize or explain.\n\n"
                    f"Texts:\n{items}"
                )
                raw = call_llm([{"role": "user", "content": prompt}]).strip()
                block_translations = {}
                for line in raw.split("\n"):
                    m = re.match(r"^(\d+)\.\s*(.*)", line.strip())
                    if m:
                        idx = int(m.group(1)) - 1
                        if 0 <= idx < len(block_map):
                            block_translations[block_map[idx]] = m.group(2)
                for bi, translated_text in block_translations.items():
                    text_blocks[bi]["translated_block"] = translated_text

        translated_blocks = []
        for bi, block in enumerate(text_blocks):
            translated_lines = []
            for li, line in enumerate(block["lines"]):
                rebuilt_text = "".join(span["text"] for span in line["spans"])
                translated_lines.append({**line, "original_text": line["text"], "text": rebuilt_text})
            translated_blocks.append({**block, "lines": translated_lines})

        return {**page_data, "text_blocks": translated_blocks}


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
            page_num = page_data["page_num"]
            src_page = src_doc[page_num - 1]

            for block in page_data["text_blocks"]:
                for line in block["lines"]:
                    for span in line["spans"]:
                        if span["text"].strip():
                            src_page.add_redact_annot(fitz.Rect(*span["bbox"]), fill=None)
            src_page.apply_redactions()

            out_doc.insert_pdf(src_doc, from_page=page_num - 1, to_page=page_num - 1)
            new_page = out_doc[-1]

            for block in page_data["text_blocks"]:
                block_rendered = False
                block_fallback = block.get("translated_block", "")
                for line in block["lines"]:
                    for span in line["spans"]:
                        if block_rendered:
                            continue

                        text = span["text"]
                        if not text.strip():
                            continue

                        orig_text = span.get("original_text", "")
                        if orig_text and text == orig_text and block_fallback.strip():
                            text = block_fallback

                        block_rendered = True

                        bbox = span["bbox"]
                        resolved = _resolve_font(span.get("font", "helv"), span.get("flags", 0))
                        color = _int_to_rgb(span.get("color", 0))
                        size = span.get("size", 10) * 0.85
                        x = bbox[0]
                        y = bbox[3] - 1

                        new_page.insert_text(
                            (x, y), text, fontsize=size, color=color,
                            fontname=resolved, fontfile=font_file,
                        )

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
