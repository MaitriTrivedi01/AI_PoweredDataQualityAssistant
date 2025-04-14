# AI-Powered Data Quality Assistant

A comprehensive data quality management tool with AI-assisted rule generation and validation reporting.

## Features

- **Data Quality Rules**: Create, manage, and apply rules to your data
- **AI Rule Generation**: Automatically generate rules based on your data schema and descriptions
- **Smart Suggestions**: Get intelligent text suggestions when writing rule descriptions
- **Validation Reports**: Run quality checks and view detailed reports
- **Quality History**: Track data quality over time with historical reporting

## Tech Stack

- **Frontend**: Next.js with Chakra UI
- **Backend**: FastAPI + PostgreSQL
- **AI Services**: OpenAI integration for NLP-based rule generation
- **Data Validation**: Great Expectations for data validation

## Getting Started

### Prerequisites

- Node.js 16+
- Python 3.8+
- PostgreSQL database

### Installation

1. Clone the repository
```bash
git clone https://github.com/MaitriTrivedi01/AI_PoweredDataQualityAssistant.git
cd AI_PoweredDataQualityAssistant
```

2. Setup backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Setup frontend
```bash
cd frontend
npm install
```

4. Configure environment variables
   - Create `.env` files in both frontend and backend directories
   - Configure database connection and API keys

5. Run the application
```bash
# Backend
cd backend
uvicorn app.main:app --reload

# Frontend
cd frontend
npm run dev
```

## Acknowledgments

Created as part of a data quality management initiative to improve data governance and reliability.
