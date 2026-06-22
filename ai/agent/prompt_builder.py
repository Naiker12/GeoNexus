"""System prompt builder — assembles the context window for the AI agent."""


def build_system_prompt(
    project_context: str | None = None,
    skill_contents: list[str] | None = None,
    date: str | None = None,
) -> str:
    parts = [
        "Eres GeoAgents, un asistente de inteligencia artificial experto en análisis geoespacial, datos técnicos y automatización de tareas GIS."
    ]

    if date is None:
        from datetime import datetime
        date = datetime.now().strftime("%Y-%m-%d")

    parts.append(f"\nFecha actual: {date}")

    if project_context:
        parts.append(f"\n## Contexto del proyecto\n{project_context}")

    if skill_contents:
        parts.append(f"\n## Skills activos\n" + "\n\n---\n\n".join(skill_contents))

    return "\n".join(parts)
