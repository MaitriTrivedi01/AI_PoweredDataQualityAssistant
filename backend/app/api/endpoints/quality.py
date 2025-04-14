from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.validation_service import ValidationService
from app.database import get_db
from typing import List
from pydantic import BaseModel

router = APIRouter()

class QualityCheckRequest(BaseModel):
    table_name: str
    rule_ids: List[int]

class QualityCheckResponse(BaseModel):
    results: List[dict]
    summary: dict

@router.post("/check", response_model=QualityCheckResponse)
async def check_quality(request: QualityCheckRequest, db: Session = Depends(get_db)):
    try:
        validation_service = ValidationService(db)
        results, summary = await validation_service.validate_table(
            request.table_name,
            request.rule_ids
        )
        
        return QualityCheckResponse(
            results=[{
                "id": result.id,
                "rule_id": result.rule_id,
                "execution_time": result.execution_time.isoformat(),
                "status": result.status,
                "success_count": result.success_count,
                "failure_count": result.failure_count,
                "error_details": result.error_details,
                "result_metadata": result.result_metadata,
                "cached": False
            } for result in results],
            summary=summary
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 