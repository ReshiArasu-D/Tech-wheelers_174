"""
CO-NOWCAST Configuration Module
"""
import os
from pydantic_settings import BaseSettings

import os
from pydantic_settings import BaseSettings

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

class Settings(BaseSettings):
    APP_ENV: str = os.getenv("APP_ENV", "development")
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{os.path.join(BASE_DIR, 'co_nowcast.db')}")
    MODEL_DIR: str = os.getenv("MODEL_DIR", os.path.join(BASE_DIR, "models"))
    DATA_DIR: str = os.getenv("DATA_DIR", os.path.join(BASE_DIR, "data"))
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
