from pydantic import BaseModel
from typing import Optional


class SettingsResponse(BaseModel):
    llm_base_url: str
    llm_model: str
    llm_api_key_set: bool


class SettingsUpdate(BaseModel):
    llm_base_url: Optional[str] = None
    llm_api_key: Optional[str] = None
    llm_model: Optional[str] = None
