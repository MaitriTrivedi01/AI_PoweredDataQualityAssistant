from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
from app.core.database import Base, primary_engine
from app.models.database import Table, Rule, RuleResult
from app.services.great_expectations_service import GreatExpectationsService
from app.services import rule_service
from app.services.quality_check_service import QualityCheckService
from sqlalchemy.orm import Session
from app.core.database import get_db
import logging
from app.core.config import settings
from app.api import databases, tables, rules, quality
from app.models import database as models

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Set up CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables
@app.on_event("startup")
async def create_tables():
    try:
        logger.info("Creating database tables if they don't exist")
        Base.metadata.create_all(bind=primary_engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}

# Import and include routers
app.include_router(databases.router, prefix=f"{settings.API_V1_STR}/databases", tags=["databases"])
app.include_router(tables.router, prefix=f"{settings.API_V1_STR}/tables", tags=["tables"])
app.include_router(rules.router, prefix=f"{settings.API_V1_STR}/rules", tags=["rules"])
app.include_router(quality.router, prefix=f"{settings.API_V1_STR}/quality", tags=["quality"])

@app.get("/")
async def root():
    return {"message": "AI-Powered Data Quality Assistant API"}

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 