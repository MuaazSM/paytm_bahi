import os
import time
from dataclasses import dataclass

import httpx
from sarvamai import SarvamAI


class OcrError(Exception):
    """Raised when Sarvam Vision / Document Intelligence fails. Mapped to `ocr_failed`."""


@dataclass
class OcrResult:
    text: str
    language_code: str | None


def _client() -> SarvamAI:
    key = os.environ.get("SARVAM_API_KEY")
    if not key:
        raise OcrError("SARVAM_API_KEY not configured")
    return SarvamAI(api_subscription_key=key)


_TERMINAL_OK = {"Completed", "PartiallyCompleted"}
_TERMINAL_FAIL = {"Failed"}


def extract_text(image_bytes: bytes, language: str | None = None, filename: str = "page.jpg") -> OcrResult:
    """Run image bytes through Sarvam document intelligence and return extracted text.

    P2 stub: minimal init→upload→start→poll→download flow. Any failure raises OcrError.
    """
    if not image_bytes:
        raise OcrError("empty image payload")

    lang = language or "hi-IN"
    client = _client()

    try:
        created = client.document_intelligence.initialise(
            job_parameters={"language": lang, "output_format": "md"},
        )
        job_id = created.job_id

        uploads = client.document_intelligence.get_upload_links(job_id=job_id, files=[filename])
        signed = uploads.upload_urls.get(filename)
        if signed is None:
            raise OcrError("no upload URL returned")

        with httpx.Client(timeout=30.0) as http:
            put = http.put(signed.file_url, content=image_bytes)
            put.raise_for_status()

        client.document_intelligence.start(job_id=job_id)

        deadline = time.monotonic() + 45.0
        state = "Pending"
        while time.monotonic() < deadline:
            status = client.document_intelligence.get_status(job_id=job_id)
            state = status.job_state
            if state in _TERMINAL_OK or state in _TERMINAL_FAIL:
                break
            time.sleep(1.0)

        if state in _TERMINAL_FAIL:
            raise OcrError("document intelligence job failed")
        if state not in _TERMINAL_OK:
            raise OcrError("document intelligence job timed out")

        downloads = client.document_intelligence.get_download_links(job_id=job_id)
        if not downloads.download_urls:
            raise OcrError("no download URLs returned")

        with httpx.Client(timeout=30.0) as http:
            chunks: list[str] = []
            for _name, details in downloads.download_urls.items():
                resp = http.get(details.file_url)
                resp.raise_for_status()
                chunks.append(resp.text)

        text = "\n".join(c.strip() for c in chunks if c and c.strip())
        if not text:
            raise OcrError("empty OCR output")

        return OcrResult(text=text, language_code=lang)
    except OcrError:
        raise
    except Exception as exc:
        raise OcrError(f"Sarvam OCR request failed: {exc.__class__.__name__}") from exc
