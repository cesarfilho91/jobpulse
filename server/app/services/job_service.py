import asyncio
from datetime import UTC, datetime, timedelta

import httpx

from app.models.job import Job
from app.services.sources import ArbeitnowSource, JobSource, RemotiveSource


class JobService:
    def __init__(self, sources: list[JobSource] | None = None, retention_hours: int = 24) -> None:
        self.sources = sources or [ArbeitnowSource(), RemotiveSource()]
        self.retention = timedelta(hours=retention_hours)
        self._jobs: dict[str, Job] = {}
        self.source_status: dict[str, str] = {source.name: "not_checked" for source in self.sources}
        self.last_updated_at: datetime | None = None
        self._lock = asyncio.Lock()

    def snapshot(self) -> list[Job]:
        self._prune()
        return sorted(self._jobs.values(), key=lambda job: job.published_at, reverse=True)

    async def refresh(self) -> list[Job]:
        async with self._lock:
            async with httpx.AsyncClient(
                headers={"User-Agent": "JobPulse/1.0 (job search dashboard)"}
            ) as client:
                results = await asyncio.gather(
                    *(source.fetch(client) for source in self.sources), return_exceptions=True
                )
            now = datetime.now(UTC)
            for source, result in zip(self.sources, results, strict=True):
                if isinstance(result, BaseException):
                    self.source_status[source.name] = "error"
                    continue
                self.source_status[source.name] = "ok"
                for job in result:
                    if (
                        job.published_at >= now - self.retention
                        and job.published_at <= now + timedelta(minutes=5)
                    ):
                        self._jobs[job.id] = job.model_copy(
                            update={"is_new": job.id not in self._jobs}
                        )
            self.last_updated_at = now
            self._prune(now)
            return self.snapshot()

    def _prune(self, now: datetime | None = None) -> None:
        cutoff = (now or datetime.now(UTC)) - self.retention
        self._jobs = {key: job for key, job in self._jobs.items() if job.published_at >= cutoff}
