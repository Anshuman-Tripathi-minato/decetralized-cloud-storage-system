import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
from pydantic import Field, AliasChoices


def _first_non_empty_env(*keys: str, default: str) -> str:
    """Return the first non-empty environment variable among keys."""
    for key in keys:
        value = os.getenv(key)
        if value and value.strip():
            # Handle values pasted with wrapping quotes in dashboard UIs.
            return value.strip().strip('"').strip("'")
    return default


class Settings(BaseSettings):
    MONGO_URI: str = Field(default_factory=lambda: _first_non_empty_env(
        "MONGO_URI", "MONGODB_URI", "MONGO_URL", "DATABASE_URL", default="mongodb://localhost:27017"
    ))
    DB_NAME: str = Field(
        default="decentrastore",
        validation_alias=AliasChoices("DB_NAME", "MONGO_DB_NAME", "MONGODB_DB"),
    )
    DOCKER_ENABLED: bool = Field(
        default=False,
        validation_alias=AliasChoices("DOCKER_ENABLED"),
    )
    JWT_SECRET: str = "decentrastore_jwt_secret_change_in_production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "DecentraAdmin@2026"
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"
    NODE_AGENT_DEFAULT_PORT: int = 8765
    NODE_AGENT_TIMEOUT_SEC: int = 10
    NODE_AGENT_SHARED_TOKEN: str = ""

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
