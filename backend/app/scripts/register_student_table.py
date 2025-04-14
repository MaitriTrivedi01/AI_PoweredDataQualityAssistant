from sqlalchemy import create_engine, inspect
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.database import Table
import json

def register_student_table():
    # Create database engine
    engine = create_engine(settings.DATABASE_URL)
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    try:
        # Get inspector to extract table information
        inspector = inspect(engine)
        
        # Get column information for students table
        columns = inspector.get_columns('students')
        columns_info = {
            col['name']: {
                'type': str(col['type']),
                'nullable': col.get('nullable', True),
                'default': str(col.get('default', None)),
                'primary_key': col.get('primary_key', False)
            }
            for col in columns
        }
        
        # Create table entry
        table_entry = Table(
            name='students',
            schema='public',
            columns=columns_info,
            description='College student database containing student information, academic records, and enrollment details.'
        )
        
        # Check if table already exists
        existing_table = db.query(Table).filter(Table.name == 'students').first()
        if existing_table:
            print("Students table already registered")
            return
        
        # Add and commit
        db.add(table_entry)
        db.commit()
        print("Successfully registered students table")
        
    except Exception as e:
        print(f"Error registering table: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    register_student_table() 