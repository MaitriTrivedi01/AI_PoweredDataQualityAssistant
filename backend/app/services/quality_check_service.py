from sqlalchemy.orm import Session
from app.models.database import Rule, RuleResult
from app.services.great_expectations_service import GreatExpectationsService
from datetime import datetime
from typing import List, Optional

class QualityCheckService:
    def __init__(self, db: Session):
        self.db = db
        self.ge_service = GreatExpectationsService()

    async def run_quality_check(self, table_name: str, rule_ids: List[int]) -> List[dict]:
        results = []
        for rule_id in rule_ids:
            rule = self.db.query(Rule).filter(Rule.id == rule_id).first()
            if not rule:
                continue

            try:
                validation_result = await self.ge_service.validate_data(
                    table_name=table_name,
                    rule_id=rule_id,
                    rule_config=rule.config
                )

                # Create rule result
                rule_result = RuleResult(
                    rule_id=rule_id,
                    execution_time=datetime.now(),
                    success=validation_result["success"],
                    total_records=validation_result["total_records"],
                    total_records_passed=validation_result["total_records_passed"],
                    total_records_failed=validation_result["total_records_failed"],
                    overall_success_rate=validation_result["overall_success_rate"]
                )
                self.db.add(rule_result)
                self.db.commit()

                results.append({
                    "rule_id": rule_id,
                    "rule_name": rule.name,
                    "status": "SUCCESS" if validation_result["success"] else "FAILURE",
                    **validation_result
                })
            except Exception as e:
                results.append({
                    "rule_id": rule_id,
                    "rule_name": rule.name,
                    "status": "ERROR",
                    "error": str(e)
                })

        return results

    def get_rule_results(self, rule_id: int) -> List[RuleResult]:
        return self.db.query(RuleResult).filter(RuleResult.rule_id == rule_id).all()

    def clear_rule_results(self, rule_id: int) -> bool:
        try:
            self.db.query(RuleResult).filter(RuleResult.rule_id == rule_id).delete()
            self.db.commit()
            return True
        except Exception:
            return False 