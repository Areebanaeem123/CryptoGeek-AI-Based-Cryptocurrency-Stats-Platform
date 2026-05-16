FROM python:3.9

# Set working directory
WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Hugging Face uses port 7860 by default
CMD ["uvicorn", "step6_api_gateway.main:app", "--host", "0.0.0.0", "--port", "7860"]
