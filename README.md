# ReelGen

A Node.js tool to generate reels by combining user-provided text-to-speech audio (using Azure OpenAI TTS) with a sequence of videos, and then overlaying the generated audio onto the concatenated video.

## Prerequisites
- Node.js (v16+ recommended)
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

### 2. Set Your Azure OpenAI API Key
- Copy your Azure OpenAI API key.
- Edit the `.env` file in the project root:
  ```env
  AZURE_API_KEY=your_azure_api_key_here
  ```

### 3. Write Your Input Text
- Open `main.ts` and set your desired input text in the `userText` variable:
  ```typescript
  const userText = `Your text here...`;
  ```

---

## Run the Project
```sh
npm start
```

- The script will:
  1. Generate TTS audio from your text.
  2. Concatenate all videos in `input_videos`.
  3. Overlay the generated audio onto the concatenated video.
  4. Output the final video to the `output` directory.

---

## Output
- The final video will be saved as `output/final_with_audio.mp4`.

## Troubleshooting
- Ensure all input videos are playable and have compatible codecs.
- If you encounter errors, check the console output for details.
- For best results, use videos with the same resolution and framerate.

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