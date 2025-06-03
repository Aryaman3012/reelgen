"""
Subtitle generation for video files using OpenAI Whisper.

This package provides two subtitle generation approaches:
1. simple_subtitle_generator.py - Recommended, reliable approach using openai-whisper
2. subtitle_generator.py - Advanced approach with SubsAI (may have dependency conflicts)
"""

from .simple_subtitle_generator import generate_subtitles, main as simple_main
from .config import WHISPER_MODELS, DEFAULT_MODEL, DEFAULT_FORMAT, SUBTITLE_FORMATS

# Try to import the advanced subtitle generator (may fail due to dependencies)
try:
    from .subtitle_generator import main as advanced_main
    HAS_ADVANCED = True
except ImportError:
    HAS_ADVANCED = False
    advanced_main = None

__version__ = "1.0.0"
__all__ = [
    "generate_subtitles", 
    "simple_main", 
    "advanced_main",
    "WHISPER_MODELS", 
    "DEFAULT_MODEL", 
    "DEFAULT_FORMAT", 
    "SUBTITLE_FORMATS",
    "HAS_ADVANCED"
]

# Default to the simple, working generator
main = simple_main 