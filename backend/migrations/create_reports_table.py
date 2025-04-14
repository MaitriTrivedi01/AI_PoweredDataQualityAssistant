from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text, JSON, MetaData, Table
import os
from datetime import datetime
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

# Define the validation_reports table
validation_reports = Table(
    "validation_reports",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("table_id", Integer, ForeignKey("tables.id")),
    Column("report_name", String(100)),
    Column("created_at", DateTime, default=datetime.utcnow),
    Column("rule_ids", JSON),
    Column("summary", JSON),
    Column("report_data", JSON)
)

def upgrade():
    # Create the table
    metadata.create_all(engine, tables=[validation_reports])
    print("Created validation_reports table")

def downgrade():
    # Drop the table
    validation_reports.drop(engine)
    print("Dropped validation_reports table")

if __name__ == "__main__":
    print(f"Using database URL: {DATABASE_URL.replace('postgres:', '***:') if 'postgres:' in DATABASE_URL else DATABASE_URL}")
    upgrade() 