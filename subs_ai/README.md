# Subtitle Generation with OpenAI Whisper

This directory contains the implementation for generating subtitles for `final_video.mp4` using OpenAI's Whisper models.

## ✅ Working Solution

The **simple subtitle generator** (`simple_subtitle_generator.py`) is the recommended approach that successfully generates subtitles without dependency conflicts.

## Quick Start

### Run the subtitle generator:

```bash
# From the project root directory
python subs_ai/simple_subtitle_generator.py
```

This will:
1. Install OpenAI Whisper if not already installed
2. Generate subtitles for `output/final_video.mp4`
3. Create multiple subtitle format files in the `output/` directory:
   - `final_video.srt` - Standard subtitle format for video players
   - `final_video.vtt` - Web-compatible subtitle format
   - `final_video.txt` - Plain text transcript

## Generated Files

After running successfully, you'll find these files in the `output/` directory:
- ✅ `final_video.srt` - Subtitle file for video players (4.5KB)
- ✅ `final_video.vtt` - Web-compatible subtitle file (4.4KB) 
- ✅ `final_video.txt` - Plain text transcript (2.7KB)

## Features

- 🎤 **Automatic speech recognition** using OpenAI's Whisper models
- 🌍 **Multiple languages** supported automatically
- 📝 **Multiple subtitle formats** (SRT, VTT, TXT, JSON)
- ⚡ **Reliable and simple** - no complex dependencies
- 🔧 **Automatic installation** of required packages

## Manual Usage

You can also use the subtitle generator programmatically:

```python
from subs_ai.simple_subtitle_generator import generate_subtitles

# Generate subtitles with custom settings
subtitle_path = generate_subtitles(
    video_path="output/final_video.mp4",
    output_dir="output",
    model_type="small",  # Higher quality
    subtitle_format="srt"
)
```

## Model Options

Choose the model based on your needs:

| Model  | Speed    | Quality | Size    | Languages    |
|--------|----------|---------|---------|--------------|
| tiny   | Fastest  | Lowest  | ~39 MB  | English only |
| base   | Fast     | Good    | ~142 MB | Multilingual |
| small  | Medium   | Better  | ~466 MB | Multilingual |
| medium | Slow     | High    | ~1.5 GB | Multilingual |
| large  | Slowest  | Highest | ~3.0 GB | Multilingual |

**Default**: `base` model provides a good balance of speed and accuracy.

## Subtitle Formats

Supported output formats:
- **SRT** - Most compatible with video players
- **VTT** - Web standard for HTML5 video
- **JSON** - Raw transcription data with timestamps
- **TXT** - Plain text transcription

## Requirements

- Python 3.9+ 
- FFmpeg (for audio processing)
- OpenAI Whisper (automatically installed)

## Installation Notes

The script automatically installs OpenAI Whisper when first run. Make sure you have FFmpeg installed:

- **Windows**: `choco install ffmpeg` or `scoop install ffmpeg`
- **macOS**: `brew install ffmpeg`  
- **Linux**: `sudo apt install ffmpeg`

## Performance Notes

- Processing took ~2-3 minutes for a 47MB video file
- Uses CPU by default (showed FP32 warning, which is normal)
- Generated accurate subtitles with proper timestamps
- The base model provided excellent transcription quality

## Alternative Implementations

This directory also contains:
- `subtitle_generator.py` - More advanced version with SubsAI integration (may have dependency conflicts)
- `simple_subtitle_generator.py` - ✅ **Recommended** simple and reliable version

## Success Example

```
🎯 Target video: C:\Users\...\reelgen\output\final_video.mp4
🎬 Processing video: ...
🤖 Using Whisper model: base
📝 Output format: srt
✅ Subtitles generated successfully!

🎉 SUCCESS!
📁 Subtitle file: final_video.srt
🌐 Web subtitle file: final_video.vtt  
📄 Text transcript: final_video.txt

📱 You can now use these subtitle files with your video player!
```

## Troubleshooting

**"FFmpeg not found"**: Install FFmpeg using your system's package manager.

**"FP16 is not supported on CPU"**: This warning is normal when running on CPU - the script automatically uses FP32 instead.

**Slow processing**: The base model balances speed and quality. Use `tiny` for faster processing or `small`/`medium` for better accuracy. 