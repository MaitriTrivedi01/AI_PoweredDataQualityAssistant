from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.engine.url import make_url
from .config import settings
import ssl
import logging
import urllib.parse
from dotenv import load_dotenv
import os
import pathlib
from typing import Dict, Tuple, Any, Optional
from contextlib import contextmanager
import time
import socket

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Fix the Supabase database URL to use direct connection
SUPABASE_URL = "postgresql://postgres.tppovcrbrnfghxmslfcs:Maitri142001@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Create database engine function
def create_db_engine(db_url):
    """Create database engine for Supabase"""
    logger.info(f"Creating database engine for Supabase")
    
    # Parse and encode the database URL
    url = make_url(db_url)
    
    if url.password:
        encoded_password = urllib.parse.quote_plus(url.password)
        url = url.set(password=encoded_password)
    
    # Configure connection args for Supabase
    connect_args = {
        "sslmode": "require",
        "connect_timeout": 60,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5
    }
    
    # Create engine with Supabase connection
    engine = create_engine(
        url,
        pool_size=5,
        max_overflow=10,
        pool_timeout=30,
        pool_pre_ping=True,
        connect_args=connect_args
    )
    
    return engine

# Create primary engine
try:
    primary_engine = create_db_engine(SUPABASE_URL)
    
    # Add connection debugging
    @event.listens_for(primary_engine, 'connect')
    def receive_connect(dbapi_connection, connection_record):
        logger.info("Primary database connection established")

    @event.listens_for(primary_engine, 'checkout')
    def receive_checkout(dbapi_connection, connection_record, connection_proxy):
        logger.info("Primary database connection checked out")
        
except Exception as e:
    logger.critical(f"Failed to connect to Supabase database: {str(e)}")
    raise RuntimeError(f"Failed to connect to database: {str(e)}")

# Create SessionLocal class for primary database
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=primary_engine)

# Create Base class
Base = declarative_base()

# Keep track of secondary database engines
secondary_engines: Dict[int, Any] = {}
secondary_sessions: Dict[int, Any] = {}

# Dependency to get primary DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_secondary_engine(connection_string: str, database_id: int) -> Any:
    """Create a new engine for a secondary database"""
    try:
        logger.info(f"Creating engine for database ID {database_id}")
        # Parse and encode the database URL
        url = make_url(connection_string)
        
        if url.password:
            encoded_password = urllib.parse.quote_plus(url.password)
            url = url.set(password=encoded_password)
        
        # Configure connection args
        connect_args = {
            "sslmode": "require",
            "connect_timeout": 60,
            "keepalives": 1,
            "keepalives_idle": 30,
            "keepalives_interval": 10,
            "keepalives_count": 5
        }
        
        # Create engine
        engine = create_engine(
            url,
            pool_size=3,
            max_overflow=5,
            pool_timeout=30,
            pool_pre_ping=True,
            connect_args=connect_args
        )
        
        # Store the engine and create a session maker
        secondary_engines[database_id] = engine
        secondary_sessions[database_id] = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        return engine
    except Exception as e:
        logger.error(f"Error creating secondary database engine: {str(e)}")
        raise

def get_secondary_db_session(database_id: int, connection_string: Optional[str] = None):
    """Get a session for a secondary database"""
    if database_id not in secondary_engines and connection_string:
        create_secondary_engine(connection_string, database_id)
    
    if database_id not in secondary_sessions:
        raise ValueError(f"No session available for database ID {database_id}")
    
    session = secondary_sessions[database_id]()
    try:
        yield session
    finally:
        session.close()

@contextmanager
def get_secondary_db_session_context(database_id: int, connection_string: Optional[str] = None):
    """Context manager version for getting a session to a secondary database"""
    if database_id not in secondary_engines and connection_string:
        create_secondary_engine(connection_string, database_id)
    
    if database_id not in secondary_sessions:
        raise ValueError(f"No session available for database ID {database_id}")
    
    session = secondary_sessions[database_id]()
    try:
        yield session
    finally:
        session.close()

def get_database_url():
    """Get database URL from environment variables."""
    # Load environment variables from .env file
    env_file = pathlib.Path(__file__).parents[2] / '.env'
    if env_file.exists():
        load_dotenv(dotenv_path=env_file)
    
    # Try to get connection parameters from environment variables
    host = os.getenv('DB_HOST') or ''
    port = os.getenv('DB_PORT') or ''
    user = os.getenv('DB_USER') or ''
    password = os.getenv('DB_PASSWORD') or ''
    db_name = os.getenv('DB_NAME') or ''
    
    # Check if we have all required connection parameters
    if not all([host, port, user, password, db_name]):
        # Try Supabase common variables
        host = os.getenv('SUPABASE_HOST') or os.getenv('SUPABASE_URL') or 'localhost'
        port = os.getenv('SUPABASE_PORT') or '5432'
        user = os.getenv('SUPABASE_USER') or os.getenv('SUPABASE_USERNAME') or 'postgres'
        password = os.getenv('SUPABASE_PASSWORD') or 'postgres'
        db_name = os.getenv('SUPABASE_DB') or os.getenv('SUPABASE_DATABASE') or 'postgres'
    
    # Ensure port is a string
    port = str(port)
    
    # Create connection string
    db_url = f"postgresql://{user}:{password}@{host}:{port}/{db_name}"
    
    # Skip sslmode=require for local development
    if host not in ('localhost', '127.0.0.1'):
        db_url += "?sslmode=require"
        
    return db_url, {
        'host': host,
        'port': port,
        'user': user,
        'password': password,
        'db_name': db_name
    } 