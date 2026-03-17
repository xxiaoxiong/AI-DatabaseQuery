from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime


class TableProfileResponse(BaseModel):
    id: int
    datasource_id: int
    table_name: str
    table_description: Optional[str]
    business_meaning: Optional[str]
    field_descriptions: Optional[str]  # JSON string
    related_tables: Optional[str]  # JSON string
    user_notes: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class UpdateTableProfileRequest(BaseModel):
    user_notes: Optional[str] = None

