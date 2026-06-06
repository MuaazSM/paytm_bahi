from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile
from pydantic import ValidationError
from sqlmodel import Session

from auth import require_merchant
from db import get_session
from models import Merchant
from schemas import (
    AssistantQueryResponse,
    AssistantQueryTextRequest,
    SpeakRequest,
    SpeakResponse,
)
from services.assistant import (
    AssistantError,
    AssistantUpstreamError,
    answer_question,
)
from services.insights import compute_summary
from services.speech import SttError, transcribe
from services.voice import TtsError, speak

router = APIRouter(tags=["assistant"], dependencies=[Depends(require_merchant)])


def _error(status: int, code: str, message: str, detail=None) -> HTTPException:
    return HTTPException(
        status_code=status,
        detail={"error": {"code": code, "message": message, "detail": detail}},
    )


@router.post("/assistant/speak", response_model=SpeakResponse)
def assistant_speak(req: SpeakRequest) -> SpeakResponse:
    try:
        url = speak(req.text, req.language)
    except TtsError as exc:
        raise _error(400, "tts_failed", str(exc))
    return SpeakResponse(audio_url=url)


@router.post("/assistant/query", response_model=AssistantQueryResponse)
async def assistant_query(
    request: Request,
    merchant: Merchant = Depends(require_merchant),
    session: Session = Depends(get_session),
) -> AssistantQueryResponse:
    content_type = (request.headers.get("content-type") or "").lower()

    question_text: str
    language: str | None

    if content_type.startswith("multipart/form-data"):
        try:
            form = await request.form()
        except Exception:
            raise _error(400, "validation_error", "malformed multipart body")

        audio = form.get("audio")
        lang_val = form.get("language")
        language = lang_val if isinstance(lang_val, str) and lang_val else None
        if not isinstance(audio, UploadFile):
            raise _error(400, "validation_error", "missing 'audio' file")
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise _error(400, "validation_error", "empty audio")
        try:
            stt = transcribe(audio_bytes, language or merchant.language)
        except SttError as exc:
            raise _error(400, "stt_failed", str(exc))
        question_text = stt.transcript
        language = language or stt.language_code or merchant.language
    else:
        try:
            body = await request.json()
        except Exception:
            raise _error(400, "validation_error", "invalid JSON body")
        try:
            req = AssistantQueryTextRequest.model_validate(body)
        except ValidationError as exc:
            raise _error(400, "validation_error", "invalid request", detail=exc.errors())
        question_text = req.text
        language = req.language or merchant.language

    summary = compute_summary(session, merchant.id)

    try:
        answer_text, data = answer_question(question_text, summary, language)
    except AssistantUpstreamError as exc:
        raise _error(504, "upstream_timeout", str(exc))
    except AssistantError as exc:
        raise _error(400, "parse_failed", str(exc))

    # Audio is best-effort — degrade gracefully so a Bulbul hiccup doesn't kill
    # the answer card on stage (root CLAUDE.md rule: never a dead end).
    try:
        audio_url = speak(answer_text, language)
    except TtsError:
        audio_url = None

    return AssistantQueryResponse(
        question_text=question_text,
        answer_text=answer_text,
        answer_audio_url=audio_url,
        data=data,
    )
