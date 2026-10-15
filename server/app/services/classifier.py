import re
from collections.abc import Sequence

from app.models.job import JobCategory, WorkplaceType

CATEGORY_TERMS: dict[JobCategory, Sequence[str]] = {
    "technology": (
        "developer",
        "software",
        "engineer",
        "programmer",
        "devops",
        "data",
        "qa",
        "backend",
        "frontend",
        "full stack",
        "cloud",
        "security",
        "ti ",
        "tech",
    ),
    "administrative": (
        "administrative",
        "admin assistant",
        "office assistant",
        "secretary",
        "back office",
        "operations assistant",
    ),
    "support": (
        "support",
        "help desk",
        "helpdesk",
        "service desk",
        "customer service",
        "technical assistance",
        "it support",
    ),
    "design": ("designer", "design", "ux", "ui", "product designer", "graphic"),
    "sales": (
        "sales",
        "account executive",
        "business development",
        "commercial",
        "sales representative",
    ),
    "marketing": ("marketing", "seo", "content", "social media", "copywriter", "growth"),
}


def classify_category(
    title: str, description: str = "", tags: list[str] | None = None
) -> JobCategory:
    text = _normalize(" ".join([title, description[:1200], " ".join(tags or [])]))
    title_text = _normalize(title)

    for category, terms in CATEGORY_TERMS.items():
        if any(_normalize(term) in title_text for term in terms):
            return category
    for category, terms in CATEGORY_TERMS.items():
        if any(_normalize(term) in text for term in terms):
            return category
    return "other"


def classify_workplace(text: str, remote_flag: bool = False) -> WorkplaceType:
    normalized = _normalize(text)
    if "hybrid" in normalized or "flexible workplace" in normalized:
        return "hybrid"
    if remote_flag or re.search(
        r"\b(remote|work from home|work-from-home|distributed)\b", normalized
    ):
        return "remote"
    if re.search(r"\b(on[- ]site|onsite|in[- ]office|office based)\b", normalized):
        return "onsite"
    return "unknown"


def _normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value.casefold()).strip()
