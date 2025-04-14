from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..core.database import get_db, create_secondary_engine
from ..models.database import Database, Table
from pydantic import BaseModel
from datetime import datetime
import sqlalchemy as sa
from sqlalchemy import inspect
import logging

router = APIRouter()

class DatabaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    connection_string: str

class DatabaseCreate(DatabaseBase):
    pass

class DatabaseResponse(DatabaseBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
        # Exclude sensitive connection string from response
        json_encoders = {
            str: lambda v: v if not v.startswith('postgresql://') else '[REDACTED]'
        }

class DatabaseUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    connection_string: Optional[str] = None
    is_active: Optional[bool] = None

@router.post("/", response_model=DatabaseResponse)
async def create_database(database: DatabaseCreate, db: Session = Depends(get_db)):
    """Create a new database connection"""
    # Check if a database with the same name already exists
    existing = db.query(Database).filter(Database.name == database.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Database with this name already exists")
    
    # Try to connect to the database to verify the connection string
    try:
        # Create a temporary engine to test connection
        engine = create_secondary_engine(database.connection_string, -1)
        # Try to connect
        with engine.connect() as conn:
            pass
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to connect to database: {str(e)}")
    
    # Create new database record
    db_database = Database(
        name=database.name,
        description=database.description,
        connection_string=database.connection_string,
        is_active=True
    )
    
    db.add(db_database)
    db.commit()
    db.refresh(db_database)
    
    return db_database

@router.get("/", response_model=List[DatabaseResponse])
async def list_databases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """List all database connections"""
    databases = db.query(Database).offset(skip).limit(limit).all()
    return databases

@router.get("/{database_id}", response_model=DatabaseResponse)
async def get_database(database_id: int, db: Session = Depends(get_db)):
    """Get a specific database connection"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Database not found")
    return database

@router.put("/{database_id}", response_model=DatabaseResponse)
async def update_database(database_id: int, update_data: DatabaseUpdateRequest, db: Session = Depends(get_db)):
    """Update a database connection"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Database not found")
    
    # Update fields if provided
    if update_data.name is not None:
        # Check for name conflict
        if update_data.name != database.name:
            existing = db.query(Database).filter(Database.name == update_data.name).first()
            if existing:
                raise HTTPException(status_code=400, detail="Database with this name already exists")
        database.name = update_data.name
    
    if update_data.description is not None:
        database.description = update_data.description
    
    if update_data.connection_string is not None:
        # Test the new connection string
        try:
            # Create a temporary engine to test connection
            engine = create_secondary_engine(update_data.connection_string, -1)
            # Try to connect
            with engine.connect() as conn:
                pass
            database.connection_string = update_data.connection_string
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to connect to database: {str(e)}")
    
    if update_data.is_active is not None:
        database.is_active = update_data.is_active
    
    database.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(database)
    
    return database

@router.delete("/{database_id}")
async def delete_database(database_id: int, db: Session = Depends(get_db)):
    """Delete a database connection"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Database not found")
    
    # Delete the database (will cascade to tables and rules)
    db.delete(database)
    db.commit()
    
    return {"message": "Database connection deleted successfully"}

@router.get("/{database_id}/tables", response_model=List[str])
async def discover_tables(database_id: int, db: Session = Depends(get_db)):
    """Discover tables in the connected database"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Database not found")
    
    if not database.is_active:
        raise HTTPException(status_code=400, detail="Database connection is not active")
    
    try:
        # Create an engine for this database
        engine = create_secondary_engine(database.connection_string, database.id)
        
        # Get list of tables using reflection
        inspector = inspect(engine)
        schema = None  # Default schema (public for PostgreSQL)
        
        # Get all table names
        table_names = inspector.get_table_names(schema=schema)
        
        return table_names
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error discovering tables: {str(e)}")

