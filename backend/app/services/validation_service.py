from great_expectations.data_context import DataContext
from great_expectations.core.batch import BatchRequest
from great_expectations.core.expectation_configuration import ExpectationConfiguration
from great_expectations.checkpoint import SimpleCheckpoint
from sqlalchemy.orm import Session
from app.models.database import Rule, RuleResult
from datetime import datetime
import os
import json
import traceback

class ValidationService:
    def __init__(self, db: Session):
        self.db = db
        # Initialize GE context with the correct path
        ge_root_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "great_expectations")
        self.context = DataContext(context_root_dir=ge_root_dir)

    async def validate_table(self, table_name: str, rule_ids: list[int]):
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
            for rule_id in rule_ids:
                try:
                    rule = self.db.query(Rule).filter(Rule.id == rule_id).first()
                    if not rule:
                        print(f"Rule {rule_id} not found")
                        continue

                    print(f"Processing rule {rule_id}: {rule.name}")
                    print(f"Expectation config: {rule.expectation_config}")

                    # Create batch request using the configured datasource
                    batch_request = BatchRequest(
                        datasource_name="my_datasource",
                        data_connector_name="default_configured_data_connector_name",
                        data_asset_name="students"
                    )

                    # Get the rule's expectations
                    if isinstance(rule.expectation_config, str):
                        expectations = json.loads(rule.expectation_config)
                    else:
                        expectations = rule.expectation_config

                    print(f"Parsed expectations: {expectations}")

                    # Create expectation suite
                    suite_name = f"rule_{rule_id}_suite"
                    suite = self.context.create_expectation_suite(
                        expectation_suite_name=suite_name,
                        overwrite_existing=True
                    )
                    
                    # Add expectations to the suite
                    for expectation in expectations.get("expectations", []):
                        print(f"Adding expectation: {expectation}")
                        # Convert dict to ExpectationConfiguration
                        expectation_config = ExpectationConfiguration(
                            expectation_type=expectation["expectation_type"],
                            kwargs=expectation["kwargs"]
                        )
                        suite.add_expectation(expectation_config)
                    
                    # Save the suite
                    self.context.save_expectation_suite(suite)

                    try:
                        # Create a checkpoint
                        checkpoint = SimpleCheckpoint(
                            f"rule_{rule_id}_checkpoint",
                            self.context,
                            validations=[
                                {
                                    "batch_request": batch_request,
                                    "expectation_suite_name": suite_name
                                }
                            ],
                            runtime_configuration={
                                "result_format": {
                                    "result_format": "COMPLETE",
                                    "include_unexpected_rows": True
                                }
                            }
                        )

                        print("Running checkpoint validation...")
                        # Run validation
                        checkpoint_result = checkpoint.run()
                        validation_result = checkpoint_result.list_validation_results()[0]
                        
                        print(f"Validation result: {validation_result.to_json_dict()}")
                        
                        # Process results
                        success = validation_result.success
                        results_list = validation_result.results
                        
                        # Calculate success and failure counts
                        total_records = 0
                        success_count = 0
                        failure_count = 0
                        
                        # Process each expectation result
                        validation_details = []
                        for result in results_list:
                            result_dict = result.to_json_dict()
                            print(f"Result details: {result_dict}")
                            
                            # Extract result details
                            result_details = result_dict.get("result", {})
                            total_records = result_details.get("element_count", 0)
                            unexpected_count = result_details.get("unexpected_count", 0)
                            unexpected_percent = result_details.get("unexpected_percent", 0)
                            
                            if result_dict.get("success"):
                                success_count += total_records
                            else:
                                success_count += total_records - unexpected_count
                                failure_count += unexpected_count
                            
                            validation_details.append({
                                "expectation_type": result_dict.get("expectation_config", {}).get("expectation_type"),
                                "column": result_dict.get("expectation_config", {}).get("kwargs", {}).get("column"),
                                "success": result_dict.get("success"),
                                "element_count": total_records,
                                "unexpected_count": unexpected_count,
                                "unexpected_percent": unexpected_percent,
                                "unexpected_rows": result_details.get("unexpected_list", []),
                                "observed_value": result_details.get("observed_value"),
                                "missing_count": result_details.get("missing_count", 0),
                                "missing_percent": result_details.get("missing_percent", 0)
                            })

                        # Create rule result
                        rule_result = RuleResult(
                            rule_id=rule_id,
                            execution_time=datetime.utcnow(),
                            status="SUCCESS" if success else "FAILURE",
                            success_count=success_count,
                            failure_count=failure_count,
                            error_details=None,
                            result_metadata={
                                "validation_details": validation_details,
                                "total_records": total_records,
                                "success_rate": (success_count / total_records * 100) if total_records > 0 else 0,
                                "validation_time": datetime.utcnow().isoformat()
                            }
                        )

                        self.db.add(rule_result)
                        results.append(rule_result)

                        # Update summary
                        if success:
                            summary["passed_rules"] += 1
                        else:
                            summary["failed_rules"] += 1

                        summary["total_records_validated"] += total_records
                        summary["total_records_passed"] += success_count
                        summary["total_records_failed"] += failure_count

                    except Exception as validation_error:
                        print(f"Validation error for rule {rule_id}: {str(validation_error)}")
                        print(f"Traceback: {traceback.format_exc()}")
                        # Handle validation errors
                        error_result = RuleResult(
                            rule_id=rule_id,
                            execution_time=datetime.utcnow(),
                            status="ERROR",
                            success_count=0,
                            failure_count=0,
                            error_details=str(validation_error),
                            result_metadata={
                                "error": str(validation_error),
                                "traceback": traceback.format_exc(),
                                "validation_time": datetime.utcnow().isoformat()
                            }
                        )
                        self.db.add(error_result)
                        results.append(error_result)
                        summary["error_rules"] += 1

                except Exception as rule_error:
                    print(f"Error processing rule {rule_id}: {str(rule_error)}")
                    print(f"Traceback: {traceback.format_exc()}")
                    error_result = RuleResult(
                        rule_id=rule_id,
                        execution_time=datetime.utcnow(),
                        status="ERROR",
                        success_count=0,
                        failure_count=0,
                        error_details=str(rule_error),
                        result_metadata={
                            "error": str(rule_error),
                            "traceback": traceback.format_exc(),
                            "validation_time": datetime.utcnow().isoformat()
                        }
                    )
                    self.db.add(error_result)
                    results.append(error_result)
                    summary["error_rules"] += 1

            # Calculate overall success rate
            if summary["total_records_validated"] > 0:
                summary["overall_success_rate"] = (
                    summary["total_records_passed"] / summary["total_records_validated"]
                ) * 100

            self.db.commit()
            return results, summary

        except Exception as e:
            print(f"General error in validate_table: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            self.db.rollback()
            raise e 