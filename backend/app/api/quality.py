from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from ..core.database import get_db
from ..models.database import Rule, Table, RuleResult, ValidationReport
from ..services.data_quality_service import DataQualityService
from pydantic import BaseModel
from datetime import datetime
import hashlib
import json

router = APIRouter()

# Simple in-memory cache for report results
report_cache = {}

class QualityCheckRequest(BaseModel):
    table_name: str
    rule_ids: List[int]

class ValidationDetail(BaseModel):
    expectation_type: str
    success: bool
    element_count: int
    unexpected_count: int
    unexpected_percent: float
    unexpected_rows: List[Any]
    observed_value: Any
    missing_count: int
    missing_percent: float

class ResultMetadata(BaseModel):
    validation_details: List[ValidationDetail]
    total_records: int
    success_rate: float
    validation_time: str

class RuleResultResponse(BaseModel):
    rule_id: int
    execution_time: str
    status: str
    success_count: int
    failure_count: int
    error_details: str | None
    result_metadata: ResultMetadata
    cached: bool = False

    class Config:
        from_attributes = True

class QualityCheckSummary(BaseModel):
    total_rules: int
    passed_rules: int
    failed_rules: int
    error_rules: int
    total_records_validated: int
    total_records_passed: int
    total_records_failed: int
    overall_success_rate: float
    execution_time: str

    class Config:
        from_attributes = True

class QualityCheckResponse(BaseModel):
    results: List[RuleResultResponse]
    summary: QualityCheckSummary

    class Config:
        from_attributes = True

class SaveReportRequest(BaseModel):
    report_name: str
    table_name: str
    rule_ids: List[int]
    report_data: Dict[str, Any]

