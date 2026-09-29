"""seed wellness catalogue

Revision ID: c4d6e8f0a1b2
Revises: 7e2fa1b3c9d5
Create Date: 2026-09-23

Seeds the default wellness areas and their starter missions so the catalogue
is usable (and demo-able) right after `alembic upgrade head`.

IDs are deterministic (uuid5 over a fixed namespace) so re-running/dumping
stays stable. Missions reference their area by the same generated id.
"""

from collections.abc import Sequence
from uuid import NAMESPACE_DNS, uuid5, UUID

import sqlalchemy as sa
from alembic import op

revision: str = "c4d6e8f0a1b2"
down_revision: str | None = "7e2fa1b3c9d5"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

_NS = UUID("8538a4a2-2f8b-4b8e-9d3a-7f6e5d4c3b2a")

# area name -> description
_AREAS: dict[str, str] = {
    "Mindfulness": "Meditación, presencia y gestión del estrés.",
    "Movimiento": "Ejercicio, fuerza y movilidad.",
    "Descanso": "Sueño y recuperación.",
    "Nutrición": "Alimentación e hidratación consciente.",
    "Conexión": "Relaciones y bienestar social.",
}

# area name -> (title, description, duration_minutes, xp_reward)
_MISSIONS: dict[str, list[tuple[str, str, int, int]]] = {
    "Mindfulness": [
        ("Meditación guiada", "Diez minutos de meditación guiada para centrar la atención.", 10, 20),
        ("Respiración 4-7-8", "Inhala por 4, retén por 7, exhala por 8. Calma el sistema nervioso.", 5, 10),
        ("Scan corporal", "Explora tu cuerpo de pies a cabeza y libera tensión.", 15, 30),
        ("Diario de gratitud", "Escribe tres cosas por las que estás agradecido hoy.", 10, 20),
    ],
    "Movimiento": [
        ("Estiramiento matutino", "Despierta el cuerpo con una rutina corta de estiramientos.", 10, 20),
        ("Caminata activa", "Camina a buen ritmo, respirando profundo y con la mente libre.", 20, 50),
        ("Entrenamiento de fuerza", "Circuito de fuerza simple: prioriza la técnica sobre la carga.", 30, 80),
        ("Baile libre", "Pon tu playlist favorita y muévete sin filtros.", 15, 30),
    ],
    "Descanso": [
        ("Desconexión digital", "Deja las pantallas a un lado antes de dormir.", 30, 60),
        ("Ritual de relajación", "Prepara tu habitación y tu mente para dormir mejor.", 15, 30),
        ("Respiración para dormir", "Respiración lenta y larga para inducir el sueño.", 5, 10),
    ],
    "Nutrición": [
        ("Hidratación consciente", "Hidrátate despacio y nota cómo responde tu cuerpo.", 5, 10),
        ("Comida sin pantallas", "Come prestando atención plena a cada bocado.", 20, 40),
        ("Snack saludable", "Prepara un snack limpio con lo que tengas a mano.", 15, 30),
    ],
    "Conexión": [
        ("Llamada a un ser querido", "Una llamada corta donde escuches de verdad.", 15, 30),
        ("Mensaje de agradecimiento", "Envía un mensaje real a alguien que aprecias.", 10, 20),
    ],
}


def _area_id(name: str) -> UUID:
    return uuid5(_NS, f"area:{name}")


def _mission_id(name: str) -> UUID:
    return uuid5(_NS, f"mission:{name}")


def upgrade() -> None:
    wellness_areas = sa.table(
        "wellness_areas",
        sa.column("id", sa.Uuid()),
        sa.column("name", sa.String()),
        sa.column("description", sa.String()),
    )
    missions = sa.table(
        "missions",
        sa.column("id", sa.Uuid()),
        sa.column("wellness_area_id", sa.Uuid()),
        sa.column("title", sa.String()),
        sa.column("description", sa.String()),
        sa.column("duration_minutes", sa.Integer()),
        sa.column("xp_reward", sa.Integer()),
    )

    op.bulk_insert(
        wellness_areas,
        [
            {"id": _area_id(name), "name": name, "description": description}
            for name, description in _AREAS.items()
        ],
    )
    op.bulk_insert(
        missions,
        [
            {
                "id": _mission_id(title),
                "wellness_area_id": _area_id(area),
                "title": title,
                "description": description,
                "duration_minutes": duration,
                "xp_reward": xp,
            }
            for area, items in _MISSIONS.items()
            for title, description, duration, xp in items
        ],
    )


def downgrade() -> None:
    names = ", ".join(f"'{name}'" for name in _AREAS)
    op.execute(f"DELETE FROM wellness_areas WHERE name IN ({names});")