from fastapi import APIRouter, Depends, HTTPException, Query, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional, Union
from ..core.database import get_db
from ..models.database import Rule, Table, RuleResult, ArchivedRule
from ..services.ai_service import AIService
from ..services.great_expectations_service import GreatExpectationsService
from ..services import rule_service
from pydantic import BaseModel, Field, validator
from datetime import datetime
import re
import logging

# Configure logging
logger = logging.getLogger(__name__)

router = APIRouter()
ai_service = AIService()
ge_service = GreatExpectationsService()

class RuleSchema(BaseModel):
    table_name: str
    name: str
    description: str
    expectation_config: dict
    is_active: bool = True

    class Config:
        from_attributes = True

class RuleResponse(BaseModel):
    id: int
    table_id: int
    name: str
    description: str | None
    rule_type: str
    expectation_config: dict
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class RuleGenerationRequest(BaseModel):
    table_name: str
    description: str
    column_name: Optional[str] = None

class RuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    rule_type: str
    expectation_config: dict
    is_active: bool = True

class RuleCreate(RuleBase):
    table_id: int

class ArchivedRuleResponse(BaseModel):
    id: int
    original_id: Optional[int]
    table_id: int
    name: str
    description: str | None
    rule_type: str
    rule_column: str | None
    expectation_config: dict
    was_active: bool
    archived_at: datetime
    created_at: datetime | None
    updated_at: datetime | None

    class Config:
        from_attributes = True

class RuleUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rule_column: Optional[str] = None
    expectation_config: Optional[dict] = None
    is_active: Optional[bool] = None

@router.get("/", response_model=List[RuleResponse])
async def list_rules(db: Session = Depends(get_db)):
    """List all rules"""
    rules = db.query(Rule).all()
    return rules

def generate_column_rules(column_name: str, column_info: dict) -> List[RuleBase]:
    """Generate appropriate rules based on column type and constraints"""
    rules = []
    column_type = column_info.get('type', '').upper()
    is_nullable = column_info.get('nullable', True)
    is_primary_key = column_info.get('primary_key', False)
    
    # Not null check for non-nullable columns
    if not is_nullable:
        rules.append(RuleBase(
            name=f"{column_name}_not_null",
            description=f"Ensures {column_name} is not null",
            rule_type="not_null",
            expectation_config={
                "expectation_type": "expect_column_values_to_not_be_null",
                "kwargs": {
                    "column": column_name
                }
            }
        ))
    
    # Primary key uniqueness check
    if is_primary_key:
        rules.append(RuleBase(
            name=f"{column_name}_unique",
            description=f"Ensures {column_name} values are unique",
            rule_type="unique",
            expectation_config={
                "expectation_type": "expect_column_values_to_be_unique",
                "kwargs": {
                    "column": column_name
                }
            }
        ))
    
    # Type-specific rules
    if 'INTEGER' in column_type:
        rules.append(RuleBase(
            name=f"{column_name}_is_integer",
            description=f"Ensures {column_name} is an integer",
            rule_type="is_integer",
            expectation_config={
                "expectation_type": "expect_column_values_to_be_in_type_list",
                "kwargs": {
                    "column": column_name,
                    "type_list": ["int64"]
                }
            }
        ))
    
    elif 'VARCHAR' in column_type or 'TEXT' in column_type:
        rules.append(RuleBase(
            name=f"{column_name}_is_string",
            description=f"Ensures {column_name} is a string",
            rule_type="is_string",
            expectation_config={
                "expectation_type": "expect_column_values_to_be_in_type_list",
                "kwargs": {
                    "column": column_name,
                    "type_list": ["object"]
                }
            }
        ))
        
        # Length check for VARCHAR
        if 'VARCHAR' in column_type:
            max_length = int(column_type.split('(')[1].split(')')[0])
            rules.append(RuleBase(
                name=f"{column_name}_max_length",
                description=f"Ensures {column_name} length is not greater than {max_length}",
                rule_type="max_length",
                expectation_config={
                    "expectation_type": "expect_column_value_lengths_to_be_between",
                    "kwargs": {
                        "column": column_name,
                        "min_value": 0,
                        "max_value": max_length
                    }
                }
            ))
            
            # Add minimum length check for name fields
            if column_name in ['first_name', 'last_name']:
                rules.append(RuleBase(
                    name=f"{column_name}_min_length",
                    description=f"Ensures {column_name} is at least 3 characters long",
                    rule_type="min_length",
                    expectation_config={
                        "expectation_type": "expect_column_value_lengths_to_be_between",
                        "kwargs": {
                            "column": column_name,
                            "min_value": 3,
                            "max_value": max_length
                        }
                    }
                ))
    
    elif 'DECIMAL' in column_type or 'NUMERIC' in column_type:
        rules.append(RuleBase(
            name=f"{column_name}_is_decimal",
            description=f"Ensures {column_name} is a decimal",
            rule_type="is_decimal",
            expectation_config={
                "expectation_type": "expect_column_values_to_be_in_type_list",
                "kwargs": {
                    "column": column_name,
                    "type_list": ["float64"]
                }
            }
        ))
        
        # For GPA specific rules
        if column_name.lower() == 'gpa':
            rules.append(RuleBase(
                name="gpa_range",
                description="Ensures GPA is between 0.0 and 4.0",
                rule_type="value_range",
                expectation_config={
                    "expectation_type": "expect_column_values_to_be_between",
                    "kwargs": {
                        "column": column_name,
                        "min_value": 0.0,
                        "max_value": 4.0
                    }
                }
            ))
    
    elif 'DATE' in column_type:
        rules.append(RuleBase(
            name=f"{column_name}_is_date",
            description=f"Ensures {column_name} is a valid date",
            rule_type="is_date",
            expectation_config={
                "expectation_type": "expect_column_values_to_be_in_type_list",
                "kwargs": {
                    "column": column_name,
                    "type_list": ["datetime64[ns]"]
                }
            }
        ))
        
        # For enrollment_date specific rules
        if column_name == 'enrollment_date':
            rules.append(RuleBase(
                name="enrollment_date_range",
                description="Ensures enrollment date is not in the future",
                rule_type="date_not_future",
                expectation_config={
                    "expectation_type": "expect_column_values_to_be_between",
                    "kwargs": {
                        "column": column_name,
                        "min_value": "1900-01-01",
                        "max_value": datetime.datetime.now().strftime("%Y-%m-%d")
                    }
                }
            ))
    
    # Email validation for email fields
    if 'email' in column_name.lower():
        rules.append(RuleBase(
            name=f"{column_name}_is_email",
            description=f"Ensures {column_name} is a valid email address",
            rule_type="is_email",
            expectation_config={
                "expectation_type": "expect_column_values_to_match_regex",
                "kwargs": {
                    "column": column_name,
                    "regex": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                }
            }
        ))
    
    return rules

