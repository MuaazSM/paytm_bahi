import io
import os
from dataclasses import dataclass

from sarvamai import SarvamAI


class SttError(Exception):
    """Raised when Sarvam Saaras STT fails. Routes map this to error code `stt_failed`."""


@dataclass
class Transcription:
    transcript: str
    language_code: str | None


def _client() -> SarvamAI:
    key = os.environ.get("SARVAM_API_KEY")
    if not key:
        raise SttError("SARVAM_API_KEY not configured")
    return SarvamAI(api_subscription_key=key)


def transcribe(audio_bytes: bytes, language: str | None = None) -> Transcription:
    """Transcribe audio via Sarvam Saaras v3.

    `language` is an optional BCP-47 hint (e.g. "hi-IN"); when omitted Saaras auto-detects.
    Returns the transcript and the detected/used language code. Raises SttError on failure.
    """
    if not audio_bytes:
        raise SttError("empty audio payload")

    try:
        client = _client()
        buf = io.BytesIO(audio_bytes)
        buf.name = "audio.wav"
        kwargs: dict = {"file": buf, "model": "saaras:v3", "mode": "transcribe"}
        if language:
            kwargs["language_code"] = language
        response = client.speech_to_text.transcribe(**kwargs)
    except SttError:
        raise
    except Exception as exc:
        raise SttError("Sarvam STT request failed") from exc

    transcript = getattr(response, "transcript", None)
    if transcript is None and isinstance(response, dict):
        transcript = response.get("transcript")
    if not transcript:
        raise SttError("Sarvam STT returned no transcript")

    detected = getattr(response, "language_code", None)
    if detected is None and isinstance(response, dict):
        detected = response.get("language_code")

    return Transcription(transcript=transcript, language_code=detected or language)
