from app.core.config import Settings
from app.models.job import Job


class AIService:
    """Optional AI layer; falls back to deterministic matching without credentials."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def match_summary(self, job: Job, profile: str) -> dict[str, str | bool]:
        profile = profile.strip()[:500]
        if not profile:
            return {
                "available": False,
                "summary": "Add a short profile to evaluate this opportunity.",
            }

        if not self._settings.openai_api_key:
            terms = {
                word.strip(".,;:!?()[]{}\"'").casefold()
                for word in profile.split()
                if len(word) > 3
            }
            content = f"{job.title} {job.description[:2000]}".casefold()
            matches = sorted(term for term in terms if term in content)
            if matches:
                return {
                    "available": False,
                    "summary": (
                        f"Potential alignment based on: {', '.join(matches[:5])}. "
                        "Heuristic only; not an AI assessment."
                    ),
                }
            return {
                "available": False,
                "summary": (
                    "No clear keyword overlap found. Review the description manually; "
                    "this is not an AI assessment."
                ),
            }

        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=self._settings.openai_api_key)
            response = await client.chat.completions.create(
                model=self._settings.openai_model,
                temperature=0.2,
                max_tokens=120,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Mantenha aqui o início original da instrução. "
                            "Continue aqui com o restante original da instrução."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Perfil: {profile}\n"
                            f"Vaga: {job.title}\n"
                            f"Empresa: {job.company}\n"
                            f"Descrição: {job.description[:3500]}"
                        ),
                    },
                ],
            )
            summary = response.choices[0].message.content or "Não foi possível gerar um resumo."
            return {"available": True, "summary": summary.strip()}
        except Exception:
            return {"available": False, "summary": "AI provider unavailable. Try again later."}
