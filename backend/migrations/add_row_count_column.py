from sqlalchemy import create_engine, Column, Integer, Table, MetaData, text
import os
import sys

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the database connection from app
try:
    from app.core.database import SQLALCHEMY_DATABASE_URL
except ImportError:
    # Fallback to environment variable
    DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/dataquality")
    print(f"Warning: Could not import from app.core.database, using fallback URL")
else:
    DATABASE_URL = SQLALCHEMY_DATABASE_URL
    print(f"Using database URL from app configuration")

# Create engine
engine = create_engine(DATABASE_URL)
metadata = MetaData()

# Reference the existing tables table
tables = Table('tables', metadata, autoload_with=engine)

def upgrade():
    # Add the row_count column using the text() function
    with engine.connect() as connection:
        connection.execute(text('ALTER TABLE tables ADD COLUMN IF NOT EXISTS row_count INTEGER'))
        connection.commit()
    print("Added row_count column to tables table")

def downgrade():
    # Remove the row_count column
    with engine.connect() as connection:
        connection.execute(text('ALTER TABLE tables DROP COLUMN IF EXISTS row_count'))
        connection.commit()
    print("Removed row_count column from tables table")

if __name__ == "__main__":
    print(f"Using database URL: {DATABASE_URL.replace('postgres:', '***:') if 'postgres:' in DATABASE_URL else DATABASE_URL}")
    upgrade() 