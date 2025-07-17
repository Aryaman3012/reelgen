#!/bin/bash

# Video processing pipeline script
# Executes commands sequentially, waiting for each to complete

echo "Starting video processing pipeline..."
echo "========================================"

# Activate Python virtual environment
source venv/bin/activate

# Command 1: Generate initial files
echo ""
echo "[1/5] Running: node generate.js"
if node generate.js; then
    echo "Success: generate.js completed successfully"
else
    echo "Error in generate.js"
    exit 1
fi

# Command 2: Generate subtitles
echo ""
echo "[2/5] Running: python3 ./generate_subtitles_only.py"
if python3 ./generate_subtitles_only.py; then
    echo "Success: generate_subtitles_only.py completed successfully"
else
    echo "Error in generate_subtitles_only.py"
    exit 1
fi

# Command 3: Burn subtitles
echo ""
echo "[3/5] Running: python3 burn_subtitles.py"
if python3 burn_subtitles.py; then
    echo "Success: burn_subtitles.py completed successfully"
else
    echo "Error in burn_subtitles.py"
    exit 1
fi

# Command 4: Chunk video
echo ""
echo "[4/5] Running: node ./chunk-video.js"
if node ./chunk-video.js; then
    echo "Success: chunk-video.js completed successfully"
else
    echo "Error in chunk-video.js"
    exit 1
fi

# Command 5: Add text overlay to video chunks
echo ""
echo "[5/5] Running: python3 ./video_overlay_opencv.py"
if python3 ./video_overlay_opencv.py; then
    echo "Success: video_overlay_opencv.py completed successfully"
else
    echo "Error in video_overlay_opencv.py"
    exit 1
fi

echo ""
echo "========================================"
echo "All commands completed successfully!"
echo "Video processing pipeline finished." 