def create_age_rule_from_dob(column_to_use, min_age=5, max_age=100, description=None):
    """Create an age validation rule based on date_of_birth column"""
    rule_description = description or f"Ensures student age is between {min_age} and {max_age} years"
    return {
        "name": "student_age_range",
        "description": rule_description,
        "rule_type": "derived",
        "rule_column": column_to_use,  # Store the actual source column
        "expectation_config": {
            "expectation_type": "expect_column_values_to_be_between",
            "kwargs": {
                "column": "age",  # This will be derived at validation time
                "min_value": min_age,
                "max_value": max_age,
                "mostly": 1.0
            },
            "meta": {
                "derived": True,
                "source_column": column_to_use,
                "transformation": "age_from_date_of_birth"
            }
        }
    }

def extract_age_range_from_description(description):
    """Extract age range from description text using basic pattern matching"""
    min_age, max_age = 5, 100  # Default values
    
    # Look for patterns like "between X and Y years"
    between_pattern = r"between\s+(\d+)\s+and\s+(\d+)"
    matches = re.search(between_pattern, description.lower())
    if matches:
        min_age = int(matches.group(1))
        max_age = int(matches.group(2))
        return min_age, max_age
    
    # Look for patterns like "at least X years"
    min_pattern = r"(?:at least|minimum|min|>)\s*(\d+)"
    min_matches = re.search(min_pattern, description.lower())
    if min_matches:
        min_age = int(min_matches.group(1))
    
    # Look for patterns like "at most X years" or "maximum X years"
    max_pattern = r"(?:at most|maximum|max|<)\s*(\d+)"
    max_matches = re.search(max_pattern, description.lower())
    if max_matches:
        max_age = int(max_matches.group(1))
    
    return min_age, max_age

