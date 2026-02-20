from fastapi import APIRouter, HTTPException
from app.schemas.query import AnalyzeRequest
from app.services import ai_analysis_service
from app.config import settings

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    result = await ai_analysis_service.analyze_data(
        question=req.question,
        sql=req.sql,
        columns=req.columns,
        rows=req.rows,
        llm_base_url=settings.LLM_BASE_URL,
        llm_api_key=settings.LLM_API_KEY,
    )
    return {"summary": result}
