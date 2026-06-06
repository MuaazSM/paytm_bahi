import base64
import os
import secrets
from pathlib import Path

from sarvamai import SarvamAI


AUDIO_DIR = Path(__file__).resolve().parent.parent / "audio_files"
SARVAM_TIMEOUT_SECS = 8.0


class TtsError(Exception):
    """Raised when Sarvam Bulbul TTS fails. Routes map this to error code `tts_failed`."""


def _client() -> SarvamAI:
    key = os.environ.get("SARVAM_API_KEY")
    if not key:
        raise TtsError("TTS service is not configured")
    return SarvamAI(api_subscription_key=key, timeout=SARVAM_TIMEOUT_SECS)


def speak(text: str, language: str | None = None) -> str:
    """Synthesize `text` via Sarvam Bulbul v3, save as wav under ./audio_files,
    and return the public URL path `/audio/{filename}`. Raises TtsError on failure.
    """
    if not text or not text.strip():
        raise TtsError("empty text")

    target_language = language or "hi-IN"

    try:
        client = _client()
        response = client.text_to_speech.convert(
            text=text,
            target_language_code=target_language,
            model="bulbul:v3",
            speaker="shubh",
        )
    except TtsError:
        raise
    except Exception as exc:
        raise TtsError("Sarvam TTS request failed") from exc

    audios = getattr(response, "audios", None)
    if audios is None and isinstance(response, dict):
        audios = response.get("audios")
    if not audios:
        raise TtsError("Sarvam TTS returned no audio")

    try:
        audio_bytes = base64.b64decode(audios[0])
    except Exception as exc:
        raise TtsError("Sarvam TTS returned malformed audio") from exc

    AUDIO_DIR.mkdir(exist_ok=True)
    filename = f"spk_{secrets.token_hex(4)}.wav"
    (AUDIO_DIR / filename).write_bytes(audio_bytes)
    return f"/audio/{filename}"
