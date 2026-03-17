from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import logging
import traceback
import os

from app.database import init_db
from app.routers import datasources, query, ai, settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up - initializing database...")
    await init_db()
    logger.info("Database initialized.")
    yield
    logger.info("Shutting down.")


app = FastAPI(
    title="AI-DatabaseQuery API",
    description="基于 DeepSeek 的自然语言数据库查询平台",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(datasources.router)
app.include_router(query.router)
app.include_router(ai.router)
app.include_router(settings.router)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "traceback": traceback.format_exc()},
    )


# 挂载前端静态文件（放在所有路由之后）
_STATIC_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "web")
_STATIC_DIR = os.path.normpath(_STATIC_DIR)

if os.path.isdir(_STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(_STATIC_DIR, "assets")), name="assets")

    @app.get("/vite.svg")
    async def vite_svg():
        return FileResponse(os.path.join(_STATIC_DIR, "vite.svg"))

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """SPA 回退：所有非 API 路径均返回 index.html"""
        index = os.path.join(_STATIC_DIR, "index.html")
        return FileResponse(index)
