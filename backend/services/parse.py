import json
import os
import re

from pydantic import ValidationError
from sarvamai import SarvamAI

from schemas import ParsedSale


SYSTEM_PROMPT = """You convert an Indian shopkeeper's spoken sales note into structured JSON.
The merchant speaks Hindi/regional languages, often code-mixed with English,
using informal quantities ("do kilo", "ek packet", "paav").

Rules:
- Output ONLY valid JSON matching the schema. No prose, no markdown, no backticks.
- Quantities: convert words to numbers (do=2, teen=3, paav=0.25, aadha=0.5).
- unit must be one of: piece, kg, gram, litre, ml, packet, dozen. Default "piece".
- Prices are in rupees in speech; convert to paise (×100). If price is for the
  whole line not per unit, set price_is_total=true. If no price, unit_price=null.
- If the note is ambiguous or unparseable, set needs_clarification=true and put a
  short question in "clarification".
- Detect the spoken language as a BCP-47 code in language_detected.

Schema: { "items":[{"name","qty","unit","unit_price","price_is_total"}],
          "language_detected", "needs_clarification", "clarification" }"""


class ParseError(Exception):
    """Raised when the transcript→ParsedSale step fails. Carries the raw transcript
    so the route can return `parse_failed` with the transcript intact for manual edit."""

    def __init__(self, message: str, transcript: str):
        super().__init__(message)
        self.transcript = transcript


_FENCE_RE = re.compile(r"^\s*```(?:json)?\s*|\s*```\s*$", re.IGNORECASE)


def _strip_fences(text: str) -> str:
    cleaned = _FENCE_RE.sub("", text.strip())
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    return cleaned


def _client() -> SarvamAI:
    key = os.environ.get("SARVAM_API_KEY")
    if not key:
        raise RuntimeError("SARVAM_API_KEY not configured")
    return SarvamAI(api_subscription_key=key)


def parse_transcript(transcript: str) -> ParsedSale:
    """Send transcript to Sarvam chat and return a validated ParsedSale.

    Any upstream/JSON/validation failure raises ParseError carrying the raw transcript.
    The DB never sees unvalidated LLM text — only the ParsedSale Pydantic model.
    """
    if not transcript or not transcript.strip():
        raise ParseError("empty transcript", transcript or "")

    try:
        client = _client()
        response = client.chat.completions(
            model="sarvam-30b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": transcript},
            ],
            temperature=0.0,
        )
    except Exception as exc:
        raise ParseError(f"Sarvam chat upstream error: {exc.__class__.__name__}", transcript) from exc

    try:
        content = response.choices[0].message.content
    except (AttributeError, IndexError, TypeError) as exc:
        raise ParseError("malformed chat response", transcript) from exc

    if not content:
        raise ParseError("empty LLM content", transcript)

    cleaned = _strip_fences(content)

    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ParseError(f"invalid JSON from LLM: {exc.msg}", transcript) from exc

    try:
        return ParsedSale.model_validate(data)
    except ValidationError as exc:
        raise ParseError(f"ParsedSale validation failed: {exc.error_count()} error(s)", transcript) from exc
