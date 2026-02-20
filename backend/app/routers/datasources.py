from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.datasource import DataSourceCreate, DataSourceUpdate, DataSourceResponse
from app.services import datasource_service, profile_service

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
