"""Application configuration, loaded from environment variables / .env."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "bloomley-api"
    environment: str = "development"

    database_url: str = (
        "postgresql+asyncpg://bloomley:bloomley@localhost:5433/bloomley"
    )

    cors_origins: list[str] = ["*"]

    # Clerk auth
    auth_dev_bypass: bool = True
    """Dev-only escape hatch: when true, `get_current_user` trusts an
    `X-Debug-User-Id` header instead of verifying a Clerk JWT. Lets other
    modules build against the real dependency before Clerk is fully wired.
    Must be false in any deployed environment."""
    clerk_secret_key: str = ""
    clerk_webhook_secret: str = ""
    clerk_jwks_url: str = ""
    clerk_backend_api_url: str = "https://api.clerk.com"


@lru_cache
def get_settings() -> Settings:
    return Settings()
