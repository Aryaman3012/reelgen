# Use Node.js as base image
FROM node:18-bullseye

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Upgrade pip and install build tools
RUN python3 -m pip install --no-cache-dir --upgrade pip setuptools wheel

# Install PyTorch separately to handle its large size better
RUN pip3 install --no-cache-dir torch==2.1.0 torchaudio==2.1.0

# Copy Python requirements
COPY requirements.txt ./

# Install Python dependencies with retries for reliability
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Build TypeScript files
RUN npm run build

# Create necessary directories
RUN mkdir -p output processed_videos standardized_videos temp

# Set environment variables with defaults
ENV NODE_ENV=production \
    PORT=3000 \
    AWS_REGION=us-east-1 \
    AWS_S3_BUCKET=your-bucket-name \
    PYTHONUNBUFFERED=1

# Expose port for API
EXPOSE 3000

# Start command (will be overridden by docker-compose)
CMD ["node", "dist/server.js"] 