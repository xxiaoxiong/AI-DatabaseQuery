from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


class NL2SQLRequest(BaseModel):
    datasource_id: int
    question: str = Field(..., min_length=1)
    conversation_history: Optional[list[dict]] = None


class NL2SQLResponse(BaseModel):
    sql: Optional[str]
    explanation: str
    clarification: Optional[str]
    chart_suggestion: str
    confidence: float


class ExecuteQueryRequest(BaseModel):
    datasource_id: int
    sql: str
    natural_language: Optional[str] = None
    chart_type: Optional[str] = None
    save_history: bool = True


class ExecuteQueryResponse(BaseModel):
    success: bool
    error: Optional[str]
    columns: list[str]
    rows: list[dict]
    row_count: int
    execution_time_ms: int
    ai_summary: Optional[str] = None
    chart_type: Optional[str] = None
    history_id: Optional[int] = None


class QueryHistoryResponse(BaseModel):
    id: int
    datasource_id: Optional[int]
    natural_language: str
    generated_sql: Optional[str]
    executed_sql: Optional[str]
    row_count: Optional[int]
    execution_time_ms: Optional[int]
    status: str
    error_message: Optional[str]
    ai_summary: Optional[str]
    chart_type: Optional[str]
    is_favorite: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class AnalyzeRequest(BaseModel):
    question: str
    sql: str
    columns: list[str]
    rows: list[dict]


class ExportRequest(BaseModel):
    history_id: int
    format: str = Field(..., pattern="^(excel|csv)$")  # excel 或 csv


class QueryFavoriteResponse(BaseModel):
    id: int
    datasource_id: Optional[int]
    natural_language: str
    generated_sql: Optional[str]
    tags: Optional[str]
    description: Optional[str]
    execute_count: int
    last_executed_at: Optional[datetime]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class CreateFavoriteRequest(BaseModel):
    datasource_id: int
    natural_language: str
    generated_sql: Optional[str] = None
    tags: Optional[str] = None
    description: Optional[str] = None


class UpdateFavoriteRequest(BaseModel):
    tags: Optional[str] = None
    description: Optional[str] = None
    natural_language: Optional[str] = None
    generated_sql: Optional[str] = None


class SearchFavoritesRequest(BaseModel):
    keyword: Optional[str] = None
    tags: Optional[list[str]] = None
    datasource_id: Optional[int] = None
    limit: int = 50
    offset: int = 0
