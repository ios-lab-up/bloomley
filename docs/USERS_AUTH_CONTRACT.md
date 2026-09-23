# Contrato de trabajo en paralelo — Bloomley

**Dueño de este documento:** Max (Módulo 1 — Users & Auth/Clerk)
**Audiencia:** los 2 compañeros que van a construir el resto de los módulos.
**Objetivo:** que los 3 puedan trabajar en paralelo desde el día 1 sin bloquearse, con interfaces (backend + mobile) acordadas de antemano.

---

## 1. Arquitectura y convenciones compartidas

### Backend (`apps/api`) — Screaming Architecture

Cada dominio vive como hermano de `app/core/`:

```
apps/api/app/
├── core/                # ya existe: config, database, deps compartidos
└── <domain>/            # uno por módulo de negocio
    ├── __init__.py
    ├── models.py         # SQLModel (tablas)
    ├── schemas.py         # Pydantic request/response (si difieren del modelo)
    ├── router.py          # APIRouter, prefijo /api/v1/<domain>
    ├── service.py          # lógica de negocio
    └── deps.py            # FastAPI Depends propios del dominio (opcional)
```

- Cada router se registra en `app/main.py` con `app.include_router(router, prefix="/api/v1")`.
- Nunca importar directo entre dominios salvo por lo que el otro dominio expone explícitamente (ver §5 y §6). Si necesitas un modelo de otro dominio, importa el modelo (es la tabla), no repliques lógica.
- Migraciones: Alembic, una revisión por feature. Ver §8 sobre cómo evitar choques de heads.

### Mobile (`apps/mobile`) — FSD

Ya está el layout: `screens -> features -> entities -> shared`, import solo hacia abajo.

```
src/entities/<domain>/   # espejo del dominio backend: tipos, api client, card UI
src/features/<domain>-<accion>/   # una acción de usuario (ej. features/mission-complete)
src/screens/<name>/      # compone features + entities
```

- `src/entities/<domain>/index.ts` es la única puerta de entrada pública de esa entidad.
- Los tipos TS de cada entidad deben reflejar los schemas Pydantic del backend correspondiente (a mano por ahora, no hay codegen).

### Convenciones de API

- Prefijo `/api/v1/<domain>` por módulo.
- IDs: siempre `uuid` (string) en payloads JSON.
- Toda ruta autenticada depende de `get_current_user` (ver §5.3) — **nunca** vuelvan a implementar verificación de Clerk en sus routers.
- Fechas en ISO-8601 UTC.
- Errores: usar `HTTPException` de FastAPI; formato de error por defecto de FastAPI (`{"detail": ...}"`) — no inventar envolturas custom todavía.

---

## 2. División de módulos

| # | Módulo | Owner | Entidades del ERD | Backend path | Mobile path |
|---|--------|-------|--------------------|---------------|-------------|
| 1 | **Users & Auth (Clerk)** | Max | `USERS`, `NOTIFICATION_SETTINGS`, `PUSH_TOKENS` | `app/users/` | `src/entities/user/` |
| 2 | **Wellness & Engagement** | Compañero A | `WELLNESS_AREAS`, `USER_WELLNESS_AREAS`, `MISSIONS`, `CHECKINS`, `MISSION_COMPLETIONS`, `STREAKS`, `BLOOM_FEEDBACK` | `app/wellness/`, `app/missions/` (2 subdominios si prefieren) | `src/entities/wellness-area/`, `src/entities/mission/`, `src/entities/checkin/`, `src/entities/streak/` |
| 3 | **Social & Groups** | Compañero B | `GROUPS`, `GROUP_MEMBERSHIPS`, `GROUP_STREAKS`, `PHOTOS`, `REACTIONS` | `app/groups/`, `app/photos/` | `src/entities/group/`, `src/entities/photo/` |

Criterio de la división: Módulo 2 es el loop individual de gamificación (misión → completar → XP/racha). Módulo 3 es el loop social (grupo → foto → reacción). Ambos solo dependen de `USERS.id`, nunca de `clerk_user_id` — eso lo resuelve mi módulo antes de que sus requests lleguen a sus routers.

---

## 3. Supuestos / ambigüedades del ERD — **decisiones ya tomadas**

