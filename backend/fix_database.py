from sqlalchemy import create_engine, text
from app.core.config import settings
import urllib.parse
from sqlalchemy.engine.url import make_url
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def fix_database():
    # Parse and encode the database URL
    url = make_url(settings.DATABASE_URL)
    logger.info(f"Original database URL: {settings.DATABASE_URL}")
    encoded_password = urllib.parse.quote_plus(url.password)
    url = url.set(password=encoded_password)
    logger.info(f"Encoded database URL: {url}")
    
    # Create engine with same parameters as in app
    engine = create_engine(
        url,
        connect_args={
            "sslmode": "require",
            "connect_timeout": 60,
        }
    )
    
    with engine.connect() as conn:
        # Add row_count column to tables table if it doesn't exist
        logger.info("Adding row_count column to tables table...")
        conn.execute(text('ALTER TABLE tables ADD COLUMN IF NOT EXISTS row_count INTEGER'))
        conn.commit()
        logger.info("Row count column added successfully")
        
        # Create validation_reports table if it doesn't exist
        logger.info("Creating validation_reports table if it doesn't exist...")
        conn.execute(text('''
            CREATE TABLE IF NOT EXISTS validation_reports (
                id SERIAL PRIMARY KEY,
                table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
                report_name VARCHAR(100),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                rule_ids JSONB,
                summary JSONB,
                report_data JSONB
            )
        '''))
        conn.commit()
        logger.info("Validation reports table created or verified successfully")

if __name__ == "__main__":
    fix_database() 