import asyncio
import json
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from app.core.config import Settings, get_settings
from app.models.job import HealthResponse, Job, JobListResponse
from app.services.ai_service import AIService
from app.services.job_service import JobService

router = APIRouter(prefix="/api")


def get_job_service(request: Request) -> JobService:
    return request.app.state.job_service


def _filtered_jobs(
    jobs: list[Job], q: str, category: str, workplace: str, location: str
) -> list[Job]:
    result = jobs
    if q:
        needle = q.casefold()
        result = [
            job
            for job in result
            if needle
            in f"{job.title} {job.company} {job.description} {' '.join(job.tags)}".casefold()
        ]
    if category and category != "all":
        result = [job for job in result if job.category == category]
    if workplace and workplace != "all":
        result = [job for job in result if job.workplace_type == workplace]
    if location:
        needle = location.casefold()
        result = [job for job in result if needle in job.location.casefold()]
    return result


@router.get("/health", response_model=HealthResponse)
async def health(service: Annotated[JobService, Depends(get_job_service)]) -> HealthResponse:
    statuses = service.source_status
    return HealthResponse(
        status="ok"
        if any(value == "ok" for value in statuses.values()) or not service.last_updated_at
        else "degraded",
        sources=statuses,
        last_updated_at=service.last_updated_at,
    )


@router.get("/jobs", response_model=JobListResponse)
async def list_jobs(
    service: Annotated[JobService, Depends(get_job_service)],
    q: str = Query(default="", max_length=120),
    category: str = Query(default="all"),
    workplace: str = Query(default="all"),
    location: str = Query(default="", max_length=120),
) -> JobListResponse:
    jobs = _filtered_jobs(service.snapshot(), q, category, workplace, location)
    return JobListResponse(
        data=jobs,
        total=len(jobs),
        updated_at=service.last_updated_at or datetime.now(UTC),
        sources=sorted({job.source for job in jobs}),
    )


@router.post("/refresh", response_model=JobListResponse)
async def refresh_jobs(service: Annotated[JobService, Depends(get_job_service)]) -> JobListResponse:
    jobs = await service.refresh()
    return JobListResponse(
        data=jobs,
        total=len(jobs),
        updated_at=service.last_updated_at or datetime.now(UTC),
        sources=sorted({job.source for job in jobs}),
    )


@router.get("/events")
async def job_events(
    request: Request, service: Annotated[JobService, Depends(get_job_service)]
) -> StreamingResponse:
    async def stream():
        previous: set[str] = set()
        initialized = False
        while not await request.is_disconnected():
            jobs = service.snapshot()
            current = {job.id for job in jobs}
            new_jobs = [job for job in jobs if job.id not in previous]
            if not initialized or new_jobs:
                payload = {
                    "type": "jobs_snapshot",
                    "jobs": [job.model_dump(mode="json") for job in jobs],
                    "new_ids": [job.id for job in new_jobs] if initialized else [],
                }
                yield f"data: {json.dumps(payload)}\n\n"
                initialized = True
            previous = current
            await asyncio.sleep(15)

    return StreamingResponse(
        stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.post("/match")
async def match_job(
    request: Request,
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict[str, str | bool]:
    body = await request.json()
    job_id = str(body.get("job_id", ""))
    profile = str(body.get("profile", ""))
    if len(profile) > 500:
        profile = profile[:500]
    job = next(
        (item for item in request.app.state.job_service.snapshot() if item.id == job_id), None
    )
    if job is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Job not found or expired")
    return await AIService(settings).match_summary(job, profile)
