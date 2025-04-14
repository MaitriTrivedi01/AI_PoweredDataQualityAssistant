from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Union
from ..core.database import get_db
from ..models.database import Table, Database
from sqlalchemy import inspect, text
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import List as PyList
import sqlalchemy as sa
from sqlalchemy.exc import SQLAlchemyError
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Column model to structure column data
class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: Optional[bool] = True
    default: Optional[str] = None
    primary_key: Optional[bool] = False

class TableSchema(BaseModel):
    name: str
    schema: Optional[dict] = None
    database_id: int
    description: Optional[str] = None

    class Config:
        from_attributes = True

class TableResponse(BaseModel):
    id: int
    name: str
    schema: Optional[str] = None
    description: Optional[str] = None
    database_id: int
    database_name: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    columns: Optional[Union[List[dict], dict]] = None  # Accept either list or dict
    row_count: Optional[int] = None

    class Config:
        from_attributes = True
        arbitrary_types_allowed = True
        
    @validator('columns', pre=True)
    def validate_columns(cls, v):
        # Allow either list or dict format
        if v is None:
            return v
        return v

router = APIRouter()

def normalize_columns(tables_data):
    """Normalize column data to ensure consistent format in response.
    This handles both array format and object format.
    """
    if isinstance(tables_data, list):
        for table in tables_data:
            _normalize_single_table_columns(table)
        return tables_data
    else:
        return _normalize_single_table_columns(tables_data)

def _normalize_single_table_columns(table):
    """Helper function to normalize columns for a single table."""
    if not table or not hasattr(table, 'columns'):
        return table
        
    # If columns don't exist or are None, set as empty dict
    if table.columns is None:
        table.columns = {}
    
    return table

@router.get("/", response_model=List[TableResponse])
def get_tables(
    database_id: Optional[int] = None,
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db)
):
    """
    Get all tables with optional filtering by database_id
    """
    try:
        query = db.query(Table)
        
        # Filter by database_id if provided
        if database_id is not None:
            query = query.filter(Table.database_id == database_id)
            
        tables = query.offset(skip).limit(limit).all()
        
        # Normalize column format for consistent frontend display
        tables = normalize_columns(tables)
        
        return tables
    except SQLAlchemyError as e:
        logger.error(f"Database error in get_tables: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error in get_tables: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")

@router.get("/{table_id}", response_model=TableResponse)
async def get_table(table_id: int, db: Session = Depends(get_db)):
    """Get a specific table by ID"""
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Get database name
    database = db.query(Database).filter(Database.id == table.database_id).first()
    database_name = database.name if database else None
    
    # Add database_name to response
    response = {
        **table.__dict__,
        "database_name": database_name
    }
    
    # Normalize column format
    normalize_columns(table)
    
    return response

@router.post("/", response_model=TableResponse)
async def create_table(table: TableSchema, db: Session = Depends(get_db)):
    """Create a new table"""
    # Check if the database exists
    database = db.query(Database).filter(Database.id == table.database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Database not found")
    
    # Check if the table already exists in this database
    existing_table = db.query(Table).filter(
        Table.name == table.name,
        Table.database_id == table.database_id
    ).first()
    
    if existing_table:
        raise HTTPException(status_code=400, detail="Table with this name already exists in the database")
    
    # Create new table
    db_table = Table(
        name=table.name,
        database_id=table.database_id,
        schema=table.schema,
        description=table.description
    )
    
    db.add(db_table)
    db.commit()
    db.refresh(db_table)
    
    # Add database_name to response
    response = {
        **db_table.__dict__,
        "database_name": database.name
    }
    
    return response

@router.put("/{table_id}", response_model=TableResponse)
async def update_table(table_id: int, table: TableSchema, db: Session = Depends(get_db)):
    """Update a table"""
    db_table = db.query(Table).filter(Table.id == table_id).first()
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Check if the database exists
    database = db.query(Database).filter(Database.id == table.database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Database not found")
    
    # Check for name conflict in the target database
    if db_table.name != table.name or db_table.database_id != table.database_id:
        existing = db.query(Table).filter(
            Table.name == table.name,
            Table.database_id == table.database_id,
            Table.id != table_id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="Table with this name already exists in the database")
    
    # Update fields
    db_table.name = table.name
    db_table.database_id = table.database_id
    db_table.schema = table.schema
    db_table.description = table.description
    db_table.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(db_table)
    
    # Add database_name to response
    response = {
        **db_table.__dict__,
        "database_name": database.name
    }
    
    return response

@router.delete("/{table_id}")
async def delete_table(table_id: int, db: Session = Depends(get_db)):
    """Delete a table"""
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    db.delete(table)
    db.commit()
    
    return {"message": "Table deleted successfully"}

@router.post("/refresh", response_model=List[TableResponse])
async def refresh_tables(db: Session = Depends(get_db)):
    """Refresh table metadata from database"""
    try:
        # Get database inspector
        inspector = inspect(db.get_bind())
        
        # Get all table names
        table_names = inspector.get_table_names()
        
        # Get schema for each table
        for table_name in table_names:
            # Skip our metadata tables
            if table_name in ['tables', 'rules', 'rule_results', 'validation_reports']:
                continue
                
            # Get column information
            columns = inspector.get_columns(table_name)
            primary_keys = inspector.get_pk_constraint(table_name)['constrained_columns']
            
            # Format columns info
            columns_info = {}
            
            for col in columns:
                columns_info[col['name']] = {
                    'type': str(col['type']),
                    'nullable': col.get('nullable', True),
                    'default': str(col['default']) if col.get('default') else None,
                    'primary_key': col['name'] in primary_keys
                }
            
            # Get row count
            try:
                row_count_query = text(f"SELECT COUNT(*) FROM {table_name}")
                result = db.execute(row_count_query)
                row_count = result.scalar()
            except Exception:
                row_count = None
            
            # Check if table entry exists
            existing_table = db.query(Table).filter(Table.name == table_name).first()
            
            if existing_table:
                # Update existing entry
                existing_table.schema = 'public'  # Using public schema for now
                existing_table.columns = columns_info
                existing_table.row_count = row_count
                db.add(existing_table)
            else:
                # Create new entry
                new_table = Table(
                    name=table_name,
                    schema='public',  # Using public schema for now
                    columns=columns_info,
                    description=f"Table {table_name}",
                    row_count=row_count
                )
                db.add(new_table)
        
        db.commit()
        
        # Get all tables and format columns as array for response
        tables = db.query(Table).all()
        
        # Transform columns from dict to array for each table
        for table in tables:
            if table.columns and isinstance(table.columns, dict):
                column_array = []
                for name, details in table.columns.items():
                    column_info = {
                        "name": name,
                        **details
                    }
                    column_array.append(column_info)
                table.columns = column_array
        
        return tables
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{table_id}/sample")
async def get_table_sample(table_id: int, db: Session = Depends(get_db)):
    """Get sample data from a table"""
    try:
        # Get the table
        table = db.query(Table).filter(Table.id == table_id).first()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
        
        # Get sample data
        query = text(f"SELECT * FROM {table.name} LIMIT 10")
        result = db.execute(query)
        
        # Convert to list of dicts
        sample_data = []
        for row in result:
            data = {}
            for column, value in row._mapping.items():
                data[column] = value
            sample_data.append(data)
        
        return sample_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 