@router.post("/check")
async def run_quality_check(
    request: QualityCheckRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Run quality check on a table using specified rules
    """
    try:
        service = DataQualityService(db)
        results, summary = await service.validate_table(
            table_name=request.table_name,
            rule_ids=request.rule_ids
        )
        
        return {
            "status": "success",
            "results": results,
            "summary": summary
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/rules/{rule_id}/results")
async def get_rule_results(
    rule_id: int,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get validation results for a specific rule
    """
    try:
        service = DataQualityService(db)
        result = service.get_cached_result(rule_id)
        
        if not result:
            raise HTTPException(status_code=404, detail=f"No results found for rule {rule_id}")
            
        return {
            "status": "success",
            "result": {
                "rule_id": result.rule_id,
                "execution_time": result.execution_time.isoformat(),
                "status": result.status,
                "success_count": result.success_count,
                "failure_count": result.failure_count,
                "error_details": result.error_details,
                "result_metadata": result.result_metadata,
                "cached": True
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.get("/tables/{table_name}/summary")
async def get_table_quality_summary(
    table_name: str,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get quality summary for a specific table
    """
    try:
        # Get all rules for this table
        rules = db.query(Rule).filter(
            Rule.table.has(name=table_name),
            Rule.is_active == True
        ).all()
        
        if not rules:
            raise HTTPException(
                status_code=404,
                detail=f"No active rules found for table {table_name}"
            )
            
        # Run quality check with all active rules
        service = DataQualityService(db)
        results, summary = await service.validate_table(
            table_name=table_name,
            rule_ids=[rule.id for rule in rules]
        )
        
        return {
            "status": "success",
            "table_name": table_name,
            "summary": summary,
            "last_checked": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/rules/{rule_id}/results")
async def clear_rule_results_cache(
    rule_id: int,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Clear the cached validation results for a specific rule
    """
    try:
        # Delete all cached results for this rule
        deleted_count = db.query(RuleResult).filter(
            RuleResult.rule_id == rule_id
        ).delete()
        
        db.commit()
            
        return {
            "status": "success",
            "message": f"Cleared {deleted_count} cached results for rule {rule_id}"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/cache")
async def clear_all_results_cache(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Clear all cached validation results
    """
    try:
        # Delete all cached results
        deleted_count = db.query(RuleResult).delete()
        
        db.commit()
            
        return {
            "status": "success",
            "message": f"Cleared {deleted_count} cached results"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.post("/report")
async def get_quality_report(
    request: QualityCheckRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate a detailed quality report for a table using specified rules
    """
    try:
        service = DataQualityService(db)
        results, summary = await service.validate_table(
            table_name=request.table_name,
            rule_ids=request.rule_ids
        )
        
        # Get table details
        table = db.query(Table).filter(Table.name == request.table_name).first()
        
        # Extract rule details for better reporting
        rule_details = []
        for rule_id in request.rule_ids:
            rule = db.query(Rule).filter(Rule.id == rule_id).first()
            if rule:
                rule_details.append({
                    "id": rule.id,
                    "name": rule.name,
                    "description": rule.description,
                    "type": rule.rule_type
                })
        
        # Collect all failure examples
        all_failures = []
        for result in results:
            if "failed_examples" in result.get("result_metadata", {}):
                all_failures.extend(result.get("result_metadata", {}).get("failed_examples", []))
        
        # Group failures by column for better reporting
        failures_by_column = {}
        for failure in all_failures:
            column = failure.get("column")
            if column not in failures_by_column:
                failures_by_column[column] = []
            failures_by_column[column].append(failure)
        
        # Calculate column-level statistics
        column_stats = {}
        for result in results:
            for detail in result.get("result_metadata", {}).get("validation_details", []):
                column = detail.get("column")
                if not column:
                    continue
                    
                if column not in column_stats:
                    column_stats[column] = {
                        "total_checks": 0,
                        "passed_checks": 0,
                        "failed_checks": 0,
                        "error_checks": 0,
                        "success_rate": 0
                    }
                
                column_stats[column]["total_checks"] += 1
                if detail.get("success"):
                    column_stats[column]["passed_checks"] += 1
                else:
                    column_stats[column]["failed_checks"] += 1
                
                # Update success rate
                column_stats[column]["success_rate"] = (
                    column_stats[column]["passed_checks"] / column_stats[column]["total_checks"] * 100
                )
        
        # Format the report
        report = {
            "report_id": f"quality_report_{request.table_name}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
            "generation_time": datetime.utcnow().isoformat(),
            "table": {
                "name": request.table_name,
                "schema": table.schema if table else "public",
                "columns": [c for c in column_stats.keys()]
            },
            "summary": {
                "total_rules": summary["total_rules"],
                "passed_rules": summary["passed_rules"],
                "failed_rules": summary["failed_rules"],
                "error_rules": summary["error_rules"],
                "total_records": summary["total_records_validated"],
                "overall_success_rate": summary["overall_success_rate"],
                "execution_time": summary["execution_time"]
            },
            "column_statistics": column_stats,
            "rules": rule_details,
            "results": results,
            "failures_by_column": failures_by_column,
            "recommendations": _generate_recommendations(failures_by_column, column_stats)
        }
        
        return {
            "status": "success",
            "report": report
        }
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
        
def _generate_recommendations(failures_by_column, column_stats):
    """Generate recommendations based on validation results"""
    recommendations = []
    
    # Add recommendations based on column statistics
    for column, stats in column_stats.items():
        if stats["success_rate"] < 90:
            recommendations.append({
                "type": "column_quality",
                "severity": "high" if stats["success_rate"] < 70 else "medium",
                "column": column,
                "message": f"Column '{column}' has a low success rate of {stats['success_rate']:.1f}%. Review data quality issues."
            })
    
    # Add recommendations based on specific failure patterns
    for column, failures in failures_by_column.items():
        failure_count = len(failures)
        if failure_count > 0:
            recommendations.append({
                "type": "data_cleansing",
                "severity": "medium",
                "column": column,
                "message": f"Found {failure_count} validation failures in column '{column}'. Consider data cleansing.",
                "examples": [f.get("value") for f in failures[:3]]
            })
            
    # Sort recommendations by severity
    severity_order = {"high": 0, "medium": 1, "low": 2}
    recommendations.sort(key=lambda x: severity_order.get(x["severity"], 999))
    
    return recommendations

@router.post("/report-ui")
async def get_ui_friendly_report(
    request: Request,
    report_request: QualityCheckRequest,
    response: Response,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Generate a UI-friendly quality report for displaying in a table format
    """
    try:
        # Create a cache key from the request parameters
        cache_key = f"{report_request.table_name}:{','.join(map(str, report_request.rule_ids))}"
        cache_hash = hashlib.md5(cache_key.encode()).hexdigest()
        
        # Check if we have a cached result
        if cache_hash in report_cache:
            print(f"Returning cached report for {cache_key}")
            response.headers["X-Cache-Hit"] = "true"
            return report_cache[cache_hash]
        
        service = DataQualityService(db)
        results, summary = await service.validate_table(
            table_name=report_request.table_name,
            rule_ids=report_request.rule_ids
        )
        
        # Format results for UI display
        ui_results = []
        
        for result in results:
            rule_id = result.get("rule_id")
            rule = db.query(Rule).filter(Rule.id == rule_id).first()
            
            rule_name = rule.name if rule else f"Rule {rule_id}"
            rule_description = rule.description if rule else ""
            status = result.get("status")
            
            metadata = result.get("result_metadata", {})
            details = metadata.get("validation_details", [])
            total_records = metadata.get("total_records", 0)
            success_rate = metadata.get("success_rate", 0)
            
            # Get column-level results for more detailed display
            column_results = {}
            failed_records = {}
            
            for detail in details:
                column = detail.get("column", "")
                if not column:
                    continue
                    
                # Track column metrics
                if column not in column_results:
                    column_results[column] = {
                        "success": True,
                        "total_records": detail.get("element_count", 0),
                        "unexpected_count": 0,
                        "success_rate": 100.0
                    }
                
                # Update if this expectation failed
                if not detail.get("success", True):
                    column_results[column]["success"] = False
                    column_results[column]["unexpected_count"] += detail.get("unexpected_count", 0)
                    column_results[column]["success_rate"] = 100 - detail.get("unexpected_percent", 0)
                
                # Track failed records for this column
                if not detail.get("success", True):
                    if column not in failed_records:
                        failed_records[column] = []
                    
                    failed_records[column].extend(detail.get("unexpected_rows", []))
            
            # Create UI-friendly result object
            ui_result = {
                "rule_id": rule_id,
                "rule_name": rule_name,
                "rule_description": rule_description,
                "status": status,
                "total_records": total_records,
                "success_rate": success_rate,
                "column_results": column_results,
                "failed_records": failed_records
            }
            
            ui_results.append(ui_result)
        
        # Generate an overall validation summary
        validation_summary = {
            "total_rules": len(report_request.rule_ids),
            "passed_rules": summary.get("passed_rules", 0),
            "failed_rules": summary.get("failed_rules", 0),
            "error_rules": summary.get("error_rules", 0),
            "total_records": summary.get("total_records_validated", 0),
            "overall_success_rate": summary.get("overall_success_rate", 0)
        }
        
        report_result = {
            "status": "success",
            "table_name": report_request.table_name,
            "rules": ui_results,
            "summary": validation_summary
        }
        
        # Cache the result with a 5-minute TTL
        report_cache[cache_hash] = report_result
        response.headers["X-Cache-Hit"] = "false"
        
        # Limit cache size to prevent memory issues
        if len(report_cache) > 50:
            # Remove the oldest entry (simple approach)
            report_cache.pop(next(iter(report_cache)))
        
        return report_result
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@router.delete("/cache/reset")
async def reset_cache() -> Dict[str, Any]:
    """
    Reset the report cache
    """
    global report_cache
    cache_size = len(report_cache)
    report_cache = {}
    
    return {
        "status": "success",
        "message": f"Cleared {cache_size} cached reports"
    }

@router.post("/report-ui/save")
async def save_report(
    request: SaveReportRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Save a validation report to the history database
    """
    try:
        # Get table id
        table = db.query(Table).filter(Table.name == request.table_name).first()
        if not table:
            raise HTTPException(status_code=404, detail=f"Table {request.table_name} not found")
        
        # Extract summary from report data
        summary = request.report_data.get("summary", {})
        
        # Create new report record
        new_report = ValidationReport(
            table_id=table.id,
            report_name=request.report_name,
            rule_ids=request.rule_ids,
            summary=summary,
            report_data=request.report_data
        )
        
        db.add(new_report)
        db.commit()
        db.refresh(new_report)
        
        return {
            "status": "success",
            "message": "Report saved successfully",
            "report_id": new_report.id
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save report: {str(e)}")

@router.get("/reports")
async def get_all_reports(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get a list of all saved validation reports
    """
    try:
        reports = db.query(ValidationReport).order_by(ValidationReport.created_at.desc()).all()
        
        report_list = []
        for report in reports:
            # Get table name
            table = db.query(Table).filter(Table.id == report.table_id).first()
            table_name = table.name if table else "Unknown"
            
            report_list.append({
                "id": report.id,
                "report_name": report.report_name,
                "table_name": table_name,
                "created_at": report.created_at.isoformat(),
                "rule_count": len(report.rule_ids) if report.rule_ids else 0,
                "summary": report.summary
            })
        
        return {
            "status": "success",
            "reports": report_list
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch reports: {str(e)}")

@router.get("/reports/{report_id}")
async def get_report_by_id(
    report_id: int,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get a specific validation report by ID
    """
    try:
        report = db.query(ValidationReport).filter(ValidationReport.id == report_id).first()
        
        if not report:
            raise HTTPException(status_code=404, detail=f"Report with ID {report_id} not found")
        
        # Get table name
        table = db.query(Table).filter(Table.id == report.table_id).first()
        table_name = table.name if table else "Unknown"
        
        # Format response
        response = {
            "id": report.id,
            "report_name": report.report_name,
            "table_name": table_name,
            "created_at": report.created_at.isoformat(),
            "rule_ids": report.rule_ids,
            "summary": report.summary,
            "report_data": report.report_data
        }
        
        return {
            "status": "success",
            "report": response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch report: {str(e)}")

@router.delete("/reports/{report_id}")
async def delete_report(
    report_id: int,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Delete a validation report from history
    """
    try:
        report = db.query(ValidationReport).filter(ValidationReport.id == report_id).first()
        
        if not report:
            raise HTTPException(status_code=404, detail=f"Report with ID {report_id} not found")
        
        db.delete(report)
        db.commit()
        
        return {
            "status": "success",
            "message": f"Report {report_id} deleted successfully"
        }
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete report: {str(e)}") 