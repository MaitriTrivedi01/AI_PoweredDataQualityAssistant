#!/bin/bash

# Create and activate virtual environment
echo "Setting up Python virtual environment..."
python -m venv backend/venv
source backend/venv/bin/activate

# Install backend dependencies
echo "Installing backend dependencies..."
pip install -r backend/requirements.txt

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

# Create .env file if it doesn't exist
if [ ! -f backend/.env ]; then
    echo "Creating backend/.env file..."
    cp backend/.env.example backend/.env
    echo "Please update backend/.env with your Supabase and OpenAI credentials"
fi

# Make run script executable
chmod +x run.sh

echo "Setup complete! Please follow these steps:"
echo "1. Update backend/.env with your Supabase and OpenAI credentials"
echo "2. Go to your Supabase project dashboard"
echo "3. Open the SQL editor"
echo "4. Copy and paste the contents of backend/app/core/init_supabase.sql"
echo "5. Run the SQL script"
echo "6. Run the application with: ./run.sh" 