Resuelto con Max, aplica desde ya (Módulo 2 y 3 pueden migrar sus tablas con esto):

1. ✅ **Resuelto — se agrega la FK.** `mission_completions` lleva `group_id: uuid | null` (nullable, una misión puede completarse fuera de un grupo). La escribe el Módulo 2.
2. ✅ **Confirmado.** `photos.group_id` queda denormalizado a propósito (para el feed de grupo), pero se setea en el `service.py` del Módulo 3 a partir de `mission_completion.group_id` al crear la foto — nunca a mano desde el cliente.
3. ✅ **Confirmado: la racha es global.** `streaks` es 1:1 con `users`, una sola racha por usuario, no por `wellness_area`.
4. ✅ **Confirmado.** La tabla se llama `mission_completions` (plural). El bloque de atributos del mermaid con nombre singular (`MISSION_COMPLETION`) fue un typo del diagrama.
5. ⏳ **Pendiente.** No está definido todavía si `bloom_feedback` se genera automáticamente al completar una misión (¿reglas? ¿IA?) o es input manual. Para no bloquear al Módulo 2: implementar por ahora solo la tabla + un endpoint que se dispare manualmente al completar una misión; el "cómo se genera el mensaje" se define después.

---

## 4. Interfaz pública del Módulo 1 (Users & Auth) — lo que ustedes consumen

Esto es lo importante: **no dependan del schema interno de mi módulo**, dependan de esto.

### 4.1 Tabla `users` (backend)