@router.post("/generate", response_model=RuleResponse)
async def generate_rule(request: RuleGenerationRequest, db: Session = Depends(get_db)):
    """Generate a new rule from natural language description"""
    try:
        # Get the table
        table = db.query(Table).filter(Table.name == request.table_name).first()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
        
        # Get available columns for mapping
        available_columns = []
        if table.columns and isinstance(table.columns, list):
            available_columns = [col.get("name") for col in table.columns if isinstance(col, dict) and "name" in col]
        elif table.columns and isinstance(table.columns, dict):
            available_columns = list(table.columns.keys())
        
        # For age validation
        if "age" in request.description.lower():
            # Check if table has age or needs to use date_of_birth
            if "age" not in available_columns and "date_of_birth" in available_columns:
                column_to_use = "date_of_birth"
                # Extract age ranges from description
                min_age, max_age = extract_age_range_from_description(request.description)
                rule_config = create_age_rule_from_dob(column_to_use, min_age, max_age, request.description)
            else:
                column_to_use = "age" if "age" in available_columns else request.column_name
                if not column_to_use:
                    raise HTTPException(status_code=400, detail="Column name is required when age column is not available")
                
                min_age, max_age = extract_age_range_from_description(request.description)
                rule_config = {
                    "name": f"{column_to_use}_age_range",
                    "description": f"Ensures {column_to_use} is between {min_age} and {max_age}",
                    "rule_column": column_to_use,
                    "expectation_config": {
                        "expectation_type": "expect_column_values_to_be_between",
                        "kwargs": {
                            "column": column_to_use,
                            "min_value": min_age,
                            "max_value": max_age
                        }
                    }
                }

        # For name length validation, create a specific rule
        elif "name" in request.description.lower() and "length" in request.description.lower():
            column_to_use = request.column_name
            
            # If no specific column provided, try to find appropriate name columns
            if not column_to_use:
                name_columns = [col for col in available_columns if 'name' in col.lower()]
                if name_columns:
                    column_to_use = name_columns[0]
                else:
                    column_to_use = "name"  # Fallback
            
            # Extract min length from description, default to 3
            min_length = 3
            length_pattern = r"(?:at least|minimum|min)\s*(\d+)"
            length_matches = re.search(length_pattern, request.description.lower())
            if length_matches:
                min_length = int(length_matches.group(1))
            
            rule_config = {
                "name": f"{column_to_use}_length",
                "description": f"{column_to_use} should be at least {min_length} letters long",
                "rule_column": column_to_use,
                "expectation_config": {
                    "expectation_type": "expect_column_value_lengths_to_be_between",
                    "kwargs": {
                        "column": column_to_use,
                        "min_value": min_length,
                        "max_value": None
                    }
                }
            }
        
        # For email validation
        elif "email" in request.description.lower():
            # Look for email columns
            if request.column_name:
                column_to_use = request.column_name
            else:
                email_columns = [col for col in available_columns if 'email' in col.lower()]
                if email_columns:
                    column_to_use = email_columns[0]
                else:
                    column_to_use = "email"  # Fallback
            
            rule_config = {
                "name": f"{column_to_use}_valid_email",
                "description": f"{column_to_use} should be a valid email format",
                "rule_column": column_to_use,
                "expectation_config": {
                    "expectation_type": "expect_column_values_to_match_regex",
                    "kwargs": {
                        "column": column_to_use,
                        "regex": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                    }
                }
            }
        
        # For not null validation
        elif "not null" in request.description.lower() or "required" in request.description.lower():
            column_to_use = request.column_name
            if not column_to_use:
                raise HTTPException(status_code=400, detail="Column name is required for this rule type")
                
            rule_config = {
                "name": f"{column_to_use}_not_null",
                "description": f"{column_to_use} should not be null",
                "rule_column": column_to_use,
                "expectation_config": {
                    "expectation_type": "expect_column_values_to_not_be_null",
                    "kwargs": {
                        "column": column_to_use
                    }
                }
            }
        
        # For unique validation
        elif "unique" in request.description.lower():
            column_to_use = request.column_name
            if not column_to_use:
                raise HTTPException(status_code=400, detail="Column name is required for this rule type")
                
            rule_config = {
                "name": f"{column_to_use}_unique",
                "description": f"{column_to_use} should have unique values",
                "rule_column": column_to_use,
                "expectation_config": {
                    "expectation_type": "expect_column_values_to_be_unique",
                    "kwargs": {
                        "column": column_to_use
                    }
                }
            }
        
        # If no specific rule was matched, use AI service to generate one
        else:
            # Use AI service to generate rule
            rule_config = await ai_service.generate_rule(
                table_name=request.table_name, 
                description=request.description,
                column_name=request.column_name
            )
            
            # Ensure column field is set
            if not rule_config.get("rule_column") and "kwargs" in rule_config.get("expectation_config", {}):
                column_from_config = rule_config["expectation_config"]["kwargs"].get("column")
                if column_from_config:
                    rule_config["rule_column"] = column_from_config
            
            # If column is still not set and column_name was provided, use it
            if not rule_config.get("rule_column") and request.column_name:
                rule_config["rule_column"] = request.column_name
        
        # Create the rule
        rule = Rule(
            name=rule_config.get("name", "Generated Rule"),
            description=rule_config.get("description", request.description),
            table_id=table.id,
            rule_type=rule_config.get("rule_type", "custom"),
            rule_column=rule_config.get("rule_column"),
            expectation_config=rule_config.get("expectation_config"),
            is_active=rule_config.get("is_active", True)
        )
        
        db.add(rule)
        db.commit()
        db.refresh(rule)
        
        return rule
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error generating rule: {str(e)}")

