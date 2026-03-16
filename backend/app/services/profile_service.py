from sqlalchemy import text
from app.models.datasource import DataSource
import logging

logger = logging.getLogger(__name__)

NUMERIC_TYPES = {"int", "integer", "bigint", "smallint", "tinyint", "float", "double",
                 "decimal", "numeric", "real", "number", "money", "mediumint"}
TIME_TYPES = {"date", "datetime", "timestamp", "time", "year",
              "timestamptz", "timestamp with time zone", "timestamp without time zone"}
TEXT_TYPES = {"varchar", "char", "text", "longtext", "mediumtext", "tinytext",
              "character varying", "character", "nvarchar", "nchar", "string"}


def _build_connection_url(ds: DataSource, plain_password: str) -> str:
    if ds.db_type == "mysql":
        return f"mysql+aiomysql://{ds.username}:{plain_password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type == "postgresql":
        return f"postgresql+asyncpg://{ds.username}:{plain_password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type == "sqlite":
        return f"sqlite+aiosqlite:///{ds.database_name}"
    raise ValueError(f"Unsupported db_type: {ds.db_type}")


def _classify_col(col_name: str, col_type: str) -> str:
    t = col_type.lower().split("(")[0].strip()
    if t in NUMERIC_TYPES:
        return "numeric"
    if t in TIME_TYPES:
        return "time"
    col_lower = col_name.lower()
    if any(kw in col_lower for kw in ["date", "time", "created", "updated", "at"]):
        return "time"
    if t in TEXT_TYPES:
        return "text"
    return "other"


async def get_table_profile(ds: DataSource, table_name: str) -> dict:
    from sqlalchemy.ext.asyncio import create_async_engine
    url = _build_connection_url(ds, ds.password or "")
    engine = create_async_engine(url)

    result = {
        "table_name": table_name,
        "total_rows": 0,
        "columns": [],
        "time_columns": [],
    }

    try:
        async with engine.connect() as conn:
            # 总行数
            row_count_result = await conn.execute(text(f"SELECT COUNT(*) FROM `{table_name}`" if ds.db_type == "mysql"
                                                       else f'SELECT COUNT(*) FROM "{table_name}"' if ds.db_type == "postgresql"
                                                       else f"SELECT COUNT(*) FROM [{table_name}]"))
            result["total_rows"] = row_count_result.scalar() or 0

            # 获取列信息
            columns_info = await _get_columns_info(conn, ds, table_name)

            col_stats = []
            time_cols = []

            for col in columns_info:
                col_name = col["name"]
                col_type = col["type"]
                kind = _classify_col(col_name, col_type)

                stat = {
                    "name": col_name,
                    "type": col_type,
                    "kind": kind,
                    "comment": col.get("comment", ""),
                }

                q = _quote_identifier(col_name, ds.db_type)
                tq = _quote_table(table_name, ds.db_type)

                if kind == "numeric":
                    try:
                        r = await conn.execute(text(
                            f"SELECT MIN({q}), MAX({q}), AVG({q}), SUM({q}), "
                            f"COUNT({q}), COUNT(*) - COUNT({q}) FROM {tq}"
                        ))
                        row = r.fetchone()
                        stat.update({
                            "min": _safe_float(row[0]),
                            "max": _safe_float(row[1]),
                            "avg": round(float(row[2]), 4) if row[2] is not None else None,
                            "sum": _safe_float(row[3]),
                            "non_null_count": int(row[4]) if row[4] is not None else 0,
                            "null_count": int(row[5]) if row[5] is not None else 0,
                        })
                    except Exception as e:
                        logger.warning(f"Numeric stat failed for {col_name}: {e}")

                elif kind == "text":
                    try:
                        r = await conn.execute(text(
                            f"SELECT COUNT(DISTINCT {q}), COUNT(*) - COUNT({q}) FROM {tq}"
                        ))
                        row = r.fetchone()
                        stat.update({
                            "distinct_count": int(row[0]) if row[0] is not None else 0,
                            "null_count": int(row[1]) if row[1] is not None else 0,
                        })
                        # TOP 5 频次
                        top_sql = _top_values_sql(q, tq, ds.db_type)
                        top_r = await conn.execute(text(top_sql))
                        stat["top_values"] = [
                            {"value": str(r[0]), "count": int(r[1])}
                            for r in top_r.fetchall() if r[0] is not None
                        ]
                    except Exception as e:
                        logger.warning(f"Text stat failed for {col_name}: {e}")

                elif kind == "time":
                    try:
                        r = await conn.execute(text(
                            f"SELECT MIN({q}), MAX({q}), COUNT(*) - COUNT({q}) FROM {tq}"
                        ))
                        row = r.fetchone()
                        stat.update({
                            "min": str(row[0]) if row[0] is not None else None,
                            "max": str(row[1]) if row[1] is not None else None,
                            "null_count": int(row[2]) if row[2] is not None else 0,
                        })
                        time_cols.append(col_name)
                    except Exception as e:
                        logger.warning(f"Time stat failed for {col_name}: {e}")

                col_stats.append(stat)

            result["columns"] = col_stats
            result["time_columns"] = time_cols

    finally:
        await engine.dispose()

    return result