```python
# app/users/models.py
class User(SQLModel, table=True):
    __tablename__ = "users"
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    clerk_user_id: str = Field(unique=True, index=True)
    email: str
    display_name: str
    xp_total: int = Field(default=0)
    level: int = Field(default=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

Cualquier FK a un usuario en sus tablas apunta a `users.id` (uuid interno), **nunca** a `clerk_user_id`.

### 4.2 Dependency de autenticación (lo que van a usar en cada router)

```python
# app/users/deps.py
async def get_current_user(
    authorization: str = Header(...),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Verifica el JWT de Clerk (Authorization: Bearer <token>) y devuelve
    la fila `users` interna correspondiente. 401 si el token es inválido
    o si el usuario no existe todavía en nuestra DB."""
```

Uso en sus routers:

```python
from app.users.deps import get_current_user
from app.users.models import User

@router.post("/missions/{id}/complete")
async def complete_mission(id: UUID, user: User = Depends(get_current_user)):
    ...  # user.id es la FK que guardan
```

**Disponibilidad temprana:** para no bloquearlos, el día 0 voy a publicar esta función con un modo `AUTH_DEV_BYPASS=true` (lee un header `X-Debug-User-Id` en vez de validar Clerk) mientras termino la integración real. La firma no cambia, así que pueden empezar a codear contra `Depends(get_current_user)` de inmediato.

### 4.3 Endpoints que expongo

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/v1/users/me` | Perfil del usuario autenticado (incluye `xp_total`, `level`) |
| `PATCH` | `/api/v1/users/me` | Editar `display_name` |
| `POST` | `/api/v1/webhooks/clerk` | Webhook de Clerk (`user.created/updated/deleted`) — sincroniza la tabla `users` |
| `PATCH` | `/api/v1/users/me/notification-settings` | Actualiza `notification_settings` |
| `POST` | `/api/v1/users/me/push-tokens` | Registra un `expo_push_token` |

Si necesitan sumar XP a un usuario (ej. al completar una misión), no hagan `UPDATE users` desde su módulo — expongo:

```python
# app/users/service.py — función importable, no endpoint
async def add_xp(session: AsyncSession, user_id: UUID, amount: int) -> User:
    """Suma XP y recalcula `level`. Único punto de escritura de xp_total/level."""
```

Impórtenla y llámenla desde su `service.py` cuando se complete una misión. Así el cálculo de nivel vive en un solo lugar.

### 4.4 Mobile — `src/entities/user/`

```
src/entities/user/
├── index.ts          # export { useCurrentUser, apiClient, type User }
├── model/types.ts     # type User = { id, email, displayName, xpTotal, level }
├── api/client.ts       # apiClient: fetch wrapper que agrega el Bearer token de Clerk
└── ui/UserAvatar.tsx
```

- `src/app/` va a tener el `<ClerkProvider>` + `<ClerkLoaded>` envolviendo la app (yo lo configuro).
- El `apiClient` (fetch wrapper con `Authorization: Bearer <clerk session token>`) vive en `entities/user/api/client.ts` y es **el cliente HTTP que todos deben reusar** para llamar al backend — no crear otro `fetch` suelto por feature. Se importa así:

```ts
import { apiClient } from "@/entities/user";

apiClient.post("/missions/123/complete", {...})
```

- Hook `useCurrentUser()` (wrapper sobre `useUser()` de Clerk + nuestro `/users/me`) para leer perfil/xp/level en cualquier screen.

### 4.5 Variables de entorno que necesitan

```
# apps/api/.env
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# apps/mobile/.env
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

Yo las voy a documentar en `.env.example` de cada app. Pídanme la key de dev de Clerk cuando empiecen a probar auth end-to-end (no hace falta para desarrollar contra el modo `AUTH_DEV_BYPASS`).

---

## 5. Reglas de integración entre módulos 2 y 3

- Backend: si el módulo 3 necesita saber si una `mission_completion` existe (para `photos.mission_completion_id`), importa el modelo `MissionCompletion` del módulo 2 (`from app.missions.models import MissionCompletion`), no duplica la tabla.
- Mobile: mismo patrón — `entities/mission` puede ser importado por `entities/photo` si hace falta el tipo, pero nunca al revés de features a features de otro dominio; todo pasa por `entities/`.
- Cualquier tabla nueva no listada en el ERD (ej. índices de soporte, tablas de unión) se documenta en el PR que la introduce.

---

## 6. Migraciones (Alembic) — cómo no chocar

Con 3 personas escribiendo modelos en paralelo, Alembic genera múltiples heads si no coordinan:

1. Cada quien trabaja en su rama (`feature/users-clerk`, `feature/wellness-missions`, `feature/social-groups`).
2. Antes de correr `alembic revision --autogenerate`, hacer `git pull origin main` y `alembic upgrade head` localmente para partir del último head real.
3. El merge a `main` se hace uno a la vez (avisar en el grupo "voy a mergear"), así el siguiente en mergear rebasa sobre la migración recién agregada y su `autogenerate` genera una sola cadena lineal.
4. Si dos PRs se abren casi al mismo tiempo y terminan con heads divergentes, quien mergea segundo corre `alembic merge heads` antes de subir su PR.

---

## 7. Secuencia sugerida

**Día 0-1 (yo, Módulo 1):**
- Modelo `User` + tabla + migración inicial.
- `get_current_user` en modo `AUTH_DEV_BYPASS` (para no bloquearlos).
- `apiClient` mobile + `ClerkProvider` (aunque sea con Clerk en modo test).
- Aviso en el grupo cuando esto esté en `main` — **a partir de ahí arrancan sus migraciones**, porque van a tener FK a `users.id`.

**Semana 1 (los 3 en paralelo):**
- Módulo 2 y 3: modelos + migraciones + CRUD básico + tests de sus dominios contra `AUTH_DEV_BYPASS`.
- Yo termino la verificación real de JWT de Clerk + webhook de sync.

**Semana 2:**
- Integración end-to-end: apago `AUTH_DEV_BYPASS`, todos prueban con Clerk real.
- Conectar mobile screens que cruzan dominios (ej. pantalla de grupo que muestra fotos + reacciones + racha).

## 8. Definition of Done por módulo

- [ ] Modelos SQLModel + migración Alembic aplicada limpiamente sobre `main`.
- [ ] Router con prefijo `/api/v1/<domain>`, registrado en `app/main.py`.
- [ ] Todas las rutas autenticadas usan `Depends(get_current_user)`.
- [ ] `src/entities/<domain>/index.ts` expone tipos + funciones de API usando `apiClient` de `entities/user`.
- [ ] README corto en la carpeta del dominio (2-3 líneas) si algo no es obvio.
- [ ] Sin imports cruzados entre `features/` de distintos dominios.

---

**Siguiente paso:** compartir este archivo con el equipo, confirmar los 5 puntos de §3, y yo abro `feature/users-clerk` hoy mismo.
