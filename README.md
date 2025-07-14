# ReelGen

A Node.js tool to generate reels by combining user-provided text-to-speech audio (using Azure OpenAI TTS) with a sequence of videos, and then overlaying the generated audio onto the concatenated video.

## Features

- 🎬 **Video Generation**: Combine multiple videos with TTS audio
- 🎤 **Text-to-Speech**: Azure OpenAI TTS integration
- 📝 **Subtitle Generation**: Automatic subtitle generation using OpenAI Whisper
- 🔧 **Video Standardization**: Automatic video format standardization
- 🌐 **Web API**: RESTful API for programmatic access

## Prerequisites
- Node.js (v16+ recommended)
- Python 3.9+ (for subtitle generation)
- ffmpeg installed and available in your PATH (or use ffmpeg-static)
- An Azure OpenAI API key for TTS

## Setup
1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Build the project:**
   ```sh
   npx tsc
   ```

## Usage

### 1. Load Input Videos
- Place your video files (`.mp4`, `.mov`, `.avi`, `.mkv`) in the `input_videos` directory at the project root.

### 2. Standardize Videos (One-time setup)
**Important:** Run this once to standardize all your videos for optimal performance:
```sh
node standardize-videos.js
```
This will:
- Convert all videos to 1280x720 resolution, 30fps, H.264 codec
- Remove audio tracks (TTS audio will be added later)
- Save standardized videos to `standardized_videos` folder
- Only needs to be run once, unless you add new videos

### 3. Set Your Azure OpenAI API Key
- Copy your Azure OpenAI API key.
- Edit the `.env` file in the project root:
  ```env
  AZURE_API_KEY=your_azure_api_key_here
  ```

### 4. Write Your Input Text
- Create a `userText.txt` file with your desired text content.

---

## Run the Project
```sh
npm generate.js
npm chunk-video.js
```

- The script will:
  1. Generate TTS audio from your text.
  2. Concatenate all videos in `input_videos`.
  3. Overlay the generated audio onto the concatenated video.
  4. Output the final video to the `output` directory.

---

## Subtitle Generation

Generate accurate subtitles for your final video using OpenAI Whisper with smart word limiting and burn them directly into the video:

### Quick Start
```sh
# Generate subtitles AND burn them into the video (all-in-one)
python generate_subtitles.py

# OR generate subtitles only (separate files)
python generate_subtitles_only.py

# OR burn existing subtitles into video (requires subtitle files)
python burn_subtitles.py
```

### What it generates:
- `final_video.srt` - Standard subtitle format for video players
- `final_video.vtt` - Web-compatible subtitle format  
- `final_video.txt` - Plain text transcript
- **`final_video_with_subtitles.mp4`** - 🔥 **New video with burned-in subtitles**

### Features:
- **🎯 Smart Text Breaking**: Automatically limits each subtitle line to 4 words maximum
- **⏱️ Intelligent Timing**: Distributes timing evenly across word-limited segments  
- **🔥 Burned-in subtitles**: Subtitles are permanently embedded in the video
- **📍 Perfect positioning**: Subtitles appear centered on screen (Alignment=5)
- **🎨 Professional styling**: White text with black outline for maximum readability
- **🔄 Automatic fallback**: Multiple ffmpeg methods ensure compatibility
- **🎵 Preserves audio**: Original audio quality is maintained
- **📦 Modular scripts**: Separate generation and burning for flexibility

### Script Options:

#### 1. All-in-One (Recommended)
```sh
python generate_subtitles.py
```
Generates subtitle files AND burns them into the video in one step.

#### 2. Generate Only  
```sh
python generate_subtitles_only.py
```
Only generates subtitle files (.srt, .vtt, .txt) without burning into video.

#### 3. Burn Only
```sh
python burn_subtitles.py
```
Burns existing subtitle files into the video (requires .srt file).

### Advanced Usage
```sh
# Use the subtitle generator directly with custom settings
python subs_ai/simple_subtitle_generator.py
```

For more details, see [subs_ai/README.md](subs_ai/README.md).

---

## Output
- The final video will be saved as `output/final_with_audio.mp4`.
- **Video with burned subtitles**: `output/final_video_with_subtitles.mp4`
- Subtitle files will be saved in the `output` directory.

## Troubleshooting
- Ensure all input videos are playable and have compatible codecs.
- If you encounter errors, check the console output for details.
- For best results, use videos with the same resolution and framerate.
- For subtitle generation, ensure FFmpeg is installed and available in PATH.

---

## License
MIT 

## API Documentation

### Register User
- **POST** `/api/register`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "name": "User Name",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  { "message": "User registered", "userId": "..." }
  ```

### Login User
- **POST** `/api/login`
- **Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response:**
  ```json
  { "token": "...", "userId": "..." }
  ```

### Save Input Text
- **POST** `/api/input-text` (Requires Auth)
- **Body:**
  ```json
  {
    "userId": "...",
    "text": "Your input text here"
  }
  ```
- **Response:**
  ```json
  { "message": "Input text saved", "inputTextId": "..." }
  ```

### Save Video
- **POST** `/api/video` (Requires Auth)
- **Body:**
  ```json
  {
    "userId": "...",
    "inputTextId": "...",
    "filePath": "output/chunks/chunk_1.mp4"
  }
  ```
- **Response:**
  ```json
  { "message": "Video saved", "videoId": "..." }
  ```

### Generate Video Chunks
- **POST** `/api/generate` (Requires Auth)
- **Body:**
  ```json
  {
    "userText": "Your input text here",
    "userId": "...",
    "inputTextId": "..."
  }
  ```
- **Response:**
  ```json
  {
    "chunks": ["output/chunks/chunk_1.mp4", ...],
    "videos": [
      {
        "_id": "...",
        "type": "video",
        "userId": "...",
        "inputTextId": "...",
        "filePath": "output/chunks/chunk_1.mp4",
        "createdAt": "..."
      },
      ...
    ]
  }
  ```

### Get Reels by Input Text
- **GET** `/api/reels?inputTextId=...` (Requires Auth)
- **Response:**
  ```json
  {
    "reels": [
      {
        "_id": "...",
        "type": "video",
        "userId": "...",
        "inputTextId": "...",
        "filePath": "output/chunks/chunk_1.mp4",
        "createdAt": "..."
      },
      ...
    ]
  }
  ``` 