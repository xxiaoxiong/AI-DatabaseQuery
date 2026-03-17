from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class QueryFavorite(Base):
    __tablename__ = "query_favorites"

    id = Column(Integer, primary_key=True, index=True)
    datasource_id = Column(Integer, ForeignKey("datasources.id"), nullable=True)
    natural_language = Column(Text, nullable=False)
    generated_sql = Column(Text, nullable=True)
    tags = Column(String(500), nullable=True)  # 逗号分隔的标签
    description = Column(Text, nullable=True)  # 用户备注
    execute_count = Column(Integer, default=0)  # 执行次数
    last_executed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