@router.post("/generate/{table_name}", response_model=List[RuleResponse])
async def generate_rules(
    table_name: str,
    db: Session = Depends(get_db)
):
    """Generate rules for a table based on its schema"""
    try:
        # Get the table
        table = db.query(Table).filter(Table.name == table_name).first()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")

        # Generate rules using AI service
        rules = ai_service.generate_rules_from_schema(
            table_name,
            table.schema
        )

        if not rules:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate rules"
            )

        # Create new rules
        new_rules = []
        for rule_config in rules:
            new_rule = Rule(
                table_id=table.id,
                name=rule_config["name"],
                description=rule_config["description"],
                rule_type="auto_generated",
                expectation_config=rule_config["expectation_config"],
                is_active=True
            )
            db.add(new_rule)
            new_rules.append(new_rule)

        db.commit()
        for rule in new_rules:
            db.refresh(rule)

        return new_rules

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/table/{table_name}", response_model=List[RuleResponse])
async def get_table_rules(
    table_name: str,
    db: Session = Depends(get_db)
):
    """Get all rules for a specific table"""
    table = db.query(Table).filter(Table.name == table_name).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    rules = db.query(Rule).filter(Rule.table_id == table.id).all()
    return rules

@router.post("/", response_model=RuleResponse)
async def create_rule(rule: RuleSchema, db: Session = Depends(get_db)):
    """Create a new rule"""
    table = db.query(Table).filter(Table.name == rule.table_name).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    db_rule = Rule(
        table_id=table.id,
        name=rule.name,
        description=rule.description,
        expectation_config=rule.expectation_config,
        is_active=rule.is_active
    )
    
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    
    # Save rule to Great Expectations
    ge_service.save_rule({
        "name": rule.name,
        "expectation_config": rule.expectation_config
    })
    
    return db_rule

@router.put("/{rule_id}", response_model=RuleResponse)
async def update_rule(rule_id: int, rule: RuleSchema, db: Session = Depends(get_db)):
    """Update an existing rule"""
    db_rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    table = db.query(Table).filter(Table.name == rule.table_name).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    db_rule.table_id = table.id
    db_rule.name = rule.name
    db_rule.description = rule.description
    db_rule.expectation_config = rule.expectation_config
    db_rule.is_active = rule.is_active
    
    db.commit()
    db.refresh(db_rule)
    
    # Update rule in Great Expectations
    ge_service.save_rule({
        "name": rule.name,
        "expectation_config": rule.expectation_config
    })
    
    return db_rule

@router.delete("/{rule_id}")
async def archive_rule(rule_id: int, db: Session = Depends(get_db)):
    """Archive a rule instead of deleting it permanently"""
    # First check if the rule exists
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Archive the rule
    archived_rule = rule_service.archive_rule(db, rule_id)
    if not archived_rule:
        raise HTTPException(status_code=500, detail="Failed to archive rule")
    
    return {"message": "Rule archived successfully", "archived_rule_id": archived_rule.id}

