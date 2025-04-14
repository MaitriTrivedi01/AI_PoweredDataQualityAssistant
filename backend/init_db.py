from app.core.database import engine
from app.models.database import Base
from sqlalchemy import text
import time

def init_db():
    print("Starting database initialization...")
    start_time = time.time()
    
    try:
        # Create all tables
        print("Creating tables...")
        Base.metadata.create_all(bind=engine)
        
        # Create the update_updated_at_column function
        print("Setting up triggers...")
        with engine.connect() as connection:
            # Create function and triggers in a single transaction
            connection.execute(text("""
                BEGIN;
                
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ language 'plpgsql';
                
                DROP TRIGGER IF EXISTS update_tables_updated_at ON tables;
                CREATE TRIGGER update_tables_updated_at
                    BEFORE UPDATE ON tables
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
                
                DROP TRIGGER IF EXISTS update_rules_updated_at ON rules;
                CREATE TRIGGER update_rules_updated_at
                    BEFORE UPDATE ON rules
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
                
                DROP TRIGGER IF EXISTS update_students_updated_at ON students;
                CREATE TRIGGER update_students_updated_at
                    BEFORE UPDATE ON students
                    FOR EACH ROW
                    EXECUTE FUNCTION update_updated_at_column();
                
                COMMIT;
            """))
            
            # Create students table
            print("Creating students table...")
            connection.execute(text("""
                CREATE TABLE IF NOT EXISTS students (
                    id SERIAL PRIMARY KEY,
                    student_id VARCHAR(20) UNIQUE NOT NULL,
                    first_name VARCHAR(50) NOT NULL,
                    last_name VARCHAR(50) NOT NULL,
                    email VARCHAR(100) UNIQUE NOT NULL,
                    date_of_birth DATE NOT NULL,
                    enrollment_date DATE NOT NULL,
                    major VARCHAR(50) NOT NULL,
                    gpa DECIMAL(3,2) CHECK (gpa >= 0 AND gpa <= 4.0),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """))
            
            # Insert sample student data
            print("Inserting sample data...")
            connection.execute(text("""
                INSERT INTO students (student_id, first_name, last_name, email, date_of_birth, enrollment_date, major, gpa)
                VALUES 
                    ('STU001', 'John', 'Doe', 'john.doe@example.com', '2000-01-15', '2023-09-01', 'Computer Science', 3.85),
                    ('STU002', 'Jane', 'Smith', 'jane.smith@example.com', '2001-03-22', '2023-09-01', 'Mathematics', 3.92),
                    ('STU003', 'Michael', 'Johnson', 'michael.j@example.com', '2000-07-10', '2023-09-01', 'Physics', 3.45),
                    ('STU004', 'Sarah', 'Williams', 'sarah.w@example.com', '2001-11-05', '2023-09-01', 'Biology', 3.78),
                    ('STU005', 'David', 'Brown', 'david.b@example.com', '2000-04-30', '2023-09-01', 'Chemistry', 3.65),
                    ('STU006', 'Emily', 'Davis', 'emily.d@example.com', '2001-09-18', '2023-09-01', 'Computer Science', 3.88),
                    ('STU007', 'James', 'Wilson', 'james.w@example.com', '2000-12-25', '2023-09-01', 'Mathematics', 3.95),
                    ('STU008', 'Lisa', 'Anderson', 'lisa.a@example.com', '2001-06-12', '2023-09-01', 'Physics', 3.72),
                    ('STU009', 'Robert', 'Taylor', 'robert.t@example.com', '2000-08-20', '2023-09-01', 'Biology', 3.82),
                    ('STU010', 'Jennifer', 'Martinez', 'jennifer.m@example.com', '2001-02-28', '2023-09-01', 'Chemistry', 3.91)
                ON CONFLICT (student_id) DO NOTHING;
            """))
            
            connection.commit()
            
        end_time = time.time()
        print(f"Database initialization completed in {end_time - start_time:.2f} seconds!")
        
    except Exception as e:
        print(f"Error during database initialization: {str(e)}")
        raise

if __name__ == "__main__":
    init_db() 