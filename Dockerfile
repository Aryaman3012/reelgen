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

# Install ALL Node.js dependencies (including dev dependencies)
RUN npm install --production=false

# Upgrade pip and install build tools
RUN python3 -m pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy Python requirements
COPY requirements.txt ./

# Install Python dependencies with CPU-only PyTorch first
RUN pip3 install --no-cache-dir --index-url https://download.pytorch.org/whl/cpu torch==2.1.0 torchaudio==2.1.0 && \
    pip3 install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Create necessary directories first
RUN mkdir -p output processed_videos standardized_videos temp

# Build TypeScript files (with error output)
RUN npm run build || (echo "TypeScript build failed" && exit 1)

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