@router.get("/archived", response_model=List[ArchivedRuleResponse])
async def list_archived_rules(
    skip: int = 0, 
    limit: int = 100,
    table_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """List all archived rules, optionally filtered by table_id"""
    archived_rules = rule_service.get_archived_rules(db, skip, limit, table_id)
    return archived_rules

@router.get("/archived/{archived_id}", response_model=ArchivedRuleResponse)
async def get_archived_rule(archived_id: int, db: Session = Depends(get_db)):
    """Get details about a specific archived rule"""
    archived_rule = rule_service.get_archived_rule_by_id(db, archived_id)
    if not archived_rule:
        raise HTTPException(status_code=404, detail="Archived rule not found")
    return archived_rule

@router.post("/archived/{archived_id}/restore", response_model=RuleResponse)
async def restore_archived_rule(archived_id: int, db: Session = Depends(get_db)):
    """Restore an archived rule to active status"""
    restored_rule = rule_service.restore_rule(db, archived_id)
    if not restored_rule:
        raise HTTPException(status_code=404, detail="Archived rule not found")
    return restored_rule

@router.delete("/archived/{archived_id}")
async def permanently_delete_rule(archived_id: int, db: Session = Depends(get_db)):
    """Permanently delete an archived rule"""
    success = rule_service.delete_archived_rule(db, archived_id)
    if not success:
        raise HTTPException(status_code=404, detail="Archived rule not found")
    return {"message": "Archived rule permanently deleted"}

@router.post("/{rule_id}/test")
async def test_rule(rule_id: int, db: Session = Depends(get_db)):
    """Test a rule against sample data"""
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Test the rule using Great Expectations
    result = await ge_service.validate_data(
        table_name=rule.table_name,
        expectations=[rule.expectation_config]
    )
    
    return result

@router.get("/table_id/{table_id}", response_model=List[RuleResponse])
async def get_rules_by_table_id(
    table_id: int,
    db: Session = Depends(get_db)
):
    """Get all rules for a specific table by table_id"""
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    rules = db.query(Rule).filter(Rule.table_id == table_id).all()
    return rules

@router.patch("/{rule_id}/toggle", response_model=Dict[str, Any])
async def toggle_rule_status(rule_id: int, db: Session = Depends(get_db)):
    """Toggle a rule's active status"""
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Toggle the status
    rule.is_active = not rule.is_active
    rule.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(rule)
    
    return {
        "id": rule.id,
        "name": rule.name,
        "is_active": rule.is_active,
        "message": f"Rule {'activated' if rule.is_active else 'deactivated'} successfully"
    }

@router.patch("/{rule_id}", response_model=RuleResponse)
async def update_rule_partial(
    rule_id: int, 
    update_data: RuleUpdateRequest, 
    db: Session = Depends(get_db)
):
    """Update specific fields of an existing rule"""
    # Get the existing rule
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Update only the fields that were provided
    if update_data.name is not None:
        rule.name = update_data.name
    
    if update_data.description is not None:
        rule.description = update_data.description
    
    if update_data.rule_column is not None:
        rule.rule_column = update_data.rule_column
    
    if update_data.expectation_config is not None:
        rule.expectation_config = update_data.expectation_config
    
    if update_data.is_active is not None:
        rule.is_active = update_data.is_active
    
    # Update the timestamp
    rule.updated_at = datetime.now()
    
    # Save changes
    db.commit()
    db.refresh(rule)
    
    # Update rule in Great Expectations if needed
    if update_data.expectation_config is not None:
        ge_service.save_rule({
            "name": rule.name,
            "expectation_config": rule.expectation_config
        })
    
    return rule

@router.post("/generate/{table_name}/columns", response_model=List[RuleResponse])
async def generate_rules_for_all_columns(
    table_name: str,
    db: Session = Depends(get_db)
):
    """Generate standard rules for all columns of a table"""
    try:
        # Get the table
        table = db.query(Table).filter(Table.name == table_name).first()
        if not table:
            raise HTTPException(status_code=404, detail="Table not found")
            
        # Extract available columns from the table
        available_columns = []
        if table.columns and isinstance(table.columns, list):
            available_columns = [col.get("name") for col in table.columns if isinstance(col, dict) and "name" in col]
        elif table.columns and isinstance(table.columns, dict):
            available_columns = list(table.columns.keys())
            
        if not available_columns:
            raise HTTPException(status_code=400, detail="No columns found in table schema")
        
        # Generate rules for each column
        new_rules = []
        
        for column_name in available_columns:
            # Skip system columns or metadata columns
            if column_name.startswith('_') or column_name in ['created_at', 'updated_at']:
                continue
                
            # Generate appropriate rule based on column name
            if 'email' in column_name.lower():
                # Email validation rule
                rule_config = {
                    "name": f"{column_name}_valid_email",
                    "description": f"Validates {column_name} is a properly formatted email address",
                    "rule_column": column_name,
                    "rule_type": "validation",
                    "expectation_config": {
                        "expectation_type": "expect_column_values_to_match_regex",
                        "kwargs": {
                            "column": column_name,
                            "regex": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                        }
                    }
                }
            elif 'date' in column_name.lower():
                # Date validation rule
                rule_config = {
                    "name": f"{column_name}_valid_date",
                    "description": f"Validates {column_name} is a valid date",
                    "rule_column": column_name,
                    "rule_type": "validation",
                    "expectation_config": {
                        "expectation_type": "expect_column_values_to_not_be_null",
                        "kwargs": {
                            "column": column_name
                        }
                    }
                }
            elif 'name' in column_name.lower():
                # Name validation rule
                rule_config = {
                    "name": f"{column_name}_not_empty",
                    "description": f"Validates {column_name} is not empty and has a reasonable length",
                    "rule_column": column_name,
                    "rule_type": "validation",
                    "expectation_config": {
                        "expectation_type": "expect_column_value_lengths_to_be_between",
                        "kwargs": {
                            "column": column_name,
                            "min_value": 1,
                            "max_value": 100
                        }
                    }
                }
            elif any(numeric_term in column_name.lower() for numeric_term in ['id', 'age', 'number', 'count', 'qty', 'amount']):
                # Numeric validation rule
                rule_config = {
                    "name": f"{column_name}_valid_number",
                    "description": f"Validates {column_name} is a valid number",
                    "rule_column": column_name,
                    "rule_type": "validation",
                    "expectation_config": {
                        "expectation_type": "expect_column_values_to_not_be_null",
                        "kwargs": {
                            "column": column_name
                        }
                    }
                }
            else:
                # Default not-null rule for other columns
                rule_config = {
                    "name": f"{column_name}_not_null",
                    "description": f"Validates {column_name} is not null",
                    "rule_column": column_name,
                    "rule_type": "validation",
                    "expectation_config": {
                        "expectation_type": "expect_column_values_to_not_be_null",
                        "kwargs": {
                            "column": column_name
                        }
                    }
                }
            
            # Create the rule
            new_rule = Rule(
                name=rule_config["name"],
                description=rule_config["description"],
                table_id=table.id,
                rule_type=rule_config["rule_type"],
                rule_column=rule_config["rule_column"],
                expectation_config=rule_config["expectation_config"],
                is_active=True
            )
            
            db.add(new_rule)
            new_rules.append(new_rule)
        
        # Commit all rules at once
        db.commit()
        
        # Refresh all rules to get their IDs
        for rule in new_rules:
            db.refresh(rule)
            
        return new_rules
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error generating rules: {str(e)}")

@router.get("/archived/table_id/{table_id}", response_model=List[Any])
async def get_archived_rules_by_table(table_id: int, db: Session = Depends(get_db)):
    """Get all archived rules for a specific table"""
    # First check if the table exists
    table = db.query(Table).filter(Table.id == table_id).first()
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Get archived rules
    archived_rules = db.query(ArchivedRule).filter(ArchivedRule.table_id == table_id).all()
    
    # Convert to list of dicts to include all fields
    result = []
    for rule in archived_rules:
        rule_dict = {c.name: getattr(rule, c.name) for c in rule.__table__.columns}
        result.append(rule_dict)
    
    return result

@router.post("/{rule_id}/archive", response_model=Dict[str, Any])
async def archive_rule(rule_id: int, db: Session = Depends(get_db)):
    """Archive a rule (move to archived_rules table)"""
    rule = db.query(Rule).filter(Rule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    # Create an archived rule entry
    archived_rule = ArchivedRule(
        original_id=rule.id,
        name=rule.name,
        description=rule.description,
        table_id=rule.table_id,
        rule_type=rule.rule_type,
        rule_column=rule.rule_column,
        expectation_config=rule.expectation_config,
        was_active=rule.is_active,
        created_at=rule.created_at,
        updated_at=rule.updated_at,
        archived_at=datetime.utcnow()
    )
    
    db.add(archived_rule)
    
    # Delete the original rule
    db.delete(rule)
    
    db.commit()
    
    return {
        "message": "Rule archived successfully",
        "archived_rule_id": archived_rule.id
    } 