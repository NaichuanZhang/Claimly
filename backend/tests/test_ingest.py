from pathlib import Path

import pytest

from claim_agent.ingest import load_file, load_files


class TestLoadFile:
    def test_loads_pdf_as_document(self, tmp_path: Path):
        pdf = tmp_path / "policy.pdf"
        pdf.write_bytes(b"%PDF-1.4 fake content")

        block = load_file(pdf)

        assert "document" in block
        assert block["document"]["format"] == "pdf"
        assert block["document"]["name"] == "policy"
        assert block["document"]["source"]["bytes"] == b"%PDF-1.4 fake content"

    def test_loads_jpg_as_image(self, tmp_path: Path):
        img = tmp_path / "damage.jpg"
        img.write_bytes(b"\xff\xd8\xff fake jpeg")

        block = load_file(img)

        assert "image" in block
        assert block["image"]["format"] == "jpeg"
        assert block["image"]["source"]["bytes"] == b"\xff\xd8\xff fake jpeg"

    def test_loads_png_as_image(self, tmp_path: Path):
        img = tmp_path / "photo.png"
        img.write_bytes(b"\x89PNG fake")

        block = load_file(img)

        assert "image" in block
        assert block["image"]["format"] == "png"

    def test_loads_docx_as_document(self, tmp_path: Path):
        doc = tmp_path / "report.docx"
        doc.write_bytes(b"PK fake docx")

        block = load_file(doc)

        assert "document" in block
        assert block["document"]["format"] == "docx"

    def test_rejects_unsupported_format(self, tmp_path: Path):
        bad = tmp_path / "data.zip"
        bad.write_bytes(b"PK zip")

        with pytest.raises(ValueError, match="Unsupported file type: .zip"):
            load_file(bad)


class TestLoadFiles:
    def test_interleaves_text_labels(self, tmp_path: Path):
        pdf = tmp_path / "policy.pdf"
        pdf.write_bytes(b"fake pdf")
        img = tmp_path / "photo.jpg"
        img.write_bytes(b"fake jpg")

        blocks = load_files([pdf, img])

        assert len(blocks) == 4
        assert blocks[0] == {"text": "--- File: policy.pdf ---"}
        assert "document" in blocks[1]
        assert blocks[2] == {"text": "--- File: photo.jpg ---"}
        assert "image" in blocks[3]

    def test_empty_list_returns_empty(self):
        assert load_files([]) == []
