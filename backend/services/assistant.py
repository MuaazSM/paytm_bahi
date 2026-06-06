import json
import os
import re
from typing import Any

from pydantic import BaseModel, ValidationError
from sarvamai import SarvamAI

from schemas import InsightsSummaryResponse


SARVAM_TIMEOUT_SECS = 8.0


SYSTEM_PROMPT = """You are a business-insights assistant for an Indian kirana shopkeeper.
You answer questions about THIS merchant's sales and inventory using ONLY the JSON
business data provided in the user message. Never invent numbers.

Rules:
- Output ONLY valid JSON. No prose, no markdown, no backticks.
- Schema: {"answer_text": "string", "data": { ... }}
- answer_text: one short, friendly sentence in the merchant's language
  (Hindi/Hinglish by default, matching the question's language).
  Include the relevant number from the data.
- data: a small JSON object with the structured facts that back the answer,
  drawn from the provided business data (e.g. {"top_movers":[{"name":...,"units":...}]}).
- If the data does not answer the question, set answer_text to a polite
  "mujhe yeh data nahi mila" style reply and data to {}.
"""


class AssistantError(Exception):
    """Raised when the Q&A step fails (malformed/invalid LLM output)."""


class AssistantUpstreamError(AssistantError):
    """Raised when the Sarvam chat call itself fails (timeout, network, 5xx).
    Routes should map this to upstream_timeout (504), not parse_failed (400)."""


class AssistantAnswer(BaseModel):
    """Validated shape of the LLM's JSON output. `data` is bounded to a flat
    dict of JSON-native values to keep untrusted LLM content from reaching the UI."""

    answer_text: str
    data: dict[str, Any] = {}


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
        raise AssistantUpstreamError("AI service is not configured")
    return SarvamAI(api_subscription_key=key, timeout=SARVAM_TIMEOUT_SECS)


def _summary_to_context(summary: InsightsSummaryResponse) -> dict[str, Any]:
    """Compact JSON view of the merchant's data injected into the LLM context."""
    return summary.model_dump()


def answer_question(
    question: str,
    summary: InsightsSummaryResponse,
    language: str | None,
) -> tuple[str, dict[str, Any]]:
    if not question or not question.strip():
        raise AssistantError("empty question")

    context = _summary_to_context(summary)
    user_message = json.dumps(
        {
            "question": question,
            "language": language or "hi-IN",
            "business_data": context,
        },
        ensure_ascii=False,
    )

    try:
        client = _client()
        response = client.chat.completions(
            model="sarvam-30b",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.2,
        )
    except AssistantError:
        raise
    except Exception as exc:
        raise AssistantUpstreamError(f"AI service unavailable ({exc.__class__.__name__})") from exc

    try:
        content = response.choices[0].message.content
    except (AttributeError, IndexError, TypeError) as exc:
        raise AssistantError("malformed chat response") from exc

    if not content:
        raise AssistantError("empty LLM content")

    try:
        raw = json.loads(_strip_fences(content))
    except json.JSONDecodeError as exc:
        raise AssistantError(f"invalid JSON from LLM: {exc.msg}") from exc

    try:
        answer = AssistantAnswer.model_validate(raw)
    except ValidationError as exc:
        raise AssistantError(f"AssistantAnswer validation failed: {exc.error_count()} error(s)") from exc

    if not answer.answer_text.strip():
        raise AssistantError("missing answer_text in LLM output")

    safe_data = _sanitize_data(answer.data)
    return answer.answer_text, safe_data


_JSON_PRIMS = (str, int, float, bool, type(None))


def _sanitize_data(value: Any, depth: int = 0) -> Any:
    """Recursively keep only JSON-native primitives, dicts, and lists; cap depth and
    string length so untrusted LLM content can't smuggle weird shapes to the UI."""
    if depth > 4:
        return None
    if isinstance(value, dict):
        return {str(k)[:64]: _sanitize_data(v, depth + 1) for k, v in list(value.items())[:32]}
    if isinstance(value, list):
        return [_sanitize_data(v, depth + 1) for v in value[:32]]
    if isinstance(value, str):
        return value[:500]
    if isinstance(value, _JSON_PRIMS):
        return value
    return None
