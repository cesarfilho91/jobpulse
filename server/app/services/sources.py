import re
from datetime import UTC, datetime
from hashlib import sha256
from html.parser import HTMLParser
from typing import Any

import httpx

from app.models.job import Job
from app.services.classifier import classify_category, classify_workplace


class JobSourceError(RuntimeError):
    pass


class _DescriptionParser(HTMLParser):
    BLOCK_TAGS = {
        "address",
        "article",
        "blockquote",
        "br",
        "div",
        "footer",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "li",
        "ol",
        "p",
        "section",
        "ul",
        "tr",
    }

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag.lower() in self.BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def _clean_description(value: str) -> str:
    if not value:
        return ""

    parser = _DescriptionParser()
    try:
        parser.feed(value)
        parser.close()
        text = "".join(parser.parts)
    except Exception:
        text = value

    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r" *\n *", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip()


class JobSource:
    name: str

    async def fetch(self, client: httpx.AsyncClient) -> list[Job]:
        raise NotImplementedError


def _published_at(value: Any) -> datetime:
    if isinstance(value, (int, float)):
        return datetime.fromtimestamp(value, tz=UTC)
    if isinstance(value, str) and value:
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed.replace(tzinfo=UTC) if parsed.tzinfo is None else parsed.astimezone(UTC)
        except ValueError:
            pass
    return datetime.now(UTC)


def _make_job(
    *,
    source: str,
    external_id: str,
    title: str,
    company: str,
    location: str,
    description: str,
    url: str,
    published_at: datetime,
    tags: list[str],
    remote_flag: bool = False,
) -> Job:
    discovered = datetime.now(UTC)
    content = f"{source}:{external_id or url}"
    workplace = classify_workplace(f"{title} {location} {description[:600]}", remote_flag)
    return Job(
        id=sha256(content.encode()).hexdigest()[:20],
        title=title.strip() or "Untitled position",
        company=company.strip() or "Company not provided",
        location=location.strip() or "Location not provided",
        workplace_type=workplace,
        category=classify_category(title, description, tags),
        description=_clean_description(description),
        url=url,
        source=source,
        published_at=published_at,
        discovered_at=discovered,
        tags=tags,
    )


class ArbeitnowSource(JobSource):
    name = "Arbeitnow"
    endpoint = "https://www.arbeitnow.com/api/job-board-api"

    async def fetch(self, client: httpx.AsyncClient) -> list[Job]:
        try:
            response = await client.get(self.endpoint, timeout=15)
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise JobSourceError(f"{self.name}: {exc}") from exc

        jobs: list[Job] = []
        for item in payload.get("data", []):
            if not isinstance(item, dict) or not item.get("url"):
                continue
            tags = [str(tag) for tag in item.get("tags", []) if tag]
            jobs.append(
                _make_job(
                    source=self.name,
                    external_id=str(item.get("slug") or item.get("id") or item["url"]),
                    title=str(item.get("title") or ""),
                    company=str(item.get("company_name") or ""),
                    location=str(item.get("location") or ""),
                    description=str(item.get("description") or ""),
                    url=str(item["url"]),
                    published_at=_published_at(item.get("created_at")),
                    tags=tags,
                    remote_flag=bool(item.get("remote")),
                )
            )
        return jobs


class RemotiveSource(JobSource):
    name = "Remotive"
    endpoint = "https://remotive.com/api/remote-jobs?limit=100"

    async def fetch(self, client: httpx.AsyncClient) -> list[Job]:
        try:
            response = await client.get(self.endpoint, timeout=15)
            response.raise_for_status()
            payload = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            raise JobSourceError(f"{self.name}: {exc}") from exc

        jobs: list[Job] = []
        for item in payload.get("jobs", []):
            if not isinstance(item, dict) or not item.get("url"):
                continue
            tags = [str(item.get("category") or "")] + [
                str(tag) for tag in item.get("tags", []) if tag
            ]
            jobs.append(
                _make_job(
                    source=self.name,
                    external_id=str(item.get("id") or item["url"]),
                    title=str(item.get("title") or ""),
                    company=str(item.get("company_name") or ""),
                    location=str(item.get("candidate_required_location") or "Anywhere"),
                    description=str(item.get("description") or ""),
                    url=str(item["url"]),
                    published_at=_published_at(item.get("publication_date")),
                    tags=tags,
                    remote_flag=True,
                )
            )
        return jobs
