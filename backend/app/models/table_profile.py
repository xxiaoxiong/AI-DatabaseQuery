from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base


class TableProfile(Base):
    __tablename__ = "table_profiles"

    id = Column(Integer, primary_key=True, index=True)
    datasource_id = Column(Integer, ForeignKey("datasources.id"), nullable=False)
    table_name = Column(String(255), nullable=False)
    table_description = Column(Text, nullable=True)  # AI 生成的表描述
    business_meaning = Column(Text, nullable=True)  # 业务含义
    field_descriptions = Column(Text, nullable=True)  # JSON 格式的字段描述
    related_tables = Column(Text, nullable=True)  # JSON 格式的相关表
    user_notes = Column(Text, nullable=True)  # 用户手动标注
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint('datasource_id', 'table_name', name='uix_datasource_table'),
    )

