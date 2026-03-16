from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import event
from app.config import settings


# SQLite 特殊配置
engine_kwargs = {
    "echo": settings.DEBUG,
    "pool_pre_ping": True,
    "pool_recycle": 3600,
}

# 如果使用 SQLite，添加额外配置
if "sqlite" in settings.SYSTEM_DB_URL:
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_async_engine(settings.SYSTEM_DB_URL, **engine_kwargs)

# SQLite 外键支持
@event.listens_for(engine.sync_engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    if "sqlite" in settings.SYSTEM_DB_URL:
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
