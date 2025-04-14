# Importing Dummy Data into Supabase

This guide provides instructions for importing dummy data for courses, departments, and employees tables into your Supabase database.

## Method 1: Using the Supabase SQL Editor (Recommended)

1. Log in to your Supabase dashboard
2. Navigate to the SQL Editor tab
3. Create a new query
4. Copy and paste the entire contents of `insert_dummy_data.sql` into the SQL Editor
5. Click "Run" to execute the SQL statements

If you prefer to run statements one by one:

1. Copy each CREATE TABLE statement separately and run them
2. Then copy and run the INSERT statements for each table in order:
   - First departments (since employees reference departments)
   - Then employees (since courses reference both)
   - Finally courses

## Method 2: Using the JavaScript Import Script

Alternatively, you can use the provided Node.js script to import the data programmatically:

1. Install dependencies:
   ```
   npm install @supabase/supabase-js
   ```

2. Set environment variables for your Supabase credentials:
   ```
   export SUPABASE_URL="https://your-project-id.supabase.co"
   export SUPABASE_KEY="your-service-role-key"
   ```

3. Run the import script:
   ```
   node supabase_import.js
   ```

Note: This requires that your Supabase instance allows executing arbitrary SQL via RPC or has the tables already created.

## Method 3: Manually Creating Data through the Supabase Dashboard

If you prefer to insert data manually:

1. Go to the "Table Editor" in your Supabase dashboard
2. Create tables with the following structure:

### Departments Table
- id (SERIAL, primary key)
- name (VARCHAR, not null)
- description (TEXT)
- created_at (TIMESTAMP with default)
- updated_at (TIMESTAMP with default)

### Employees Table
- id (SERIAL, primary key)
- employee_id (VARCHAR, unique, not null)
- first_name (VARCHAR, not null)
- last_name (VARCHAR, not null)
- email (VARCHAR, unique, not null)
- department_id (INTEGER, foreign key to departments.id)
- position (VARCHAR)
- hire_date (DATE, not null)
- salary (NUMERIC)
- is_active (BOOLEAN, default true)
- created_at (TIMESTAMP with default)
- updated_at (TIMESTAMP with default)

### Courses Table
- id (SERIAL, primary key)
- course_code (VARCHAR, unique, not null)
- title (VARCHAR, not null)
- description (TEXT)
- credits (INTEGER, not null)
- department_id (INTEGER, foreign key to departments.id)
- instructor_id (INTEGER, foreign key to employees.id)
- max_enrollment (INTEGER)
- current_enrollment (INTEGER, default 0)
- start_date (DATE)
- end_date (DATE)
- is_active (BOOLEAN, default true)
- created_at (TIMESTAMP with default)
- updated_at (TIMESTAMP with default)

3. Then manually insert the records from the SQL file into each table. 