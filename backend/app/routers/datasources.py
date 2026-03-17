from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
import os
from app.database import get_db
from app.schemas.datasource import DataSourceCreate, DataSourceUpdate, DataSourceResponse
from app.schemas.table_profile import TableProfileResponse, UpdateTableProfileRequest
from app.schemas.dictionary import DictionaryTaskResponse, CreateDictionaryTaskRequest
from app.services import datasource_service, profile_service, table_profile_service, dictionary_service

router = APIRouter(prefix="/api/datasources", tags=["datasources"])


@router.post("", response_model=DataSourceResponse)
async def create_datasource(data: DataSourceCreate, db: AsyncSession = Depends(get_db)):
    return await datasource_service.create_datasource(db, data)


@router.get("", response_model=list[DataSourceResponse])
async def list_datasources(db: AsyncSession = Depends(get_db)):
    return await datasource_service.get_datasources(db)


@router.get("/{ds_id}", response_model=DataSourceResponse)
async def get_datasource(ds_id: int, db: AsyncSession = Depends(get_db)):
    ds = await datasource_service.get_datasource(db, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return ds


@router.put("/{ds_id}", response_model=DataSourceResponse)
async def update_datasource(ds_id: int, data: DataSourceUpdate, db: AsyncSession = Depends(get_db)):
    ds = await datasource_service.update_datasource(db, ds_id, data)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return ds


@router.delete("/{ds_id}")
async def delete_datasource(ds_id: int, db: AsyncSession = Depends(get_db)):
    ok = await datasource_service.delete_datasource(db, ds_id)
    if not ok:
        raise HTTPException(status_code=404, detail="数据源不存在")
    return {"message": "删除成功"}


@router.post("/{ds_id}/test")
async def test_connection(ds_id: int, db: AsyncSession = Depends(get_db)):
    ds = await datasource_service.get_datasource(db, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    result = await datasource_service.test_connection(ds)
    return result


@router.get("/{ds_id}/schema")
async def get_schema(ds_id: int, db: AsyncSession = Depends(get_db)):
    ds = await datasource_service.get_datasource(db, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    try:
        schema = await datasource_service.get_schema(ds)
        return {"schema": schema}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ds_id}/tables/{table_name}/profile")
async def get_table_profile(ds_id: int, table_name: str, db: AsyncSession = Depends(get_db)):
    ds = await datasource_service.get_datasource(db, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    try:
        profile = await profile_service.get_table_profile(ds, table_name)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ds_id}/tables/{table_name}/trend")
async def get_table_trend(
    ds_id: int,
    table_name: str,
    time_col: str = Query(..., description="时间列名"),
    days: int = Query(30, description="最近天数，7 或 30"),
    db: AsyncSession = Depends(get_db),
):
    ds = await datasource_service.get_datasource(db, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")
    try:
        trend = await profile_service.get_table_trend(ds, table_name, time_col, days)
        return trend
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{ds_id}/tables/{table_name}/ai-profile", response_model=TableProfileResponse)
async def get_ai_table_profile(
    ds_id: int,
    table_name: str,
    db: AsyncSession = Depends(get_db),
):
    """获取表的 AI 解读"""
    ds = await datasource_service.get_datasource(db, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")

    try:
        schema = await datasource_service.get_schema(ds)
        # 从 schema 字典中获取对应表的信息
        if table_name not in schema:
            raise HTTPException(status_code=404, detail="表不存在")

        table_schema = schema[table_name]

        profile = await table_profile_service.get_or_create_table_profile(
            db, ds_id, table_name, table_schema
        )
        return profile
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{ds_id}/tables/{table_name}/ai-profile", response_model=TableProfileResponse)
async def update_ai_table_profile(
    ds_id: int,
    table_name: str,
    req: UpdateTableProfileRequest,
    db: AsyncSession = Depends(get_db),
):
    """更新表的 AI 解读（用户标注）"""
    profile = await table_profile_service.get_table_profile(db, ds_id, table_name)
    if not profile:
        raise HTTPException(status_code=404, detail="表解读不存在")

    updated = await table_profile_service.update_table_profile(
        db, profile.id, user_notes=req.user_notes
    )
    return updated


@router.post("/{ds_id}/generate-dictionary", response_model=DictionaryTaskResponse)
async def generate_dictionary(
    ds_id: int,
    req: CreateDictionaryTaskRequest,
    db: AsyncSession = Depends(get_db),
):
    """生成数据字典"""
    ds = await datasource_service.get_datasource(db, ds_id)
    if not ds:
        raise HTTPException(status_code=404, detail="数据源不存在")

    # 创建任务
    task = await dictionary_service.create_dictionary_task(
        db=db,
        datasource_id=ds_id,
        task_name=req.task_name,
        format=req.format,
        include_examples=req.include_examples,
        include_relations=req.include_relations,
    )

    # 异步生成字典（这里简化处理，实际应该用后台任务队列）
    try:
        await dictionary_service.update_task_status(db, task.id, "processing")

        if req.format == "markdown":
            content = await dictionary_service.generate_markdown_dictionary(
                db, ds, req.include_examples, req.include_relations
            )
            file_ext = "md"
        elif req.format == "html":
            content = await dictionary_service.generate_html_dictionary(
                db, ds, req.include_examples, req.include_relations
            )
            file_ext = "html"
        else:
            raise ValueError(f"不支持的格式: {req.format}")

        # 保存文件
        import tempfile
        temp_dir = tempfile.gettempdir()
        file_path = f"{temp_dir}/dictionary_{task.id}.{file_ext}"
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)

        await dictionary_service.update_task_status(db, task.id, "completed", file_path=file_path)
    except Exception as e:
        await dictionary_service.update_task_status(db, task.id, "failed", error_message=str(e))
        raise HTTPException(status_code=500, detail=f"生成失败: {str(e)}")

    # 重新获取任务
    task = await dictionary_service.get_task(db, task.id)
    return task


@router.get("/{ds_id}/dictionary-task/{task_id}", response_model=DictionaryTaskResponse)
async def get_dictionary_task(
    ds_id: int,
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取数据字典生成任务状态"""
    task = await dictionary_service.get_task(db, task_id)
    if not task or task.datasource_id != ds_id:
        raise HTTPException(status_code=404, detail="任务不存在")
    return task


@router.get("/{ds_id}/dictionary-download/{task_id}")
async def download_dictionary(
    ds_id: int,
    task_id: int,
    db: AsyncSession = Depends(get_db),
):
    """下载数据字典文件"""
    from fastapi.responses import FileResponse
    
    task = await dictionary_service.get_task(db, task_id)
    if not task or task.datasource_id != ds_id:
        raise HTTPException(status_code=404, detail="任务不存在")

    if task.status != "completed" or not task.file_path:
        raise HTTPException(status_code=400, detail="文件未生成或生成失败")

    if not os.path.exists(task.file_path):
        raise HTTPException(status_code=404, detail="文件不存在")

    file_ext = task.format
    filename = f"数据字典_{task.task_name}.{file_ext}"

    return FileResponse(
        task.file_path,
        media_type="application/octet-stream",
        filename=filename,
    )
