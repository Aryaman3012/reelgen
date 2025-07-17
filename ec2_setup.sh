#!/bin/bash

# EC2 Setup Script for ReelGen
# Run this script on a fresh Ubuntu 22.04 EC2 instance

set -e  # Exit on any error

echo "🚀 Starting EC2 setup for ReelGen..."
echo "=================================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "⚡ Installing Node.js 18.x..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Python and pip
echo "🐍 Installing Python dependencies..."
sudo apt install -y python3 python3-pip python3-venv

# Install FFmpeg
echo "🎬 Installing FFmpeg..."
sudo apt install -y ffmpeg

# Install system dependencies for OpenCV
echo "🔧 Installing system dependencies..."
sudo apt install -y libgl1-mesa-glx libglib2.0-0 libsm6 libxext6 libxrender-dev libgomp1

# Install git
sudo apt install -y git

# Create directories
echo "📁 Creating necessary directories..."
mkdir -p input_videos output processed_videos

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

# Build TypeScript
echo "🔨 Building TypeScript..."
npx tsc

# Create Python virtual environment
echo "🌐 Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "🐍 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Make scripts executable
echo "🔐 Making scripts executable..."
chmod +x run_pipeline.sh
chmod +x ec2_setup.sh

# Create .env file template
echo "⚙️ Creating .env template..."
cat > .env << EOF
# Azure OpenAI Configuration
AZURE_API_KEY=your_azure_api_key_here
AZURE_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_DEPLOYMENT_NAME=your-deployment-name

# Database Configuration (if needed)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=reelgen
DB_USER=postgres
DB_PASSWORD=password
EOF

# Create userText.txt template
echo "📝 Creating userText.txt template..."
cat > userText.txt << EOF
I am testing this out. Hi I am Aryaman Singh
EOF

echo ""
echo "✅ EC2 setup completed successfully!"
echo "=================================="
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your Azure OpenAI credentials"
echo "2. Add your input videos to the input_videos/ directory"
echo "3. Edit userText.txt with your desired text"
echo "4. Run: ./run_pipeline.sh"
echo ""
echo "🎉 Your ReelGen is ready to use!" 