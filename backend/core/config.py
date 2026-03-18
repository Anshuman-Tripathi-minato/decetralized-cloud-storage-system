from pydantic_settings import BaseSettings
from typing import List
from pydantic import Field, AliasChoices


class Settings(BaseSettings):
    MONGO_URI: str = Field(
        default="mongodb://localhost:27017",
        validation_alias=AliasChoices("MONGO_URI", "MONGODB_URI", "MONGO_URL", "DATABASE_URL"),
    )
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

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
