"""Application configuration, loaded from environment variables / .env."""

from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "bloomley-api"
    environment: str = "development"

    database_url: str = (
        "postgresql+asyncpg://bloomley:bloomley@localhost:5432/bloomley"
    )

    cors_origins: list[str] = ["*"]

    # Clerk auth
    auth_dev_bypass: bool = True
    """Dev-only escape hatch: when true, `get_current_user` trusts an
    `X-Debug-User-Id` header instead of verifying a Clerk JWT. Lets other
    modules build against the real dependency before Clerk is fully wired.
    Must be false in any deployed environment -- enforced below, not just
    documented, since a docstring doesn't stop a misconfigured deploy."""
    clerk_secret_key: str = ""
    clerk_webhook_secret: str = ""
    clerk_jwks_url: str = ""
    clerk_backend_api_url: str = "https://api.clerk.com"

    @model_validator(mode="after")
    def _forbid_dev_bypass_outside_development(self) -> "Settings":
        if self.environment != "development" and self.auth_dev_bypass:
            raise ValueError(
                "AUTH_DEV_BYPASS=true is not allowed when ENVIRONMENT != "
                f"'development' (got ENVIRONMENT={self.environment!r}). Set "
                "AUTH_DEV_BYPASS=false for any deployed environment."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
