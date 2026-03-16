from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI-DatabaseQuery"
    DEBUG: bool = False

    # System DB (MySQL)
    SYSTEM_DB_URL: str = "mysql+aiomysql://root:123456@localhost:3306/ai_dbquery"

    # LLM
    LLM_BASE_URL: str = "https://api.deepseek.com"
    LLM_API_KEY: str = "sk-931f58aff9d4402d8eae4ff0fca72b47"
    LLM_MODEL: str = "deepseek-chat"
    LLM_TIMEOUT: int = 60

    # Query limits
    QUERY_TIMEOUT: int = 30
    QUERY_MAX_ROWS: int = 10000

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # 忽略额外的环境变量


settings = Settings()
