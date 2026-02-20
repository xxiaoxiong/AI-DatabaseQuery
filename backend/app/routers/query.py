from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.schemas.query import (
    NL2SQLRequest, NL2SQLResponse,
    ExecuteQueryRequest, ExecuteQueryResponse,
    QueryHistoryResponse, AnalyzeRequest,
)
from app.services import datasource_service, query_service, nl2sql_service, ai_analysis_service
from app.models.query_history import QueryHistory
from app.config import settings

router = APIRouter(prefix="/api/query", tags=["query"])


def _get_llm_settings():
    return {
        "llm_base_url": settings.LLM_BASE_URL,
        "llm_api_key": settings.LLM_API_KEY,
    }


@router.post("/nl2sql", response_model=NL2SQLResponse)
async def nl2sql(req: NL2SQLRequest, db: AsyncSession = Depends(get_db)):
    ds = await datasource_service.get_datasource(db, req.datasource_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    try:
        schema = await datasource_service.get_schema(ds)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"获取 Schema 失败: {e}")

    llm_cfg = _get_llm_settings()
    result = await nl2sql_service.nl2sql(
        question=req.question,
        schema=schema,
        dialect=ds.db_type,
        conversation_history=req.conversation_history,
        **llm_cfg,
    )
    return result


@router.post("/execute", response_model=ExecuteQueryResponse)
async def execute_query(req: ExecuteQueryRequest, db: AsyncSession = Depends(get_db)):
    ds = await datasource_service.get_datasource(db, req.datasource_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")

    result = await query_service.execute_query(ds, req.sql)

    ai_summary = None
    chart_type = req.chart_type

    if result["success"] and result["rows"]:
        llm_cfg = _get_llm_settings()
        if req.natural_language:
            try:
                ai_summary = await ai_analysis_service.analyze_data(
                    question=req.natural_language,
                    sql=req.sql,
                    columns=result["columns"],
                    rows=result["rows"],
                    **llm_cfg,
                )
            except Exception:
                pass

        if not chart_type:
            chart_type = ai_analysis_service.recommend_chart_type(
                result["columns"], result["rows"]
            )

    history_id = None
    if req.save_history:
        history = await query_service.save_history(
            db=db,
            datasource_id=req.datasource_id,
            natural_language=req.natural_language or req.sql,
            generated_sql=req.sql,
            executed_sql=req.sql,
            result=result,
            ai_summary=ai_summary,
            chart_type=chart_type,
        )
        history_id = history.id

    return ExecuteQueryResponse(
        **result,
        ai_summary=ai_summary,
        chart_type=chart_type,
        history_id=history_id,
    )


@router.get("/history", response_model=list[QueryHistoryResponse])
async def get_history(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(QueryHistory)
        .order_by(desc(QueryHistory.created_at))
        .limit(limit)
        .offset(offset)
    )
    return result.scalars().all()


@router.put("/history/{history_id}/favorite")
async def toggle_favorite(history_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QueryHistory).where(QueryHistory.id == history_id)
    )
    history = result.scalar_one_or_none()
    if not history:
        raise HTTPException(status_code=404, detail="记录不存在")
    history.is_favorite = 0 if history.is_favorite else 1
    await db.commit()
    return {"is_favorite": history.is_favorite}
