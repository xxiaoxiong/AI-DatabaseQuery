from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Float
from sqlalchemy.sql import func
from app.database import Base


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    datasource_id = Column(Integer, ForeignKey("datasources.id"), nullable=True)
    natural_language = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    executed_sql = Column(Text, nullable=True)
    row_count = Column(Integer, nullable=True)
    execution_time_ms = Column(Integer, nullable=True)
    status = Column(String(20), default="success")  # success, error
    error_message = Column(Text, nullable=True)
    ai_summary = Column(Text, nullable=True)
    chart_type = Column(String(50), nullable=True)
    is_favorite = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
