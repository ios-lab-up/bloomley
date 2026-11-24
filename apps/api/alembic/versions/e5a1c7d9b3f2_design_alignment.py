"""align data model with the v3/v4 designs

Revision ID: e5a1c7d9b3f2
Revises: b49cb37196af
Create Date: 2026-11-23

- `users.timezone` (IANA name, default 'UTC'): "today" for streaks, daily
  mission uniqueness and the home screen is the user's local day, not UTC.
- `users.avatar_url`: mirrored from Clerk's `image_url`.
- `wellness_areas.pillar`: the 3 onboarding pillars (physical / mental /
  social) the 5 catalogue areas roll up into. Replaces the name-matching the
  mobile app was doing.
- `missions.intention`: key of the weekly-intention chip a mission serves
  (onboarding screen "¿Qué quieres lograr esta semana?").
- Seeds one mission per (intention, energy tier): 5 / 10 / 20 minutes, XP =
  minutes ("Camina 10 minutos · +10 XP"). Ids are deterministic (uuid5).
"""

from collections.abc import Sequence
from uuid import UUID, uuid5

import sqlalchemy as sa
from alembic import op

revision: str = "e5a1c7d9b3f2"
down_revision: str | None = "b49cb37196af"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None

# Same namespace as c4d6e8f0a1b2 so area ids resolve to the seeded rows.
_NS = UUID("8538a4a2-2f8b-4b8e-9d3a-7f6e5d4c3b2a")
_TIERS = (5, 10, 20)  # low / medium / high energy

_PILLAR_BY_AREA = {
    "Movimiento": "physical",
    "Descanso": "physical",
    "Nutrición": "physical",
    "Mindfulness": "mental",
    "Conexión": "social",
}

# intention key -> (area, title template, description)
_INTENTIONS: dict[str, tuple[str, str, str]] = {
    "move_more": ("Movimiento", "Camina {n} minutos", "Sal a la calle o da vueltas en casa. Sin ritmo, sin meta de pasos. Solo muévete."),
    "stretch": ("Movimiento", "Estírate {n} minutos", "Suelta cuello, hombros y espalda con estiramientos suaves."),
    "get_sun": ("Movimiento", "Sal al sol {n} minutos", "Busca luz natural y respira aire fresco."),
    "sleep_better": ("Descanso", "Prepárate para dormir ({n} min)", "Baja luces y ritmo para que tu cuerpo entienda que ya es hora de descansar."),
    "drink_water": ("Nutrición", "Toma agua con calma ({n} min)", "Sírvete un vaso y tómalo despacio, notando cómo se siente."),
    "eat_better": ("Nutrición", "Come con atención ({n} min)", "Prepara o elige algo que te nutra y cómelo sin pantallas."),
    "reduce_stress": ("Mindfulness", "Respira y baja el estrés ({n} min)", "Respiraciones lentas para soltar la tensión del día."),
    "more_energy": ("Mindfulness", "Recarga tu energía ({n} min)", "Una pausa corta con movimiento suave y respiración."),
    "disconnect": ("Mindfulness", "Desconéctate de pantallas {n} minutos", "Deja el celular a un lado y haz algo con las manos o con la mirada lejos."),
    "meditate": ("Mindfulness", "Medita {n} minutos", "Siéntate cómodo y vuelve a la respiración cada vez que la mente se vaya."),
    "journal": ("Mindfulness", "Escribe cómo te sientes ({n} min)", "Sin filtro ni formato: pon en palabras lo que traes hoy."),
    "gratitude": ("Conexión", "Agradece a alguien ({n} min)", "Dile a alguien, con tus palabras, algo que le agradeces."),
    "reach_out": ("Conexión", "Conecta con alguien ({n} min)", "Escribe o llama a una persona a la que le tengas cariño."),
}


def _area_id(name: str) -> UUID:
    return uuid5(_NS, f"area:{name}")


def _mission_id(intention: str, minutes: int) -> UUID:
    return uuid5(_NS, f"mission:{intention}:{minutes}")


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("timezone", sa.String(), nullable=False, server_default="UTC"),
    )
    op.add_column("users", sa.Column("avatar_url", sa.String(), nullable=True))

    op.add_column("wellness_areas", sa.Column("pillar", sa.String(), nullable=True))
    for area, pillar in _PILLAR_BY_AREA.items():
        op.execute(
            sa.text("UPDATE wellness_areas SET pillar = :p WHERE name = :n").bindparams(
                p=pillar, n=area
            )
        )
    # Areas added by hand after the seed still need a value.
    op.execute("UPDATE wellness_areas SET pillar = 'physical' WHERE pillar IS NULL")
    op.alter_column("wellness_areas", "pillar", nullable=False)
    op.create_index("ix_wellness_areas_pillar", "wellness_areas", ["pillar"])

    op.add_column("missions", sa.Column("intention", sa.String(), nullable=True))
    op.create_index("ix_missions_intention", "missions", ["intention"])

    missions = sa.table(
        "missions",
        sa.column("id", sa.Uuid()),
        sa.column("wellness_area_id", sa.Uuid()),
        sa.column("title", sa.String()),
        sa.column("description", sa.String()),
        sa.column("duration_minutes", sa.Integer()),
        sa.column("xp_reward", sa.Integer()),
        sa.column("intention", sa.String()),
    )
    op.bulk_insert(
        missions,
        [
            {
                "id": _mission_id(key, minutes),
                "wellness_area_id": _area_id(area),
                "title": title.format(n=minutes),
                "description": description,
                "duration_minutes": minutes,
                "xp_reward": minutes,
                "intention": key,
            }
            for key, (area, title, description) in _INTENTIONS.items()
            for minutes in _TIERS
        ],
    )


def downgrade() -> None:
    keys = ", ".join(f"'{k}'" for k in _INTENTIONS)
    # Completions of these missions cascade away with them.
    op.execute(f"DELETE FROM missions WHERE intention IN ({keys})")
    op.drop_index("ix_missions_intention", table_name="missions")
    op.drop_column("missions", "intention")
    op.drop_index("ix_wellness_areas_pillar", table_name="wellness_areas")
    op.drop_column("wellness_areas", "pillar")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "timezone")
