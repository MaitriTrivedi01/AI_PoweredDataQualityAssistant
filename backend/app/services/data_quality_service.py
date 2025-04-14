from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from app.models.database import Rule, RuleResult, Table
from .great_expectations_service import GreatExpectationsService
import json
import pandas as pd
import logging

logger = logging.getLogger(__name__)

class DataQualityService:
    def __init__(self, db: Session):
        self.db = db
        self.ge_service = GreatExpectationsService()
        self.cache_duration = timedelta(hours=1)  # Cache results for 1 hour

    def get_cached_result(self, rule_id: int) -> Optional[RuleResult]:
        """Get cached validation result if available and not expired"""
        cached_result = (
            self.db.query(RuleResult)
            .filter(
                RuleResult.rule_id == rule_id,
                RuleResult.execution_time >= datetime.utcnow() - self.cache_duration
            )
            .order_by(RuleResult.execution_time.desc())
            .first()
        )
        return cached_result

    async def validate_table(self, table_name: str, rule_ids: List[int]) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Validate a table against specified rules
        
        Args:
            table_name: Name of the table to validate
            rule_ids: List of rule IDs to validate against
            
        Returns:
            Tuple containing:
            - List of validation results
            - Summary statistics
        """
        results = []
        summary = {
            "total_rules": len(rule_ids),
            "passed_rules": 0,
            "failed_rules": 0,
            "error_rules": 0,
            "total_records_validated": 0,
            "total_records_passed": 0,
            "total_records_failed": 0,
            "overall_success_rate": 0.0,
            "execution_time": datetime.utcnow().isoformat()
        }

        try:
            # Verify table exists
            table = self.db.query(Table).filter(Table.name == table_name).first()
            if not table:
                raise ValueError(f"Table {table_name} not found")

            # Process each rule
            for rule_id in rule_ids:
                try:
                    # Check cache first
                    cached_result = self.get_cached_result(rule_id)
                    if cached_result:
                        processed_result = self._process_cached_result(cached_result)
                        results.append(processed_result)
                        await self._update_summary(summary, processed_result)
                        continue

                    # Get rule configuration
                    rule = self.db.query(Rule).filter(Rule.id == rule_id).first()
                    if not rule:
                        raise ValueError(f"Rule {rule_id} not found")

                    # Parse expectations
                    expectations = (
                        json.loads(rule.expectation_config)
                        if isinstance(rule.expectation_config, str)
                        else rule.expectation_config
                    )
                    
                    # Validate data using Great Expectations
                    validation_result = await self.ge_service.validate_data(
                        table_name=table_name,
                        rule_id=rule_id,
                        rule_config=expectations,
                        suite_name=f"rule_{rule_id}_suite"
                    )

                    # Process validation results
                    result = await self._process_validation_result(rule_id, validation_result)
                    results.append(result)
                    
                    # Save result to database
                    await self._save_validation_result(rule_id, result)
                    
                    # Update summary
                    await self._update_summary(summary, result)

                except Exception as rule_error:
                    error_result = await self._handle_rule_error(rule_id, rule_error)
                    results.append(error_result)
                    summary["error_rules"] += 1

            # Calculate final success rate
            if summary["total_records_validated"] > 0:
                summary["overall_success_rate"] = (
                    summary["total_records_passed"] / summary["total_records_validated"]
                ) * 100

            return results, summary

        except Exception as e:
            raise ValueError(f"Error validating table: {str(e)}")

    async def _process_validation_result(self, rule_id: int, validation_result: Dict[str, Any]) -> Dict[str, Any]:
        """Process raw validation result into standardized format with enhanced reporting"""
        # Get rule details for better reporting
        rule = self.db.query(Rule).filter(Rule.id == rule_id).first()
        rule_name = rule.name if rule else f"Rule {rule_id}"
        rule_description = rule.description if rule else ""
        
        # Get table details if available
        table_id = rule.table_id if rule else None
        table_name = None
        if table_id:
            table = self.db.query(Table).filter(Table.id == table_id).first()
            table_name = table.name if table else None
        
        # Extract basic validation statistics
        success = validation_result.get("success", False)
        results = validation_result.get("results", [])
        
        # Initialize counts
        total_records = 0
        success_count = 0
        failure_count = 0
        
        # Detailed validation information
        validation_details = []
        failed_examples = []
        passed_expectations = []
        failed_expectations = []
        all_failed_records = []
        
        # Log raw validation result for debugging
        logger.info(f"Raw validation result for rule {rule_id}: {validation_result}")
        
        for result in results:
            result_dict = result.to_json_dict() if hasattr(result, 'to_json_dict') else result
            
            # Extract expectation details
            expectation_config = result_dict.get("expectation_config", {})
            expectation_type = expectation_config.get("expectation_type", "unknown")
            description = expectation_config.get("kwargs", {}).get("description", f"Validates using {expectation_type}")
            column = expectation_config.get("kwargs", {}).get("column")
            
            # Extract result details
            result_details = result_dict.get("result", {})
            success_status = result_dict.get("success", False)
            
            # Get accurate element/record counts
            element_count = result_details.get("element_count", 0)
            unexpected_count = result_details.get("unexpected_count", 0)
            
            # Set total records to element count (this represents all rows in the table)
            total_records = element_count
            
            # Ensure we capture specific failed values for display
            partial_unexpected_list = result_details.get("partial_unexpected_list", [])
            unexpected_list = result_details.get("unexpected_list", [])
            unexpected_index_list = result_details.get("unexpected_index_list", [])
            
            # Try to get more detailed information about failures
            unexpected_values = []
            if not success_status:
                # Get as many actual examples of failures as possible
                if partial_unexpected_list:
                    unexpected_values = partial_unexpected_list
                    all_failed_records.extend(partial_unexpected_list)
                    # Log found failures
                    logger.info(f"Found {len(partial_unexpected_list)} partial unexpected values for rule {rule_id}")
                elif unexpected_list:
                    unexpected_values = unexpected_list
                    all_failed_records.extend(unexpected_list)
                    # Log found failures
                    logger.info(f"Found {len(unexpected_list)} unexpected values for rule {rule_id}")
                    
                # Ensure we have the right failure count
                if unexpected_count > 0:
                    # This is the count of records failing this expectation
                    failure_count = unexpected_count
                    logger.info(f"Rule {rule_id} has {failure_count} failed records out of {total_records}")
                    
                # If we have indices but no values, try to extract rows from the data
                if not unexpected_values and unexpected_index_list and column and table_name:
                    try:
                        # Get a sample of failed rows
                        query = f"SELECT * FROM {table_name} LIMIT 20"
                        rows = pd.read_sql_query(query, self.db.bind)
                        if not rows.empty and column in rows.columns:
                            indices_to_fetch = unexpected_index_list[:20]
                            unexpected_values = rows[column].iloc[indices_to_fetch].tolist() if indices_to_fetch else []
                            all_failed_records.extend(unexpected_values)
                    except Exception as e:
                        logger.error(f"Error fetching failed rows: {str(e)}")
            
            # Detailed validation record with enhanced failure information
            validation_details.append({
                "expectation_type": expectation_type,
                "description": description,
                "column": column,
                "success": success_status,
                "element_count": element_count,
                "unexpected_count": unexpected_count,
                "unexpected_percent": result_details.get("unexpected_percent", 0),
                "unexpected_rows": unexpected_values[:20],  # Increase limit to 20 examples
                "observed_value": result_details.get("observed_value"),
                "missing_count": result_details.get("missing_count", 0),
                "missing_percent": result_details.get("missing_percent", 0)
            })
        
        # Calculate success count - the rest of the records that didn't fail
        success_count = total_records - failure_count
        
        # Calculate overall success rate for this rule
        success_rate = 0
        if total_records > 0:
            success_rate = (success_count / total_records) * 100
        
        # Log the final metrics
        logger.info(f"Final metrics for rule {rule_id}:")
        logger.info(f"  Total records: {total_records}")
        logger.info(f"  Success count: {success_count}")
        logger.info(f"  Failure count: {failure_count}")
        logger.info(f"  Success rate: {success_rate:.2f}%")
        logger.info(f"  Examples of failed records: {all_failed_records[:5] if all_failed_records else 'None'}")
        
        # Enhanced report with summary and examples including all failed records data
        return {
            "rule_id": rule_id,
            "rule_name": rule_name,
            "rule_description": rule_description,
            "table_name": table_name,
            "execution_time": datetime.utcnow().isoformat(),
            "status": "SUCCESS" if success else "FAILURE",
            "success_count": success_count,
            "failure_count": failure_count,
            "error_details": None,
            "result_metadata": {
                "validation_details": validation_details,
                "passed_expectations": passed_expectations,
                "failed_expectations": failed_expectations,
                "failed_examples": failed_examples,
                "partial_unexpected_list": all_failed_records[:20],  # Ensure we include all found failed records
                "total_records": total_records,
                "success_rate": success_rate,
                "validation_time": datetime.utcnow().isoformat()
            }
        }
        
    def _get_expectation_description(self, expectation_type: str, kwargs: Dict) -> str:
        """Generate human-readable description of an expectation"""
        column = kwargs.get("column", "")
        
        if expectation_type == "expect_column_to_exist":
            return f"Column '{column}' should exist"
        
        elif expectation_type == "expect_column_values_to_not_be_null":
            return f"Values in '{column}' should not be null"
        
        elif expectation_type == "expect_column_values_to_be_unique":
            return f"Values in '{column}' should be unique"
        
        elif expectation_type == "expect_column_values_to_be_in_set":
            value_set = kwargs.get("value_set", [])
            return f"Values in '{column}' should be one of: {', '.join(str(v) for v in value_set[:5])}{'...' if len(value_set) > 5 else ''}"
        
        elif expectation_type == "expect_column_values_to_be_between":
            min_value = kwargs.get("min_value")
            max_value = kwargs.get("max_value")
            
            if min_value is not None and max_value is not None:
                return f"Values in '{column}' should be between {min_value} and {max_value}"
            elif min_value is not None:
                return f"Values in '{column}' should be at least {min_value}"
            elif max_value is not None:
                return f"Values in '{column}' should be at most {max_value}"
            else:
                return f"Values in '{column}' should be in a valid range"
        
        elif expectation_type == "expect_column_value_lengths_to_be_between":
            min_value = kwargs.get("min_value")
            max_value = kwargs.get("max_value")
            
            if min_value is not None and max_value is not None:
                return f"Length of values in '{column}' should be between {min_value} and {max_value} characters"
            elif min_value is not None:
                return f"Length of values in '{column}' should be at least {min_value} characters"
            elif max_value is not None:
                return f"Length of values in '{column}' should be at most {max_value} characters"
            else:
                return f"Length of values in '{column}' should be in a valid range"
        
        else:
            return f"Expectation '{expectation_type}' on column '{column}'"

    def _process_cached_result(self, cached_result: RuleResult) -> Dict[str, Any]:
        """Convert cached database result to response format"""
        try:
            # Try to parse result_metadata if it's a string
            if isinstance(cached_result.result_metadata, str):
                try:
                    metadata = json.loads(cached_result.result_metadata)
                except json.JSONDecodeError:
                    metadata = {}
            else:
                metadata = cached_result.result_metadata or {}

            # Ensure metadata is a dictionary
            if not isinstance(metadata, dict):
                metadata = {}

            return {
                "rule_id": cached_result.rule_id,
                "execution_time": cached_result.execution_time.isoformat(),
                "status": cached_result.status,
                "success_count": cached_result.success_count,
                "failure_count": cached_result.failure_count,
                "error_details": cached_result.error_details,
                "result_metadata": {
                    "validation_details": metadata.get("validation_details", []),
                    "total_records": metadata.get("total_records", 0),
                    "success_rate": metadata.get("success_rate", 0.0),
                    "validation_time": metadata.get("validation_time", datetime.utcnow().isoformat())
                },
                "cached": True
            }
        except Exception as e:
            # If anything fails, return an error result
            return {
                "rule_id": cached_result.rule_id,
                "execution_time": datetime.utcnow().isoformat(),
                "status": "ERROR",
                "success_count": 0,
                "failure_count": 0,
                "error_details": f"Error processing cached result: {str(e)}",
                "result_metadata": {
                    "validation_details": [],
                    "total_records": 0,
                    "success_rate": 0.0,
                    "validation_time": datetime.utcnow().isoformat()
                },
                "cached": True
            }

    async def _save_validation_result(self, rule_id: int, result: Dict[str, Any]) -> None:
        """Save validation result to database"""
        db_result = RuleResult(
            rule_id=rule_id,
            execution_time=datetime.fromisoformat(result["execution_time"]),
            status=result["status"],
            success_count=result["success_count"],
            failure_count=result["failure_count"],
            error_details=result["error_details"],
            result_metadata=result["result_metadata"]
        )
        self.db.add(db_result)
        self.db.commit()

    async def _handle_rule_error(self, rule_id: int, error: Exception) -> Dict[str, Any]:
        """Create error result for failed rule execution"""
        error_result = {
            "rule_id": rule_id,
            "execution_time": datetime.utcnow().isoformat(),
            "status": "ERROR",
            "success_count": 0,
            "failure_count": 0,
            "error_details": str(error),
            "result_metadata": {
                "error": str(error),
                "validation_time": datetime.utcnow().isoformat()
            }
        }
        
        # Save error result to database
        await self._save_validation_result(rule_id, error_result)
        return error_result

    async def _update_summary(self, summary: Dict[str, Any], result: Dict[str, Any]) -> None:
        """Update summary statistics with result"""
        if result["status"] == "SUCCESS":
            summary["passed_rules"] += 1
        elif result["status"] == "FAILURE":
            summary["failed_rules"] += 1
        else:  # ERROR
            summary["error_rules"] += 1

        metadata = result.get("result_metadata", {})
        total_records = metadata.get("total_records", 0)
        
        summary["total_records_validated"] += total_records
        summary["total_records_passed"] += result["success_count"]
        summary["total_records_failed"] += result["failure_count"] 