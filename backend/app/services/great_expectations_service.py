from great_expectations.core.expectation_configuration import ExpectationConfiguration
from great_expectations.validator.validator import Validator
from great_expectations.execution_engine import SqlAlchemyExecutionEngine
from sqlalchemy import create_engine, text
import logging
import os
import json
import pandas as pd
import numpy as np
from datetime import datetime
from dotenv import load_dotenv
import pathlib
from app.core.database import get_database_url
from app.core.config import settings

class GreatExpectationsService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.engine = None
        self.register_custom_transformations()

    def register_custom_transformations(self):
        """Register custom transformation functions"""
        self.column_mappings = {
            # Map requested columns to actual database columns
            "age": "date_of_birth"
        }
        self.transformations = {
            # Map transformation functions for derived columns
            "age_from_date_of_birth": lambda df, col: (
                pd.Timestamp.today().normalize() - pd.to_datetime(df[col])
            ).dt.days // 365
        }

    def _create_engine(self):
        """Create SQLAlchemy engine"""
        if self.engine is None:
            # Use the DATABASE_URL from settings
            self.logger.info(f"Using DATABASE_URL from settings")
            
            # Create SQLAlchemy engine
            self.engine = create_engine(settings.DATABASE_URL)
            
            # Log connection attempt
            self.logger.info(f"Created engine with database URL: {settings.DATABASE_URL.replace(':', ':*****@', 1) if settings.DATABASE_URL else 'None'}")
        return self.engine

    async def validate_data(self, table_name: str, rule_id: int = None, rule_config: dict = None, 
                          expectations: list = None, suite_name: str = None) -> dict:
        """
        Validate data using direct SQL queries instead of Great Expectations configuration
        
        Args:
            table_name: Name of the table to validate
            rule_id: ID of the rule being validated
            rule_config: Rule configuration containing expectations
            expectations: Direct list of expectations (alternative to rule_config)
            suite_name: Name of the expectation suite (optional)
            
        Returns:
            Validation results including success status and statistics
        """
        try:
            # Get data from the table
            engine = self._create_engine()
            query = f"SELECT * FROM {table_name}"
            df = pd.read_sql(query, engine)
            
            # Initialize results
            results = []
            total_records = len(df)
            success_count = 0
            failure_count = 0
            
            # Process expectations
            if rule_config:
                if isinstance(rule_config, str):
                    try:
                        rule_config = json.loads(rule_config)
                    except json.JSONDecodeError:
                        self.logger.error(f"Invalid rule configuration JSON: {rule_config}")
                        raise ValueError("Invalid rule configuration format")
                
                # Handle expectations format
                if "expectations" in rule_config:
                    # The config already has an expectations array
                    for expectation in rule_config["expectations"]:
                        result = self._validate_expectation(df, expectation)
                        results.append(result)
                        if result["success"]:
                            success_count += 1
                        else:
                            failure_count += 1
                elif "expectation_type" in rule_config:
                    # This is a single expectation - wrap it in an array
                    self.logger.info(f"Wrapping single expectation in expectations array: {rule_config}")
                    result = self._validate_expectation(df, rule_config)
                    results.append(result)
                    if result["success"]:
                        success_count += 1
                    else:
                        failure_count += 1
                else:
                    self.logger.error(f"Rule configuration missing expectations array: {rule_config}")
                    raise ValueError("Rule configuration must contain an 'expectations' array")
            elif expectations:
                if isinstance(expectations, list):
                    # Process a list of expectations
                    for expectation in expectations:
                        result = self._validate_expectation(df, expectation)
                        results.append(result)
                        if result["success"]:
                            success_count += 1
                        else:
                            failure_count += 1
                elif isinstance(expectations, dict) and "expectation_type" in expectations:
                    # This is a single expectation - validate directly
                    result = self._validate_expectation(df, expectations)
                    results.append(result)
                    if result["success"]:
                        success_count += 1
                    else:
                        failure_count += 1
                else:
                    raise ValueError("Invalid expectations format provided")
            else:
                raise ValueError("No expectations or rule configuration provided")
            
            # Prepare statistics
            total_expectations = success_count + failure_count
            success_rate = (success_count / total_expectations * 100) if total_expectations > 0 else 0
            
            return {
                "success": success_count > 0 and failure_count == 0,
                "statistics": {
                    "total_evaluated": total_records,
                    "successful_expectations": success_count,
                    "failed_expectations": failure_count,
                    "success_rate": success_rate
                },
                "meta": {
                    "run_id": {
                        "run_time": datetime.utcnow().isoformat(),
                        "run_name": f"validation_{table_name}_{rule_id}_{datetime.utcnow().strftime('%Y%m%d%H%M%S')}"
                    }
                },
                "results": results
            }
        
        except Exception as e:
            self.logger.error(f"Error validating data for table {table_name} with rule {rule_id}: {str(e)}")
            raise 

    def _validate_expectation(self, df: pd.DataFrame, expectation: dict) -> dict:
        """Validate a single expectation against the dataframe"""
        expectation_type = expectation.get("expectation_type")
        kwargs = expectation.get("kwargs", {})
        column = kwargs.get("column")
        
        # Debug logging
        self.logger.info(f"Validating expectation: {expectation_type} on column: {column}")
        self.logger.info(f"Total records in dataframe: {len(df)}")
        
        if not expectation_type:
            return {
                "expectation_config": {"expectation_type": "unknown", "kwargs": kwargs},
                "success": False,
                "result": {
                    "element_count": len(df),
                    "unexpected_count": len(df),
                    "unexpected_percent": 100,
                    "partial_unexpected_list": [],
                    "error": "Missing expectation_type in expectation"
                }
            }
        
        try:
            # Check if this is a derived column that needs mapping
            original_column = column
            is_derived = False
            derived_column_name = None
            transform_fn = None
            
            # Handle special case for age (derived from date_of_birth)
            if column == "age" and "age" not in df.columns and "date_of_birth" in df.columns:
                self.logger.info(f"Column 'age' requested but not found. Using date_of_birth to calculate age.")
                column = "date_of_birth"
                is_derived = True
                derived_column_name = "age"
                transform_fn = "age_from_date_of_birth"
            
            # Apply column mapping if needed
            elif column in self.column_mappings and column not in df.columns:
                mapped_column = self.column_mappings[column]
                if mapped_column in df.columns:
                    self.logger.info(f"Mapping requested column '{column}' to actual column '{mapped_column}'")
                    column = mapped_column
                    is_derived = True
                    derived_column_name = original_column
                    # Try to find an appropriate transformation
                    transform_fn = f"{original_column}_from_{column.replace(' ', '_')}"
            
            # Check if column exists in dataframe
            if column not in df.columns:
                # Try to find a matching column (case-insensitive, space-insensitive)
                matching_columns = [col for col in df.columns 
                                  if col.lower().replace('_', ' ').replace('-', ' ') == column.lower().replace('_', ' ').replace('-', ' ')]
                if matching_columns:
                    column = matching_columns[0]
                    self.logger.info(f"Column '{kwargs.get('column')}' was matched to '{column}' in the table")
                else:
                    self.logger.error(f"Column '{column}' not found in table. Available columns: {list(df.columns)}")
                    return {
                        "expectation_config": {"expectation_type": expectation_type, "kwargs": kwargs},
                        "success": False,
                        "result": {
                            "element_count": len(df),
                            "unexpected_count": len(df),
                            "unexpected_percent": 100,
                            "partial_unexpected_list": [],
                            "error": f"Column '{column}' not found in table. Available columns: {list(df.columns)}"
                        }
                    }
            
            # Transform data if this is a derived column
            if is_derived and transform_fn and transform_fn in self.transformations:
                # Create a derived column
                transform_func = self.transformations[transform_fn]
                df_copy = df.copy()
                df_copy[derived_column_name] = transform_func(df, column)
                
                # For age expectations, modify the expectation to use the derived column
                if derived_column_name == "age" and expectation_type == "expect_column_values_to_be_between":
                    # Update evaluation to use the derived age column
                    self.logger.info(f"Using derived '{derived_column_name}' column for validation")
                    column = derived_column_name
                    df = df_copy
            
            # Validate based on expectation type
            if expectation_type == "expect_column_to_exist":
                success = column in df.columns
                unexpected_count = 0 if success else len(df)
                unexpected_list = []
            
            elif expectation_type == "expect_column_values_to_not_be_null":
                mask = df[column].isna()
                success = ~mask.any()
                unexpected_count = mask.sum()
                # Get the row indices where values are null
                failed_indices = df.index[mask].tolist()
                # For null values, we can't show the values themselves (they're null)
                # So we'll include the indices
                unexpected_list = [f"Row {idx}: NULL" for idx in failed_indices[:10]]
            
            elif expectation_type == "expect_column_values_to_be_unique":
                duplicated = df[column].duplicated()
                success = ~duplicated.any()
                unexpected_count = duplicated.sum()
                # Get the actual duplicated values
                duped_values = df.loc[duplicated, column].tolist()
                unexpected_list = [f"{val}" for val in duped_values[:10]]
            
            elif expectation_type == "expect_column_values_to_be_in_set":
                value_set = kwargs.get("value_set", [])
                mask = ~df[column].isin(value_set)
                success = ~mask.any()
                unexpected_count = mask.sum()
                # Get the actual values that are not in the set
                unexpected_list = df.loc[mask, column].head(10).tolist()
            
            elif expectation_type == "expect_column_values_to_be_between":
                min_value = kwargs.get("min_value")
                max_value = kwargs.get("max_value")
                
                # Special handling for date values
                if isinstance(df[column].iloc[0], (pd.Timestamp, datetime)) or pd.api.types.is_datetime64_any_dtype(df[column]):
                    # Convert string min/max values to timestamps if needed
                    if isinstance(min_value, str):
                        min_value = pd.to_datetime(min_value)
                    if isinstance(max_value, str):
                        max_value = pd.to_datetime(max_value)
                
                if min_value is not None and max_value is not None:
                    mask = ~df[column].between(min_value, max_value)
                elif min_value is not None:
                    mask = df[column] < min_value
                elif max_value is not None:
                    mask = df[column] > max_value
                else:
                    mask = pd.Series(False, index=df.index)
                
                success = ~mask.any()
                unexpected_count = mask.sum()
                # Get the actual values outside the range
                unexpected_list = df.loc[mask, column].head(10).tolist()
            
            elif expectation_type == "expect_column_value_lengths_to_be_between":
                min_value = kwargs.get("min_value")
                max_value = kwargs.get("max_value")
                
                # Convert to string and get lengths
                lengths = df[column].astype(str).str.len()
                
                if min_value is not None and max_value is not None:
                    mask = ~lengths.between(min_value, max_value)
                elif min_value is not None:
                    mask = lengths < min_value
                elif max_value is not None:
                    mask = lengths > max_value
                else:
                    mask = pd.Series(False, index=df.index)
                
                success = ~mask.any()
                unexpected_count = mask.sum()
                # For length validation, show both values and their lengths
                failed_values = df.loc[mask, column].head(10).tolist()
                failed_lengths = lengths.loc[mask].head(10).tolist()
                unexpected_list = [f"{val} (length: {length})" for val, length in zip(failed_values, failed_lengths)]
            
            # Add handling for regex matching
            elif expectation_type == "expect_column_values_to_match_regex":
                regex = kwargs.get("regex", "")
                # Apply regex to each value
                mask = ~df[column].astype(str).str.match(regex)
                success = ~mask.any()
                unexpected_count = mask.sum()
                # Get the values that don't match the regex
                unexpected_list = df.loc[mask, column].head(10).tolist()
            
            else:
                self.logger.error(f"Unsupported expectation type: {expectation_type}")
                return {
                    "expectation_config": {"expectation_type": expectation_type, "kwargs": kwargs},
                    "success": False,
                    "result": {
                        "element_count": len(df),
                        "unexpected_count": len(df),
                        "unexpected_percent": 100,
                        "partial_unexpected_list": [],
                        "error": f"Unsupported expectation type: {expectation_type}"
                    }
                }
            
            # Convert unexpected list to serializable format and add context
            unexpected_list = self._convert_to_serializable(unexpected_list)
            
            # Calculate unexpected percent
            unexpected_percent = (unexpected_count / len(df) * 100) if len(df) > 0 else 0
            
            # Log validation details
            self.logger.info(f"Validation results for {expectation_type} on {column}:")
            self.logger.info(f"  Total records: {len(df)}")
            self.logger.info(f"  Success: {success}")
            self.logger.info(f"  Failed records: {unexpected_count}")
            self.logger.info(f"  Example failures: {unexpected_list[:5] if unexpected_list else 'None'}")
            
            # Include info about derived column in result if applicable
            result_dict = {
                "element_count": int(len(df)),
                "unexpected_count": int(unexpected_count),
                "unexpected_percent": float(unexpected_percent),
                "partial_unexpected_list": unexpected_list
            }
            
            if is_derived:
                result_dict["derived_from"] = {
                    "original_column": original_column,
                    "source_column": column if column != original_column else None,
                    "transformation": transform_fn
                }
            
            return {
                "expectation_config": {"expectation_type": expectation_type, "kwargs": kwargs},
                "success": bool(success),
                "result": result_dict
            }
            
        except Exception as e:
            self.logger.error(f"Error validating expectation {expectation_type}: {str(e)}")
            return {
                "expectation_config": {"expectation_type": expectation_type, "kwargs": kwargs},
                "success": False,
                "result": {
                    "element_count": int(len(df)),
                    "unexpected_count": int(len(df)),
                    "unexpected_percent": 100.0,
                    "partial_unexpected_list": [],
                    "error": str(e)
                }
            }
            
    def _convert_to_serializable(self, value):
        """Convert numpy and pandas types to Python native types for JSON serialization"""
        if isinstance(value, (np.int64, np.int32, np.int16, np.int8)):
            return int(value)
        elif isinstance(value, (np.float64, np.float32, np.float16)):
            return float(value)
        elif isinstance(value, (np.bool_)):
            return bool(value)
        elif isinstance(value, (pd.Series, pd.DataFrame)):
            return value.to_dict()
        elif isinstance(value, np.ndarray):
            return value.tolist()
        elif isinstance(value, list):
            return [self._convert_to_serializable(item) for item in value]
        elif isinstance(value, dict):
            return {k: self._convert_to_serializable(v) for k, v in value.items()}
        else:
            return value 