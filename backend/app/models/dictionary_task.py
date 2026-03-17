from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class DictionaryTask(Base):
    __tablename__ = "dictionary_tasks"

    id = Column(Integer, primary_key=True, index=True)
    datasource_id = Column(Integer, ForeignKey("datasources.id"), nullable=False)
    task_name = Column(String(255), nullable=False)
    status = Column(String(20), default="pending")  # pending, processing, completed, failed
    format = Column(String(20), default="markdown")  # markdown, pdf, html
    include_examples = Column(Integer, default=1)  # 是否包含示例查询
    include_relations = Column(Integer, default=1)  # 是否包含关系图
    file_path = Column(Text, nullable=True)  # 生成的文件路径
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)

