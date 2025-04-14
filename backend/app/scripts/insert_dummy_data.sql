-- Create departments table if it doesn't exist
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create employees table if it doesn't exist
CREATE TABLE IF NOT EXISTS employees (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL UNIQUE,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    department_id INTEGER REFERENCES departments(id),
    position VARCHAR(100),
    hire_date DATE NOT NULL,
    salary NUMERIC(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create courses table if it doesn't exist
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    credits INTEGER NOT NULL,
    department_id INTEGER REFERENCES departments(id),
    instructor_id INTEGER REFERENCES employees(id),
    max_enrollment INTEGER,
    current_enrollment INTEGER DEFAULT 0,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Clear existing data (if any)
DELETE FROM courses;
DELETE FROM employees;
DELETE FROM departments;

-- Insert dummy departments
INSERT INTO departments (name, description) VALUES 
('Computer Science', 'Department of Computer Science and Information Technology'),
('Mathematics', 'Department of Mathematics and Statistics'),
('Physics', 'Department of Physics and Astronomy'),
('Chemistry', 'Department of Chemistry and Biochemistry'),
('Biology', 'Department of Biological Sciences'),
('Business', 'School of Business and Management'),
('Engineering', 'College of Engineering and Applied Sciences'),
('Arts', 'School of Arts and Humanities'),
('Social Sciences', 'Faculty of Social Sciences'),
('Education', 'School of Education and Learning');

-- Insert dummy employees
INSERT INTO employees (employee_id, first_name, last_name, email, department_id, position, hire_date, salary) VALUES 
('EMP001', 'John', 'Smith', 'john.smith@university.edu', 1, 'Professor', '2010-08-15', 95000.00),
('EMP002', 'Sarah', 'Johnson', 'sarah.johnson@university.edu', 1, 'Associate Professor', '2012-09-01', 82000.00),
('EMP003', 'Michael', 'Williams', 'michael.williams@university.edu', 2, 'Professor', '2008-05-20', 98000.00),
('EMP004', 'Emily', 'Brown', 'emily.brown@university.edu', 2, 'Assistant Professor', '2015-08-01', 75000.00),
('EMP005', 'David', 'Jones', 'david.jones@university.edu', 3, 'Professor', '2005-01-15', 99500.00),
('EMP006', 'Jennifer', 'Garcia', 'jennifer.garcia@university.edu', 3, 'Lecturer', '2018-01-10', 65000.00),
('EMP007', 'Robert', 'Miller', 'robert.miller@university.edu', 4, 'Professor', '2007-08-20', 97000.00),
('EMP008', 'Lisa', 'Davis', 'lisa.davis@university.edu', 4, 'Associate Professor', '2013-09-01', 83000.00),
('EMP009', 'Daniel', 'Rodriguez', 'daniel.rodriguez@university.edu', 5, 'Professor', '2009-07-15', 96000.00),
('EMP010', 'Maria', 'Martinez', 'maria.martinez@university.edu', 5, 'Assistant Professor', '2016-08-01', 76000.00),
('EMP011', 'James', 'Anderson', 'james.anderson@university.edu', 6, 'Professor', '2006-09-15', 98000.00),
('EMP012', 'Patricia', 'Thomas', 'patricia.thomas@university.edu', 6, 'Associate Professor', '2014-01-10', 84000.00),
('EMP013', 'Richard', 'Jackson', 'richard.jackson@university.edu', 7, 'Professor', '2008-08-20', 97500.00),
('EMP014', 'Elizabeth', 'White', 'elizabeth.white@university.edu', 7, 'Assistant Professor', '2017-09-01', 76500.00),
('EMP015', 'Joseph', 'Harris', 'joseph.harris@university.edu', 8, 'Professor', '2009-07-15', 96500.00),
('EMP016', 'Nancy', 'Clark', 'nancy.clark@university.edu', 8, 'Lecturer', '2019-01-10', 66000.00),
('EMP017', 'Thomas', 'Lewis', 'thomas.lewis@university.edu', 9, 'Professor', '2007-08-20', 98500.00),
('EMP018', 'Susan', 'Walker', 'susan.walker@university.edu', 9, 'Associate Professor', '2015-09-01', 85000.00),
('EMP019', 'Charles', 'Hall', 'charles.hall@university.edu', 10, 'Professor', '2010-07-15', 97000.00),
('EMP020', 'Karen', 'Allen', 'karen.allen@university.edu', 10, 'Assistant Professor', '2018-08-01', 77000.00);

-- Insert dummy courses
INSERT INTO courses (course_code, title, description, credits, department_id, instructor_id, max_enrollment, current_enrollment, start_date, end_date) VALUES 
('CS101', 'Introduction to Programming', 'Fundamentals of programming using Python', 3, 1, 1, 100, 87, '2023-01-15', '2023-05-10'),
('CS201', 'Data Structures', 'Advanced data structures and algorithms', 4, 1, 2, 80, 65, '2023-01-15', '2023-05-10'),
('CS301', 'Database Systems', 'Principles of database design and management', 3, 1, 1, 60, 52, '2023-01-15', '2023-05-10'),
('CS401', 'Artificial Intelligence', 'Introduction to AI concepts and applications', 4, 1, 2, 50, 48, '2023-01-15', '2023-05-10'),
('MATH101', 'Calculus I', 'Introduction to differential calculus', 4, 2, 3, 120, 95, '2023-01-15', '2023-05-10'),
('MATH201', 'Linear Algebra', 'Vector spaces and linear transformations', 3, 2, 4, 80, 72, '2023-01-15', '2023-05-10'),
('MATH301', 'Probability and Statistics', 'Introduction to probability theory and statistics', 3, 2, 3, 70, 58, '2023-01-15', '2023-05-10'),
('PHYS101', 'Physics I', 'Mechanics and properties of matter', 4, 3, 5, 100, 88, '2023-01-15', '2023-05-10'),
('PHYS201', 'Electricity and Magnetism', 'Principles of electricity and magnetism', 4, 3, 6, 80, 66, '2023-01-15', '2023-05-10'),
('CHEM101', 'General Chemistry', 'Fundamentals of chemistry', 4, 4, 7, 100, 82, '2023-01-15', '2023-05-10'),
('CHEM201', 'Organic Chemistry', 'Structure and properties of organic compounds', 4, 4, 8, 70, 63, '2023-01-15', '2023-05-10'),
('BIO101', 'Introduction to Biology', 'Principles of cellular and molecular biology', 4, 5, 9, 100, 85, '2023-01-15', '2023-05-10'),
('BIO201', 'Genetics', 'Principles of inheritance and gene expression', 3, 5, 10, 60, 54, '2023-01-15', '2023-05-10'),
('BUS101', 'Introduction to Business', 'Overview of business principles and practices', 3, 6, 11, 120, 110, '2023-01-15', '2023-05-10'),
('BUS201', 'Financial Accounting', 'Principles of financial accounting', 3, 6, 12, 100, 92, '2023-01-15', '2023-05-10'),
('ENG101', 'Engineering Principles', 'Introduction to engineering concepts', 3, 7, 13, 90, 82, '2023-01-15', '2023-05-10'),
('ENG201', 'Thermodynamics', 'Principles of energy and thermodynamics', 4, 7, 14, 70, 65, '2023-01-15', '2023-05-10'),
('ARTS101', 'Introduction to Fine Arts', 'Survey of art history and appreciation', 3, 8, 15, 80, 68, '2023-01-15', '2023-05-10'),
('ARTS201', 'Digital Media', 'Principles of digital design and media', 3, 8, 16, 60, 55, '2023-01-15', '2023-05-10'),
('SOC101', 'Introduction to Sociology', 'Study of human society and social behavior', 3, 9, 17, 110, 98, '2023-01-15', '2023-05-10'),
('SOC201', 'Social Psychology', 'Study of how individuals are influenced by others', 3, 9, 18, 80, 74, '2023-01-15', '2023-05-10'),
('EDU101', 'Foundations of Education', 'Introduction to educational principles', 3, 10, 19, 90, 85, '2023-01-15', '2023-05-10'),
('EDU201', 'Educational Psychology', 'Study of learning and teaching processes', 3, 10, 20, 70, 62, '2023-01-15', '2023-05-10'); 