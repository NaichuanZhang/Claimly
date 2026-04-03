"""Load files into Strands ContentBlocks for multimodal agent input."""

import base64
import re
from pathlib import Path

from strands.types.content import ContentBlock

DOCUMENT_FORMATS = frozenset({"pdf", "csv", "doc", "docx", "xls", "xlsx", "html", "txt", "md"})
IMAGE_FORMATS = frozenset({"png", "jpeg", "jpg", "gif", "webp"})

MEDIA_TYPE_TO_FORMAT = {
    "application/pdf": "pdf",
    "text/csv": "csv",
    "text/plain": "txt",
    "text/html": "html",
    "text/markdown": "md",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/gif": "gif",
    "image/webp": "webp",
}


def _sanitize_doc_name(name: str) -> str:
    """Sanitize document name for Bedrock ConverseStream API.

    Only alphanumeric, whitespace, hyphens, parentheses, and square brackets
    are allowed. No consecutive whitespace.
    """
    stem = Path(name).stem if "." in name else name
    sanitized = re.sub(r"[^a-zA-Z0-9\s\-\(\)\[\]]", "-", stem)
    sanitized = re.sub(r"\s{2,}", " ", sanitized)
    return sanitized.strip() or "document"


def load_file(path: Path) -> ContentBlock:
    """Convert a single file into a Strands ContentBlock."""
    suffix = path.suffix.lower().lstrip(".")
    raw = path.read_bytes()

    if suffix in IMAGE_FORMATS:
        fmt = "jpeg" if suffix == "jpg" else suffix
        return {"image": {"format": fmt, "source": {"bytes": raw}}}

    if suffix in DOCUMENT_FORMATS:
        return {"document": {"format": suffix, "name": _sanitize_doc_name(path.stem), "source": {"bytes": raw}}}

    raise ValueError(f"Unsupported file type: .{suffix}")


def load_files(paths: list[Path]) -> list[ContentBlock]:
    """Load multiple files into ContentBlocks with text labels between them."""
    blocks: list[ContentBlock] = []
    for p in paths:
        blocks.append({"text": f"--- File: {p.name} ---"})
        blocks.append(load_file(p))
    return blocks


def from_data_url(url: str, filename: str) -> ContentBlock:
    """Decode a base64 data URL from the browser into a Strands ContentBlock."""
    header, data = url.split(",", 1)
    media_type = header.split(":")[1].split(";")[0]
    raw = base64.b64decode(data)

    fmt = MEDIA_TYPE_TO_FORMAT.get(media_type)
    if fmt is None:
        raise ValueError(f"Unsupported media type: {media_type}")

    if fmt in IMAGE_FORMATS:
        return {"image": {"format": fmt, "source": {"bytes": raw}}}

    return {"document": {"format": fmt, "name": _sanitize_doc_name(filename), "source": {"bytes": raw}}}
