from pydantic_settings import BaseSettings
from typing import Dict, Any, List, Optional, ClassVar
import os
import pathlib
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env file
env_file = pathlib.Path(__file__).parents[2] / '.env'
if env_file.exists():
    load_dotenv(dotenv_path=env_file)
    logger.info(f"Loaded environment variables from {env_file}")

class Settings(BaseSettings):
    """Application settings class to manage environment variables and configuration"""
    # API settings
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "AI-Powered Data Quality Assistant"
    
    # Server settings
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    debug: bool = os.getenv("DEBUG", "True").lower() == "true"
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # Supabase database configuration
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres.tppovcrbrnfghxmslfcs:Maitri142001@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require")
    FALLBACK_TO_SQLITE: bool = False  # Disabling SQLite fallback
    
    # OpenAI settings
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # Load Supabase details from various env var names (for flexibility)
    SUPABASE_URL: Optional[str] = os.getenv("SUPABASE_URL") or os.getenv("SUPABASE_HOST") or "aws-0-ap-south-1.pooler.supabase.com"
    SUPABASE_PORT: str = os.getenv("SUPABASE_PORT", "6543")
    SUPABASE_KEY: Optional[str] = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_API_KEY")
    SUPABASE_USER: str = os.getenv("SUPABASE_USER", "postgres.tppovcrbrnfghxmslfcs")
    SUPABASE_PASSWORD: str = os.getenv("SUPABASE_PASSWORD", "Maitri142001")
    SUPABASE_DB: str = os.getenv("SUPABASE_DB", "postgres")
    SUPABASE_JWT: Optional[str] = os.getenv("SUPABASE_JWT") or os.getenv("SUPABASE_TOKEN")
    
    # Security settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    
    # CORS configuration
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:8000",
        "http://localhost",
        "https://localhost",
        "https://localhost:3000",
        "https://localhost:8000",
    ]
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "allow"
    }

# Create settings instance
settings = Settings()

# Log important configuration details (omit sensitive data)
logger.info(f"Project Name: {settings.PROJECT_NAME}")
logger.info(f"API Prefix: {settings.API_V1_STR}")
logger.info(f"Environment: {settings.environment}")
logger.info(f"Supabase Host: {settings.SUPABASE_URL}")
logger.info(f"Database Connection: PostgreSQL")
logger.info(f"CORS Origins: {settings.BACKEND_CORS_ORIGINS}")

# Function to create database dictionary for SQLAlchemy connection
def get_database_details() -> Dict[str, Any]:
    """Extract database connection details"""
    return {
        "dialect": "postgresql",
        "user": settings.SUPABASE_USER,
        "password": settings.SUPABASE_PASSWORD,
        "host": settings.SUPABASE_URL,
        "port": settings.SUPABASE_PORT,
        "db_name": settings.SUPABASE_DB
    } 