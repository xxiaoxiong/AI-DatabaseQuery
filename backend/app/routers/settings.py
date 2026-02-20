from fastapi import APIRouter
from app.schemas.settings import SettingsResponse, SettingsUpdate
from app.config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
async def get_settings():
    return SettingsResponse(
        llm_base_url=settings.LLM_BASE_URL,
        llm_model=settings.LLM_MODEL,
        llm_api_key_set=bool(settings.LLM_API_KEY),
    )


@router.put("")
async def update_settings(data: SettingsUpdate):
    if data.llm_base_url is not None:
        settings.LLM_BASE_URL = data.llm_base_url
    if data.llm_api_key is not None:
        settings.LLM_API_KEY = data.llm_api_key
    if data.llm_model is not None:
        settings.LLM_MODEL = data.llm_model
    return {"message": "设置已更新"}
