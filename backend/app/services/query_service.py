from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import time
import asyncio

from app.models.datasource import DataSource
from app.models.query_history import QueryHistory
from app.services.sql_security import validate_sql
from app.config import settings


def _build_connection_url(ds: DataSource, plain_password: str) -> str:
    if ds.db_type == "mysql":
        return f"mysql+aiomysql://{ds.username}:{plain_password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type == "postgresql":
        return f"postgresql+asyncpg://{ds.username}:{plain_password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type == "sqlite":
        return f"sqlite+aiosqlite:///{ds.database_name}"
    raise ValueError(f"Unsupported db_type: {ds.db_type}")


async def execute_query(ds: DataSource, sql: str) -> dict:
    validation = validate_sql(sql)
    if not validation["valid"]:
        return {
            "success": False,
            "error": validation["reason"],
            "columns": [],
            "rows": [],
            "row_count": 0,
            "execution_time_ms": 0,
        }

    url = _build_connection_url(ds, ds.password or "")
    engine = create_async_engine(url, pool_pre_ping=True)

    start = time.time()
    try:
        async with engine.connect() as conn:
            result = await asyncio.wait_for(
                conn.execute(text(sql)),
                timeout=settings.QUERY_TIMEOUT,
            )
            columns = list(result.keys())
            rows = result.fetchmany(settings.QUERY_MAX_ROWS)
            rows_data = [dict(zip(columns, row)) for row in rows]
            elapsed_ms = int((time.time() - start) * 1000)
            return {
                "success": True,
                "error": None,
                "columns": columns,
                "rows": rows_data,
                "row_count": len(rows_data),
                "execution_time_ms": elapsed_ms,
            }
    except asyncio.TimeoutError:
        return {
            "success": False,
            "error": f"查询超时（超过 {settings.QUERY_TIMEOUT} 秒）",
            "columns": [],
            "rows": [],
            "row_count": 0,
            "execution_time_ms": int((time.time() - start) * 1000),
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "columns": [],
            "rows": [],
            "row_count": 0,
            "execution_time_ms": int((time.time() - start) * 1000),
        }
    finally:
        await engine.dispose()


async def save_history(
    db: AsyncSession,
    datasource_id: Optional[int],
    natural_language: str,
    generated_sql: Optional[str],
    executed_sql: Optional[str],
    result: dict,
    ai_summary: Optional[str] = None,
    chart_type: Optional[str] = None,
) -> QueryHistory:
    history = QueryHistory(
        datasource_id=datasource_id,
        natural_language=natural_language,
        generated_sql=generated_sql,
        executed_sql=executed_sql,
        row_count=result.get("row_count"),
        execution_time_ms=result.get("execution_time_ms"),
        status="success" if result.get("success") else "error",
        error_message=result.get("error"),
        ai_summary=ai_summary,
        chart_type=chart_type,
    )
    db.add(history)
    await db.commit()
    await db.refresh(history)
    return history
