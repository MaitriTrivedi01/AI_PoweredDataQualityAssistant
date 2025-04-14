-- Create tables table to store database table information
CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    schema VARCHAR(255) NOT NULL,
    columns JSONB NOT NULL,
    description TEXT,
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
    expectation_config JSONB NOT NULL,
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