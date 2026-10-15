from datetime import UTC, datetime, timedelta

from app.models.job import Job
from app.services.job_service import JobService


def make_job(job_id: str, published_at: datetime) -> Job:
    return Job(
        id=job_id,
        title="Python Developer",
        company="Example Ltd",
        location="Remote",
        workplace_type="remote",
        category="technology",
        description="Build services",
        url="https://example.com/jobs/1",
        source="test",
        published_at=published_at,
        discovered_at=datetime.now(UTC),
    )


def test_snapshot_removes_jobs_older_than_retention() -> None:
    service = JobService(sources=[], retention_hours=24)
    service._jobs = {
        "fresh": make_job("fresh", datetime.now(UTC) - timedelta(hours=2)),
        "stale": make_job("stale", datetime.now(UTC) - timedelta(hours=25)),
    }
    assert [job.id for job in service.snapshot()] == ["fresh"]