@router.post("/{database_id}/tables/import")
async def import_tables(database_id: int, table_names: List[str], db: Session = Depends(get_db)):
    """Import selected tables into the system"""
    logger = logging.getLogger(__name__)
    
    try:
        database = db.query(Database).filter(Database.id == database_id).first()
        if not database:
            raise HTTPException(status_code=404, detail="Database not found")
        
        if not database.is_active:
            raise HTTPException(status_code=400, detail="Database connection is not active")
        
        # Create an engine for this database
        logger.info(f"Creating engine for database {database_id} to import tables: {table_names}")
        engine = create_secondary_engine(database.connection_string, database.id)
        
        # Get list of tables using reflection
        inspector = inspect(engine)
        schema = None  # Default schema (public for PostgreSQL)
        
        imported_tables = []
        
        for table_name in table_names:
            try:
                # Check if table already exists
                existing = db.query(Table).filter(
                    Table.database_id == database_id,
                    Table.name == table_name
                ).first()
                
                if existing:
                    logger.info(f"Table {table_name} already exists, skipping")
                    continue  # Skip already imported tables
                
                # Get columns for this table
                try:
                    columns = inspector.get_columns(table_name, schema=schema)
                    logger.info(f"Retrieved columns for {table_name}: {len(columns)} columns found")
                except Exception as e:
                    logger.error(f"Error getting columns for {table_name}: {str(e)}")
                    columns = []
                
                # Format columns for storage
                formatted_columns = []
                for col in columns:
                    col_data = {
                        "name": col["name"],
                        "type": str(col["type"]),
                        "nullable": col.get("nullable", True),
                    }
                    
                    # Only add primary_key if it exists
                    if "primary_key" in col:
                        col_data["primary_key"] = col["primary_key"]
                        
                    formatted_columns.append(col_data)
                
                # Get row count (approximate)
                row_count = 0
                try:
                    with engine.connect() as conn:
                        result = conn.execute(sa.text(f"SELECT COUNT(*) FROM {table_name}"))
                        row_count = result.scalar()
                        logger.info(f"Row count for {table_name}: {row_count}")
                except Exception as e:
                    logger.error(f"Error counting rows for {table_name}: {str(e)}")
                    # If count fails, just use 0
                    pass
                
                # Create the table record
                new_table = Table(
                    database_id=database.id,
                    name=table_name,
                    schema="public",  # Default schema
                    columns=formatted_columns,
                    row_count=row_count
                )
                
                db.add(new_table)
                imported_tables.append(table_name)
                logger.info(f"Added table {table_name} to database")
            except Exception as e:
                logger.error(f"Error processing table {table_name}: {str(e)}")
                # Continue with next table instead of failing the whole batch
                continue
        
        db.commit()
        logger.info(f"Successfully imported {len(imported_tables)} tables")
        
        return {
            "message": f"Successfully imported {len(imported_tables)} tables",
            "imported_tables": imported_tables
        }
    except Exception as e:
        logger.error(f"Error importing tables: {str(e)}", exc_info=True)
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error importing tables: {str(e)}")

@router.get("/{database_id}/test", status_code=200)
async def test_database_connection(database_id: int, db: Session = Depends(get_db)):
    """Test connection to a database"""
    database = db.query(Database).filter(Database.id == database_id).first()
    if not database:
        raise HTTPException(status_code=404, detail="Database not found")
    
    try:
        # Create an engine for this database
        engine = create_secondary_engine(database.connection_string, database.id)
        
        # Try to connect
        with engine.connect() as conn:
            # Execute a simple query to verify connection
            result = conn.execute(sa.text("SELECT 1"))
            value = result.scalar()
            
            # Update connection status if needed
            if not database.is_active:
                database.is_active = True
                database.updated_at = datetime.utcnow()
                db.commit()
            
            return {"status": "success", "message": "Connection test successful"}
    except Exception as e:
        # Update connection status if needed
        if database.is_active:
            database.is_active = False
            database.updated_at = datetime.utcnow()
            db.commit()
            
        raise HTTPException(status_code=500, detail=f"Connection test failed: {str(e)}") 