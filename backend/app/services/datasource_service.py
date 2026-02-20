from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.exc import SQLAlchemyError
from typing import Optional
import asyncio

from app.models.datasource import DataSource
from app.utils.encryption import encrypt_password, decrypt_password
from app.schemas.datasource import DataSourceCreate, DataSourceUpdate


async def create_datasource(db: AsyncSession, data: DataSourceCreate) -> DataSource:
    encrypted_pw = encrypt_password(data.password) if data.password else None
    ds = DataSource(
        name=data.name,
        db_type=data.db_type,
        host=data.host,
        port=data.port,
        username=data.username,
        password_encrypted=encrypted_pw,
        database_name=data.database_name,
        description=data.description,
    )
    db.add(ds)
    await db.commit()
    await db.refresh(ds)
    return ds


async def get_datasources(db: AsyncSession) -> list[DataSource]:
    result = await db.execute(select(DataSource).where(DataSource.is_active == True))
    return result.scalars().all()


async def get_datasource(db: AsyncSession, ds_id: int) -> Optional[DataSource]:
    result = await db.execute(select(DataSource).where(DataSource.id == ds_id))
    return result.scalar_one_or_none()


async def update_datasource(db: AsyncSession, ds_id: int, data: DataSourceUpdate) -> Optional[DataSource]:
    ds = await get_datasource(db, ds_id)
    if not ds:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "password" in update_data:
        pw = update_data.pop("password")
        if pw:
            ds.password_encrypted = encrypt_password(pw)
    for k, v in update_data.items():
        setattr(ds, k, v)
    await db.commit()
    await db.refresh(ds)
    return ds


async def delete_datasource(db: AsyncSession, ds_id: int) -> bool:
    ds = await get_datasource(db, ds_id)
    if not ds:
        return False
    ds.is_active = False
    await db.commit()
    return True


def _build_connection_url(ds: DataSource, plain_password: str) -> str:
    if ds.db_type == "mysql":
        return f"mysql+aiomysql://{ds.username}:{plain_password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type == "postgresql":
        return f"postgresql+asyncpg://{ds.username}:{plain_password}@{ds.host}:{ds.port}/{ds.database_name}"
    elif ds.db_type == "sqlite":
        return f"sqlite+aiosqlite:///{ds.database_name}"
    raise ValueError(f"Unsupported db_type: {ds.db_type}")


async def test_connection(ds: DataSource) -> dict:
    from sqlalchemy.ext.asyncio import create_async_engine
    plain_pw = decrypt_password(ds.password_encrypted) if ds.password_encrypted else ""
    url = _build_connection_url(ds, plain_pw)
    try:
        engine = create_async_engine(url, pool_pre_ping=True)
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        await engine.dispose()
        return {"success": True, "message": "连接成功"}
    except Exception as e:
        return {"success": False, "message": str(e)}


async def get_schema(ds: DataSource) -> dict:
    from sqlalchemy.ext.asyncio import create_async_engine
    plain_pw = decrypt_password(ds.password_encrypted) if ds.password_encrypted else ""
    url = _build_connection_url(ds, plain_pw)
    engine = create_async_engine(url)
    schema = {}
    try:
        async with engine.connect() as conn:
            if ds.db_type == "mysql":
                schema = await _get_mysql_schema(conn, ds.database_name)
            elif ds.db_type == "postgresql":
                schema = await _get_pg_schema(conn)
            elif ds.db_type == "sqlite":
                schema = await _get_sqlite_schema(conn)
    finally:
        await engine.dispose()
    return schema


async def _get_mysql_schema(conn, db_name: str) -> dict:
    tables_result = await conn.execute(
        text("SELECT TABLE_NAME, TABLE_COMMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA = :db"),
        {"db": db_name},
    )
    tables = tables_result.fetchall()
    schema = {}
    for table_name, table_comment in tables:
        cols_result = await conn.execute(
            text(
                "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_COMMENT, COLUMN_KEY "
                "FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = :db AND TABLE_NAME = :tbl ORDER BY ORDINAL_POSITION"
            ),
            {"db": db_name, "tbl": table_name},
        )
        columns = [
            {
                "name": row[0],
                "type": row[1],
                "nullable": row[2] == "YES",
                "comment": row[3],
                "key": row[4],
            }
            for row in cols_result.fetchall()
        ]
        schema[table_name] = {"comment": table_comment, "columns": columns}
    return schema


async def _get_pg_schema(conn) -> dict:
    tables_result = await conn.execute(
        text(
            "SELECT tablename FROM pg_tables WHERE schemaname = 'public'"
        )
    )
    tables = [row[0] for row in tables_result.fetchall()]
    schema = {}
    for table_name in tables:
        cols_result = await conn.execute(
            text(
                "SELECT column_name, data_type, is_nullable "
                "FROM information_schema.columns "
                "WHERE table_schema = 'public' AND table_name = :tbl ORDER BY ordinal_position"
            ),
            {"tbl": table_name},
        )
        columns = [
            {"name": row[0], "type": row[1], "nullable": row[2] == "YES", "comment": ""}
            for row in cols_result.fetchall()
        ]
        schema[table_name] = {"comment": "", "columns": columns}
    return schema


async def _get_sqlite_schema(conn) -> dict:
    tables_result = await conn.execute(
        text("SELECT name FROM sqlite_master WHERE type='table'")
    )
    tables = [row[0] for row in tables_result.fetchall()]
    schema = {}
    for table_name in tables:
        cols_result = await conn.execute(text(f"PRAGMA table_info({table_name})"))
        columns = [
            {"name": row[1], "type": row[2], "nullable": not row[3], "comment": ""}
            for row in cols_result.fetchall()
        ]
        schema[table_name] = {"comment": "", "columns": columns}
    return schema
