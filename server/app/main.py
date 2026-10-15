import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router
from app.core.config import get_settings
from app.services.job_service import JobService


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    service = JobService(retention_hours=settings.job_retention_hours)
    app.state.job_service = service

    async def poll_sources() -> None:
        while True:
            try:
                await service.refresh()
            except Exception:
                # A source failure must not stop the polling loop.
                pass
            await asyncio.sleep(max(60, settings.poll_interval_seconds))

    task = asyncio.create_task(poll_sources())
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task


settings = get_settings()
app = FastAPI(title=settings.app_name, version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)
app.include_router(router)


@app.get("/")
def root() -> dict[str, str]:
    return {"name": settings.app_name, "docs": "/docs", "health": "/api/health"}
