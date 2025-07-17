# ReelGen Pipeline API Documentation

This document describes the REST API endpoints for the ReelGen video processing pipeline.

## Base URL
```
http://localhost:3000
```

## Authentication
Currently, no authentication is required for pipeline endpoints. All endpoints are publicly accessible.

## Pipeline Overview

The ReelGen pipeline consists of 5 main steps:
1. **Generate** - Create TTS audio and combine with videos
2. **Subtitles** - Generate subtitle files using Whisper
3. **Burn Subtitles** - Burn subtitles into the video
4. **Chunk** - Split video into segments
5. **Overlay** - Add text overlays to video chunks

## Endpoints

### Health Check

#### GET /health
Check if the API server is running.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

---

### Pipeline Steps

#### 1. Generate Video with TTS
**POST /api/pipeline/generate**

Equivalent to running `node generate.js`. Generates TTS audio from text and combines with input videos.

**Request Body:**
```json
{
  "text": "Your text to convert to speech",
  "outputDir": "output"  // optional, defaults to 'output'
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video generation completed successfully",
  "files": {
    "finalVideo": "path/to/final_with_audio.mp4",
    "outputDirectory": "path/to/output"
  },
  "logs": {
    "stdout": "...",
    "stderr": "..."
  }
}
```

#### 2. Generate Subtitles
**POST /api/pipeline/subtitles**

Equivalent to running `python3 generate_subtitles_only.py`. Generates subtitle files using OpenAI Whisper.

**Request Body:**
```json
{
  "videoPath": "output/final_with_audio.mp4",  // optional
  "modelType": "base"  // optional: tiny, base, small, medium, large
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subtitle generation completed successfully",
  "files": {
    "srt": "path/to/subtitles.srt",
    "vtt": "path/to/subtitles.vtt",
    "txt": "path/to/transcript.txt"
  },
  "videoPath": "output/final_with_audio.mp4",
  "logs": {
    "stdout": "...",
    "stderr": "..."
  }
}
```

#### 3. Burn Subtitles
**POST /api/pipeline/burn-subtitles**

Equivalent to running `python3 burn_subtitles.py`. Burns subtitle files into the video.

**Request Body:**
```json
{
  "videoPath": "output/final_with_audio.mp4",  // optional
  "subtitlePath": "output/final_with_audio.srt",  // optional
  "outputPath": "output/final_video_with_subtitles.mp4"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Subtitle burning completed successfully",
  "files": {
    "input": "output/final_with_audio.mp4",
    "subtitles": "output/final_with_audio.srt",
    "output": "output/final_video_with_subtitles.mp4",
    "outputExists": true
  },
  "logs": {
    "stdout": "...",
    "stderr": "..."
  }
}
```

#### 4. Chunk Video
**POST /api/pipeline/chunk**

Equivalent to running `node chunk-video.js`. Splits the video into smaller segments.

**Request Body:**
```json
{
  "videoPath": "output/final_video_with_subtitles.mp4",  // optional
  "outputDir": "output/chunks",  // optional
  "minChunk": 60,  // optional, seconds
  "maxChunk": 90   // optional, seconds
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video chunking completed successfully",
  "input": "output/final_video_with_subtitles.mp4",
  "outputDirectory": "output/chunks",
  "chunks": [
    {
      "filename": "chunk_1.mp4",
      "path": "/full/path/to/chunk_1.mp4",
      "relativePath": "output/chunks/chunk_1.mp4"
    }
  ],
  "chunkCount": 1,
  "logs": {
    "stdout": "...",
    "stderr": "..."
  }
}
```

#### 5. Add Video Overlay
**POST /api/pipeline/overlay**

Equivalent to running `python3 video_overlay_opencv.py`. Adds text overlays to video chunks.

**Request Body:**
```json
{
  "text": "Text to overlay on videos",  // optional, uses userText.txt if not provided
  "chunksDir": "output/chunks",  // optional
  "outputDir": "processed_videos"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Video overlay completed successfully",
  "inputDirectory": "output/chunks",
  "outputDirectory": "processed_videos",
  "processedVideos": [
    {
      "filename": "video_1.mp4",
      "path": "/full/path/to/video_1.mp4",
      "relativePath": "processed_videos/video_1.mp4"
    }
  ],
  "videoCount": 1,
  "logs": {
    "stdout": "...",
    "stderr": "..."
  }
}
```

---

### Complete Pipeline

#### Run All Steps
**POST /api/pipeline/run-all**

Equivalent to running the complete `run_pipeline.ps1` script. Executes all 5 steps in sequence.

