"""
Configuration settings for subtitle generation.
"""

# Available Whisper model types (in order of speed vs quality)
WHISPER_MODELS = {
    'tiny': {
        'speed': 'fastest',
        'quality': 'lowest',
        'languages': 'english only',
        'size': '~39 MB'
    },
    'base': {
        'speed': 'fast',
        'quality': 'good',
        'languages': 'multilingual',
        'size': '~142 MB'
    },
    'small': {
        'speed': 'medium',
        'quality': 'better',
        'languages': 'multilingual',
        'size': '~466 MB'
    },
    'medium': {
        'speed': 'slow',
        'quality': 'high',
        'languages': 'multilingual',
        'size': '~1.5 GB'
    },
    'large': {
        'speed': 'slowest',
        'quality': 'highest',
        'languages': 'multilingual',
        'size': '~3.0 GB'
    }
}

# Default settings
DEFAULT_MODEL = 'base'  # Good balance of speed and accuracy
DEFAULT_FORMAT = 'srt'  # Most compatible subtitle format

# Supported subtitle formats
SUBTITLE_FORMATS = ['srt', 'vtt', 'ass', 'ssa', 'sub', 'json', 'txt']

# Output directory relative to project root
OUTPUT_DIR = 'output'

# Video file name
VIDEO_FILE = 'final_video.mp4' 