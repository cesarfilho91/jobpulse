from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

JobCategory = Literal[
    "technology", "administrative", "support", "design", "sales", "marketing", "other"
]
WorkplaceType = Literal["remote", "hybrid", "onsite", "unknown"]


class Job(BaseModel):
    model_config = ConfigDict(frozen=True)

    id: str
    title: str
    company: str
    location: str = "Location not provided"
    workplace_type: WorkplaceType = "unknown"
    category: JobCategory = "other"
    description: str = ""
    url: HttpUrl
    source: str
    published_at: datetime
    discovered_at: datetime
    tags: list[str] = Field(default_factory=list)
    is_new: bool = False


class JobListResponse(BaseModel):
    data: list[Job]
    total: int
    updated_at: datetime
    sources: list[str]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    sources: dict[str, str]
    last_updated_at: datetime | None = None
