from sqlalchemy.orm import Session
from sqlalchemy import func
import pandas as pd
import numpy as np
# Comment out Great Expectations import for now
# import great_expectations as ge
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime

# Fix imports to match correct project structure
from app.models.database import Rule, Table, ArchivedRule
# Remove non-existent imports
# from app.schemas.rule import RuleCreate, RuleUpdate
# from app.db.database import engine

logger = logging.getLogger(__name__)

class RuleService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_rules(self, skip: int = 0, limit: int = 100, table_id: Optional[int] = None):
        """Get all rules, optionally filtered by table_id"""
        query = self.db.query(Rule)
        if table_id:
            query = query.filter(Rule.table_id == table_id)
        return query.offset(skip).limit(limit).all()
    
    def get_rules_by_column(self, table_id: int):
        """Get all rules for a table, grouped by column"""
        rules = self.db.query(Rule).filter(Rule.table_id == table_id).all()
        
        # Group rules by column
        column_rules = {}
        for rule in rules:
            column = rule.rule_column or "Other"
            if column not in column_rules:
                column_rules[column] = []
            column_rules[column].append(rule)
            
        return column_rules
    
    def get_rule_by_id(self, rule_id: int):
        """Get a rule by its ID"""
        return self.db.query(Rule).filter(Rule.id == rule_id).first()
    
    def toggle_rule_status(self, rule_id: int):
        """Toggle the is_active status of a rule"""
        db_rule = self.get_rule_by_id(rule_id)
        if not db_rule:
            return None
        
        db_rule.is_active = not db_rule.is_active
        db_rule.updated_at = datetime.now()
        self.db.commit()
        self.db.refresh(db_rule)
        return db_rule
    
    def archive_rule(self, rule_id: int):
        """Archive a rule instead of deleting it permanently"""
        rule = self.get_rule_by_id(rule_id)
        if not rule:
            return None
        
        # Create an archived version of the rule
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
            updated_at=rule.updated_at
        )
        
        # Add the archived rule and delete the original
        self.db.add(archived_rule)
        self.db.delete(rule)
        self.db.commit()
        self.db.refresh(archived_rule)
        
        return archived_rule
    
    def get_archived_rules(self, skip: int = 0, limit: int = 100, table_id: Optional[int] = None):
        """Get all archived rules, optionally filtered by table_id"""
        query = self.db.query(ArchivedRule)
        if table_id:
            query = query.filter(ArchivedRule.table_id == table_id)
        return query.order_by(ArchivedRule.archived_at.desc()).offset(skip).limit(limit).all()
    
    def get_archived_rule_by_id(self, archived_id: int):
        """Get an archived rule by its ID"""
        return self.db.query(ArchivedRule).filter(ArchivedRule.id == archived_id).first()
    
    def restore_rule(self, archived_id: int):
        """Restore an archived rule"""
        archived_rule = self.get_archived_rule_by_id(archived_id)
        if not archived_rule:
            return None
        
        # Create a new active rule from the archived one
        new_rule = Rule(
            name=archived_rule.name,
            description=archived_rule.description,
            table_id=archived_rule.table_id,
            rule_type=archived_rule.rule_type,
            rule_column=archived_rule.rule_column,
            expectation_config=archived_rule.expectation_config,
            is_active=archived_rule.was_active,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        # Add the new rule and delete the archived version
        self.db.add(new_rule)
        self.db.delete(archived_rule)
        self.db.commit()
        self.db.refresh(new_rule)
        
        return new_rule
    
    def delete_archived_rule(self, archived_id: int):
        """Permanently delete an archived rule"""
        archived_rule = self.get_archived_rule_by_id(archived_id)
        if not archived_rule:
            return False
        
        self.db.delete(archived_rule)
        self.db.commit()
        return True

# Keep the original functions as standalone for backward compatibility
def get_rules(db: Session, skip: int = 0, limit: int = 100, table_id: Optional[int] = None):
    """Get all rules, optionally filtered by table_id"""
    service = RuleService(db)
    return service.get_rules(skip, limit, table_id)

def get_rules_by_column(db: Session, table_id: int):
    """Get all rules for a table, grouped by column"""
    service = RuleService(db)
    return service.get_rules_by_column(table_id)

def get_rule_by_id(db: Session, rule_id: int):
    """Get a rule by its ID"""
    service = RuleService(db)
    return service.get_rule_by_id(rule_id)

def toggle_rule_status(db: Session, rule_id: int):
    """Toggle the is_active status of a rule"""
    service = RuleService(db)
    return service.toggle_rule_status(rule_id)

def archive_rule(db: Session, rule_id: int):
    """Archive a rule"""
    service = RuleService(db)
    return service.archive_rule(rule_id)

def get_archived_rules(db: Session, skip: int = 0, limit: int = 100, table_id: Optional[int] = None):
    """Get all archived rules"""
    service = RuleService(db)
    return service.get_archived_rules(skip, limit, table_id)

def get_archived_rule_by_id(db: Session, archived_id: int):
    """Get an archived rule by its ID"""
    service = RuleService(db)
    return service.get_archived_rule_by_id(archived_id)

def restore_rule(db: Session, archived_id: int):
    """Restore an archived rule"""
    service = RuleService(db)
    return service.restore_rule(archived_id)

def delete_archived_rule(db: Session, archived_id: int):
    """Permanently delete an archived rule"""
    service = RuleService(db)
    return service.delete_archived_rule(archived_id) 