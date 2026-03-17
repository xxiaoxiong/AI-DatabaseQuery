from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.database import get_db
from app.schemas.query import (
    NL2SQLRequest, NL2SQLResponse,
    ExecuteQueryRequest, ExecuteQueryResponse,
    QueryHistoryResponse, AnalyzeRequest, ExportRequest,
    QueryFavoriteResponse, CreateFavoriteRequest, UpdateFavoriteRequest, SearchFavoritesRequest,
)
from app.services import datasource_service, query_service, nl2sql_service, ai_analysis_service, export_service, favorite_service
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


@router.post("/export")
async def export_query(req: ExportRequest, db: AsyncSession = Depends(get_db)):
    """导出查询结果为 Excel 或 CSV"""
    from fastapi.responses import FileResponse
    import tempfile
    
    result = await db.execute(
        select(QueryHistory).where(QueryHistory.id == req.history_id)
    )
    history = result.scalar_one_or_none()
    if not history:
        raise HTTPException(status_code=404, detail="查询记录不存在")

    # 重新执行查询获取完整数据
    ds = await datasource_service.get_datasource(db, history.datasource_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")

    query_result = await query_service.execute_query(ds, history.executed_sql)
    if not query_result["success"]:
        raise HTTPException(status_code=400, detail=f"查询执行失败: {query_result['error']}")

    # 生成导出文件
    if req.format == "excel":
        file_content = await export_service.export_to_excel(
            columns=query_result["columns"],
            rows=query_result["rows"],
            datasource_name=ds.name,
            question=history.natural_language,
            sql=history.executed_sql,
        )
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        filename = f"查询结果_{ds.name}_{history.id}.xlsx"
    else:  # csv
        file_content = await export_service.export_to_csv(
            columns=query_result["columns"],
            rows=query_result["rows"],
            datasource_name=ds.name,
            question=history.natural_language,
            sql=history.executed_sql,
        )
        media_type = "text/csv; charset=utf-8"
        filename = f"查询结果_{ds.name}_{history.id}.csv"

    # 保存到临时文件
    temp_dir = tempfile.gettempdir()
    temp_file = f"{temp_dir}/export_{history.id}_{req.format}"
    
    with open(temp_file, 'wb' if req.format == 'excel' else 'w', encoding=None if req.format == 'excel' else 'utf-8') as f:
        if req.format == 'excel':
            f.write(file_content)
        else:
            f.write(file_content.decode('utf-8') if isinstance(file_content, bytes) else file_content)
    
    return FileResponse(
        path=temp_file,
        media_type=media_type,
        filename=filename,
    )


@router.post("/favorites", response_model=QueryFavoriteResponse)
async def create_favorite(req: CreateFavoriteRequest, db: AsyncSession = Depends(get_db)):
    """创建收藏"""
    favorite = await favorite_service.create_favorite(
        db=db,
        datasource_id=req.datasource_id,
        natural_language=req.natural_language,
        generated_sql=req.generated_sql,
        tags=req.tags,
        description=req.description,
    )
    return favorite


@router.get("/favorites", response_model=list[QueryFavoriteResponse])
async def search_favorites(
    keyword: str = None,
    tags: str = None,
    datasource_id: int = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """搜索收藏"""
    tag_list = [t.strip() for t in tags.split(",")] if tags else None
    favorites, _ = await favorite_service.search_favorites(
        db=db,
        keyword=keyword,
        tags=tag_list,
        datasource_id=datasource_id,
        limit=limit,
        offset=offset,
    )
    return favorites


@router.put("/favorites/{favorite_id}", response_model=QueryFavoriteResponse)
async def update_favorite(
    favorite_id: int,
    req: UpdateFavoriteRequest,
    db: AsyncSession = Depends(get_db),
):
    """更新收藏"""
    favorite = await favorite_service.update_favorite(
        db=db,
        favorite_id=favorite_id,
        tags=req.tags,
        description=req.description,
        natural_language=req.natural_language,
        generated_sql=req.generated_sql,
    )
    if not favorite:
        raise HTTPException(status_code=404, detail="收藏不存在")
    return favorite


@router.delete("/favorites/{favorite_id}")
async def delete_favorite(favorite_id: int, db: AsyncSession = Depends(get_db)):
    """删除收藏"""
    success = await favorite_service.delete_favorite(db, favorite_id)
    if not success:
        raise HTTPException(status_code=404, detail="收藏不存在")
    return {"success": True}


@router.post("/favorites/{favorite_id}/execute", response_model=ExecuteQueryResponse)
async def execute_favorite(
    favorite_id: int,
    db: AsyncSession = Depends(get_db),
):
    """快速执行收藏查询"""
    favorite = await favorite_service.get_favorite(db, favorite_id)
    if not favorite:
        raise HTTPException(status_code=404, detail="收藏不存在")

    ds = await datasource_service.get_datasource(db, favorite.datasource_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")

    if not favorite.generated_sql:
        raise HTTPException(status_code=400, detail="收藏中没有 SQL")

    result = await query_service.execute_query(ds, favorite.generated_sql)

    ai_summary = None
    if result["success"] and result["rows"]:
        llm_cfg = _get_llm_settings()
        try:
            ai_summary = await ai_analysis_service.analyze_data(
                question=favorite.natural_language,
                sql=favorite.generated_sql,
                columns=result["columns"],
                rows=result["rows"],
                **llm_cfg,
            )
        except Exception:
            pass

    # 增加执行次数
    await favorite_service.increment_execute_count(db, favorite_id)

    return ExecuteQueryResponse(
        **result,
        ai_summary=ai_summary,
        chart_type=None,
        history_id=None,
    )
