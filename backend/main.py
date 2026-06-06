import logging
import os
import threading
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from db import engine, init_db
from routers import admin, assistant, auth as auth_router, insights, products, sales
from schemas import HealthResponse
from seed import ensure_seeded

log = logging.getLogger("dukaaniq")


def _prewarm_sarvam() -> None:
    """Open a Sarvam connection on startup so the first live demo request isn't cold.
    Best-effort: any failure is logged and swallowed — never block the app from starting."""
    if not os.environ.get("SARVAM_API_KEY"):
        log.info("prewarm: SARVAM_API_KEY not set, skipping")
        return
    try:
        from sarvamai import SarvamAI

        client = SarvamAI(api_subscription_key=os.environ["SARVAM_API_KEY"], timeout=5.0)
        # Tiny chat ping — establishes TLS, warms DNS/connection pool, exercises the
        # exact code path /sales/voice and /assistant/query use.
        client.chat.completions(
            model="sarvam-30b",
            messages=[
                {"role": "system", "content": "Reply with the single character: ok"},
                {"role": "user", "content": "ping"},
            ],
            temperature=0.0,
            max_tokens=4,
        )
        log.info("prewarm: Sarvam chat ready")
    except Exception as exc:
        log.warning("prewarm: Sarvam ping failed (%s) — continuing", exc.__class__.__name__)

app = FastAPI(title="Dukaan IQ API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

AUDIO_DIR = Path(__file__).parent / "audio_files"
AUDIO_DIR.mkdir(exist_ok=True)
app.mount("/audio", StaticFiles(directory=AUDIO_DIR), name="audio")


@app.on_event("startup")
def _startup() -> None:
    init_db()
    with Session(engine) as session:
        ensure_seeded(session)
    # Pre-warm Sarvam in a background thread so app startup stays fast even if
    # Sarvam is slow/unreachable. The demo's first real call lands on a warm pool.
    threading.Thread(target=_prewarm_sarvam, name="sarvam-prewarm", daemon=True).start()


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        body = detail
    else:
        code_map = {
            400: "validation_error",
            401: "unauthorized",
            404: "not_found",
            504: "upstream_timeout",
        }
        body = {
            "error": {
                "code": code_map.get(exc.status_code, "validation_error"),
                "message": str(detail) if detail is not None else "Error",
                "detail": None,
            }
        }
    return JSONResponse(status_code=exc.status_code, content=body)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed",
                "detail": exc.errors(),
            }
        },
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    """Backstop: any uncaught error becomes the standard error envelope, never a
    bare FastAPI 500. Demo rule: never a dead end on stage."""
    log.exception("unhandled exception: %s", exc.__class__.__name__)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "upstream_timeout",
                "message": "Unexpected server error",
                "detail": None,
            }
        },
    )


@app.get("/health", response_model=HealthResponse, tags=["health"])
def health() -> HealthResponse:
    return HealthResponse(status="ok")


app.include_router(auth_router.router)
app.include_router(products.router)
app.include_router(sales.router)
app.include_router(insights.router)
app.include_router(assistant.router)
app.include_router(admin.router)
