from sqlalchemy import Column, Integer, String, JSON, DateTime, ForeignKey, Boolean, Float, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import sqlalchemy as sa

Base = declarative_base()

class Database(Base):
    __tablename__ = "databases"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    connection_string = Column(String(500), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    tables = relationship("Table", back_populates="database", cascade="all, delete-orphan")

class Table(Base):
    __tablename__ = "tables"
    
    id = Column(Integer, primary_key=True, index=True)
    database_id = Column(Integer, ForeignKey("databases.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), index=True)
    schema = Column(String(100))
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    columns = Column(JSON, nullable=True)
    row_count = Column(Integer, nullable=True)
    
    database = relationship("Database", back_populates="tables")
    rules = relationship("Rule", back_populates="table", cascade="all, delete-orphan")
    reports = relationship("ValidationReport", back_populates="table", cascade="all, delete-orphan")
    
    __table_args__ = (
        sa.UniqueConstraint('database_id', 'name', name='unique_table_name_per_database'),
    )

class Rule(Base):
    __tablename__ = "rules"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    table_id = Column(Integer, ForeignKey("tables.id", ondelete="CASCADE"))
    rule_type = Column(String(50), nullable=False)
    rule_column = Column(String(100), nullable=True)
    expectation_config = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)
    
    table = relationship("Table", back_populates="rules")
    results = relationship("RuleResult", back_populates="rule", cascade="all, delete-orphan")

class RuleResult(Base):
    __tablename__ = "rule_results"
    
    id = Column(Integer, primary_key=True, index=True)
    rule_id = Column(Integer, ForeignKey("rules.id", ondelete="CASCADE"))
    execution_time = Column(DateTime(timezone=True), default=datetime.utcnow)
    status = Column(String(50), nullable=False)
    success_count = Column(Integer, default=0)
    failure_count = Column(Integer, default=0)
    error_details = Column(JSON)
    result_metadata = Column(JSON)
    
    rule = relationship("Rule", back_populates="results")

class ValidationReport(Base):
    __tablename__ = "validation_reports"

    id = Column(Integer, primary_key=True, index=True)
    table_id = Column(Integer, ForeignKey("tables.id", ondelete="CASCADE"))
    report_name = Column(String(100))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    rule_ids = Column(JSON, nullable=True)  # Store list of rule IDs used
    summary = Column(JSON, nullable=True)  # Store summary metrics
    report_data = Column(JSON, nullable=True)  # Store full report data

    # Relationship to table
    table = relationship("Table", back_populates="reports")

class ArchivedRule(Base):
    __tablename__ = "archived_rules"
    
    id = Column(Integer, primary_key=True, index=True)
    original_id = Column(Integer, nullable=True)  # Original rule ID if available
    name = Column(String, nullable=False)
    description = Column(String)
    table_id = Column(Integer, ForeignKey("tables.id", ondelete="CASCADE"))
    rule_type = Column(String(50), nullable=False)
    rule_column = Column(String(100), nullable=True)
    expectation_config = Column(JSON, nullable=False)
    was_active = Column(Boolean, default=True)
    archived_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    
    table = relationship("Table") 