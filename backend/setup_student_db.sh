#!/bin/bash

# Drop existing tables
PGPASSWORD=$DB_PASSWORD psql -h aws-0-ap-south-1.pooler.supabase.com -U postgres.tppovcrbrnfghxmslfcs -d postgres -c "DROP TABLE IF EXISTS students, rule_results, rules, tables CASCADE;"

# Execute the SQL file to create system tables
PGPASSWORD=$DB_PASSWORD psql -h aws-0-ap-south-1.pooler.supabase.com -U postgres.tppovcrbrnfghxmslfcs -d postgres -f app/core/init_system_tables.sql

# Execute the SQL file to create the students table
PGPASSWORD=$DB_PASSWORD psql -h aws-0-ap-south-1.pooler.supabase.com -U postgres.tppovcrbrnfghxmslfcs -d postgres -f app/core/init_student_db.sql

# Register the table in our system
PYTHONPATH=. python app/scripts/register_student_table.py 