**Request Body:**
```json
{
  "text": "Your text to convert to video reels"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Complete pipeline executed successfully",
  "inputText": "Your text to convert to video reels",
  "results": [
    {
      "step": 1,
      "name": "generate",
      "success": true,
      "stdout": "...",
      "stderr": "..."
    },
    {
      "step": 2,
      "name": "subtitles",
      "success": true,
      "stdout": "...",
      "stderr": "..."
    }
    // ... more steps
  ],
  "finalVideos": [
    {
      "filename": "video_1.mp4",
      "path": "/full/path/to/video_1.mp4",
      "relativePath": "processed_videos/video_1.mp4"
    }
  ],
  "totalSteps": 5,
  "completedSteps": 5
}
```

---

### Utility Endpoints

#### Get Pipeline Status
**GET /api/pipeline/status**

Get current status of the pipeline and list all output files.

**Response:**
```json
{
  "directories": {
    "output": {
      "exists": true,
      "files": [
        {
          "name": "final_with_audio.mp4",
          "path": "/full/path/to/final_with_audio.mp4",
          "relativePath": "output/final_with_audio.mp4"
        }
      ]
    },
    "processed": {
      "exists": true,
      "files": []
    },
    "chunks": {
      "exists": true,
      "files": []
    }
  },
  "files": {
    "userText": "Your input text content",
    "finalVideo": true,
    "finalVideoWithSubtitles": true,
    "subtitles": {
      "srt": true,
      "vtt": true,
      "txt": true
    }
  }
}
```

#### Cleanup Directories
**DELETE /api/pipeline/cleanup**

Clean up output directories.

**Request Body:**
```json
{
  "directories": ["output", "processed_videos"]  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cleanup completed",
  "results": [
    {
      "directory": "output",
      "success": true,
      "message": "Cleaned output directory"
    },
    {
      "directory": "processed_videos",
      "success": true,
      "message": "Cleaned processed_videos directory"
    }
  ]
}
```

---

### Static File Access

The API serves static files from the following directories:

- **Output files**: `http://localhost:3000/output/`
- **Processed videos**: `http://localhost:3000/processed_videos/`

Example:
```
http://localhost:3000/output/final_with_audio.mp4
http://localhost:3000/processed_videos/video_1.mp4
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error description",
  "stack": "Stack trace (in development mode)"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request (missing required parameters)
- `404` - Not Found (endpoint doesn't exist)
- `500` - Internal Server Error

---

## Usage Examples

### Complete Pipeline (Recommended)
```bash
# Run the complete pipeline
curl -X POST http://localhost:3000/api/pipeline/run-all \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world, this is my first reel!"}'
```

### Individual Steps
```bash
# Step 1: Generate video
curl -X POST http://localhost:3000/api/pipeline/generate \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world!"}'

# Step 2: Generate subtitles
curl -X POST http://localhost:3000/api/pipeline/subtitles \
  -H "Content-Type: application/json" \
  -d '{}'

# Step 3: Burn subtitles
curl -X POST http://localhost:3000/api/pipeline/burn-subtitles \
  -H "Content-Type: application/json" \
  -d '{}'

# Step 4: Chunk video
curl -X POST http://localhost:3000/api/pipeline/chunk \
  -H "Content-Type: application/json" \
  -d '{}'

# Step 5: Add overlays
curl -X POST http://localhost:3000/api/pipeline/overlay \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello world!"}'
```

### Check Status
```bash
curl http://localhost:3000/api/pipeline/status
```

### Cleanup
```bash
curl -X DELETE http://localhost:3000/api/pipeline/cleanup \
  -H "Content-Type: application/json" \
  -d '{"directories": ["output", "processed_videos"]}'
```

---

## Development

### Starting the Server
```bash
# Build TypeScript
npm run build

# Start the server
npm start

# Or directly run the compiled server
node dist/server.js
```

### Environment Variables
```env
PORT=3000
AZURE_API_KEY=your_azure_api_key
AZURE_ENDPOINT=https://your-resource.openai.azure.com/
```

### Prerequisites
Make sure you have:
- Node.js (v16+)
- Python 3.9+
- FFmpeg
- All dependencies installed (`npm install` and `pip install -r requirements.txt`)

---

## EC2 Deployment

After setting up the server on EC2 using the provided setup scripts, you can access the API at:
```
http://your-ec2-public-ip:3000
```

Make sure to:
1. Configure security groups to allow port 3000
2. Set up proper environment variables
3. Use PM2 or similar for production deployment

```bash
# Install PM2 globally
npm install -g pm2

# Start the server with PM2
pm2 start dist/server.js --name reelgen-api

# Save PM2 configuration
pm2 save
pm2 startup
``` 