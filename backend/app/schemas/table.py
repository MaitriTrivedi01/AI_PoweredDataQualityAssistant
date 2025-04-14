from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, field_validator, validator, Field
from datetime import datetime

class TableBase(BaseModel):
    name: str
    schema: str
    description: Optional[str] = None
    database_id: int

class TableCreate(TableBase):
    columns: Optional[List[Dict[str, Any]]] = []

class TableImport(BaseModel):
    database_id: int
    table_name: str
    schema: str = "public"
    description: Optional[str] = None

class TableResponse(TableBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    columns: Optional[Union[List[Dict[str, Any]], Dict[str, Any]]] = None
    
    @field_validator('columns', mode='before')
    @classmethod
    def validate_columns(cls, v):
        """Validate columns field to accept either list or dict format"""
        if v is None:
            return []
        return v
    
    class Config:
        from_attributes = True 