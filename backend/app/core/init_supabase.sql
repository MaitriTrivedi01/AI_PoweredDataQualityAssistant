-- Drop existing tables if they exist
DROP TABLE IF EXISTS rule_results;
DROP TABLE IF EXISTS rules;
DROP TABLE IF EXISTS tables;

-- Create tables table to store database table information
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    schema VARCHAR(255) NOT NULL,
    columns JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create rules table to store data quality rules
CREATE TABLE IF NOT EXISTS rules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    table_id INTEGER REFERENCES tables(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL,
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create rule_results table to store execution results
CREATE TABLE IF NOT EXISTS rule_results (
    id SERIAL PRIMARY KEY,
    rule_id INTEGER REFERENCES rules(id) ON DELETE CASCADE,
    execution_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    error_details JSONB,
    result_metadata JSONB
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updating timestamp
CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_updated_at
    BEFORE UPDATE ON rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(10),
    department VARCHAR(50) NOT NULL,
    gpa DECIMAL(3,2) CHECK (gpa >= 0.0 AND gpa <= 4.0),
    enrollment_date DATE NOT NULL,
    graduation_year INTEGER,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updating timestamp
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON students
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_students_department ON students(department);
CREATE INDEX IF NOT EXISTS idx_students_student_id ON students(student_id);

-- Insert sample data
INSERT INTO students (
    student_id, first_name, last_name, email, date_of_birth, 
    gender, department, gpa, enrollment_date, graduation_year
) VALUES 
    ('2024001', 'John', 'Doe', 'john.doe@college.edu', '2002-05-15', 
     'Male', 'Computer Science', 3.75, '2020-09-01', 2024),
    ('2024002', 'Jane', 'Smith', 'jane.smith@college.edu', '2003-02-20', 
     'Female', 'Electrical Engineering', 3.90, '2020-09-01', 2024),
    ('2024003', 'Alice', 'Johnson', 'alice.j@college.edu', '2002-11-30', 
     'Female', 'Computer Science', 3.45, '2020-09-01', 2024),
    ('2025001', 'Bob', 'Wilson', 'bob.wilson@college.edu', '2003-07-25', 
     'Male', 'Mechanical Engineering', 3.20, '2021-09-01', 2025),
    ('2025002', 'Emma', 'Brown', 'emma.b@college.edu', '2003-09-12', 
     'Female', 'Data Science', 3.95, '2021-09-01', 2025); 