# Use Node.js as base image
FROM node:18-bullseye

# Install Python and FFmpeg
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy Python requirements (creating it first)
COPY requirements.txt ./

# Install Python dependencies
RUN pip3 install -r requirements.txt

# Copy the rest of the application
COPY . .

# Build TypeScript files
RUN npm run build || echo "No build script found"

# Expose port for API
EXPOSE 3000

# Start command (will be overridden by docker-compose)
CMD ["node", "src/main.js"] 