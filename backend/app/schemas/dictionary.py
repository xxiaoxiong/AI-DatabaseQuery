from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class DictionaryTaskResponse(BaseModel):
    id: int
    datasource_id: int
    task_name: str
    status: str
    format: str
    include_examples: int
    include_relations: int
    file_path: Optional[str]
    error_message: Optional[str]
    created_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class CreateDictionaryTaskRequest(BaseModel):
    task_name: str
    format: str = "markdown"  # markdown, pdf, html
    include_examples: bool = True
    include_relations: bool = True

