# Video processing pipeline script
# Executes commands sequentially, waiting for each to complete

Write-Host "Starting video processing pipeline..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

# Command 1: Generate initial files
Write-Host "`n[1/5] Running: node generate.js" -ForegroundColor Yellow
try {
    & node generate.js
    if ($LASTEXITCODE -ne 0) {
        throw "node generate.js failed with exit code $LASTEXITCODE"
    }
    Write-Host "Success: generate.js completed successfully" -ForegroundColor Green
} catch {
    Write-Host "Error in generate.js: $_" -ForegroundColor Red
    exit 1
}

# Command 2: Generate subtitles
Write-Host "`n[2/5] Running: python .\generate_subtitles_only.py" -ForegroundColor Yellow
try {
    & python .\generate_subtitles_only.py
    if ($LASTEXITCODE -ne 0) {
        throw "python generate_subtitles_only.py failed with exit code $LASTEXITCODE"
    }
    Write-Host "Success: generate_subtitles_only.py completed successfully" -ForegroundColor Green
} catch {
    Write-Host "Error in generate_subtitles_only.py: $_" -ForegroundColor Red
    exit 1
}

# Command 3: Burn subtitles
Write-Host "`n[3/5] Running: python burn_subtitles.py" -ForegroundColor Yellow
try {
    & python burn_subtitles.py
    if ($LASTEXITCODE -ne 0) {
        throw "python burn_subtitles.py failed with exit code $LASTEXITCODE"
    }
    Write-Host "Success: burn_subtitles.py completed successfully" -ForegroundColor Green
} catch {
    Write-Host "Error in burn_subtitles.py: $_" -ForegroundColor Red
    exit 1
}

# Command 4: Chunk video
Write-Host "`n[4/5] Running: node .\chunk-video.js" -ForegroundColor Yellow
try {
    & node .\chunk-video.js
    if ($LASTEXITCODE -ne 0) {
        throw "node chunk-video.js failed with exit code $LASTEXITCODE"
    }
    Write-Host "Success: chunk-video.js completed successfully" -ForegroundColor Green
} catch {
    Write-Host "Error in chunk-video.js: $_" -ForegroundColor Red
    exit 1
}

# Command 5: Add text overlay to video chunks
Write-Host "`n[5/5] Running: python .\video_overlay_opencv.py" -ForegroundColor Yellow
try {
    & python .\video_overlay_opencv.py
    if ($LASTEXITCODE -ne 0) {
        throw "python video_overlay_opencv.py failed with exit code $LASTEXITCODE"
    }
    Write-Host "Success: video_overlay_opencv.py completed successfully" -ForegroundColor Green
} catch {
    Write-Host "Error in video_overlay_opencv.py: $_" -ForegroundColor Red
    exit 1
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "All commands completed successfully!" -ForegroundColor Green
Write-Host "Video processing pipeline finished." -ForegroundColor Green 