async def get_table_trend(ds: DataSource, table_name: str, time_col: str, days: int = 30) -> dict:
    from sqlalchemy.ext.asyncio import create_async_engine
    url = _build_connection_url(ds, ds.password or "")
    engine = create_async_engine(url)

    result = {"time_col": time_col, "days": days, "data": []}

    try:
        async with engine.connect() as conn:
            tq = _quote_table(table_name, ds.db_type)
            q = _quote_identifier(time_col, ds.db_type)
            trend_sql = _trend_sql(q, tq, ds.db_type, days)
            r = await conn.execute(text(trend_sql))
            result["data"] = [
                {"date": str(row[0]), "count": int(row[1])}
                for row in r.fetchall()
            ]
    finally:
        await engine.dispose()

    return result


# ── helpers ──────────────────────────────────────────────────────────────────

def _quote_identifier(name: str, db_type: str) -> str:
    if db_type == "mysql":
        return f"`{name}`"
    return f'"{name}"'


def _quote_table(name: str, db_type: str) -> str:
    if db_type == "mysql":
        return f"`{name}`"
    return f'"{name}"'


def _safe_float(val):
    try:
        return float(val) if val is not None else None
    except Exception:
        return None


def _top_values_sql(q: str, tq: str, db_type: str) -> str:
    if db_type in ("mysql", "sqlite"):
        return f"SELECT {q}, COUNT(*) as cnt FROM {tq} WHERE {q} IS NOT NULL GROUP BY {q} ORDER BY cnt DESC LIMIT 5"
    return f"SELECT {q}, COUNT(*) as cnt FROM {tq} WHERE {q} IS NOT NULL GROUP BY {q} ORDER BY cnt DESC LIMIT 5"


def _trend_sql(q: str, tq: str, db_type: str, days: int) -> str:
    if db_type == "mysql":
        return (
            f"SELECT DATE({q}) as day, COUNT(*) as cnt FROM {tq} "
            f"WHERE {q} >= DATE_SUB(CURDATE(), INTERVAL {days} DAY) "
            f"GROUP BY DATE({q}) ORDER BY day"
        )
    elif db_type == "postgresql":
        return (
            f"SELECT DATE({q}) as day, COUNT(*) as cnt FROM {tq} "
            f"WHERE {q} >= CURRENT_DATE - INTERVAL '{days} days' "
            f"GROUP BY DATE({q}) ORDER BY day"
        )
    else:  # sqlite
        return (
            f"SELECT DATE({q}) as day, COUNT(*) as cnt FROM {tq} "
            f"WHERE {q} >= DATE('now', '-{days} days') "
            f"GROUP BY DATE({q}) ORDER BY day"
        )


async def _get_columns_info(conn, ds: DataSource, table_name: str) -> list[dict]:
    if ds.db_type == "mysql":
        r = await conn.execute(text(
            "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_COMMENT FROM information_schema.COLUMNS "
            "WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl ORDER BY ORDINAL_POSITION"
        ), {"db": ds.database_name, "tbl": table_name})
        return [{"name": row[0], "type": row[1], "comment": row[2]} for row in r.fetchall()]
    elif ds.db_type == "postgresql":
        r = await conn.execute(text(
            "SELECT column_name, data_type FROM information_schema.columns "
            "WHERE table_schema='public' AND table_name=:tbl ORDER BY ordinal_position"
        ), {"tbl": table_name})
        return [{"name": row[0], "type": row[1], "comment": ""} for row in r.fetchall()]
    else:  # sqlite
        r = await conn.execute(text(f"PRAGMA table_info({table_name})"))
        return [{"name": row[1], "type": row[2], "comment": ""} for row in r.fetchall()]
