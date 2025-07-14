#!/usr/bin/env python3
"""
Script to generate subtitle files for final_video.mp4.
Run this from the project root directory.
"""

import sys
from pathlib import Path

# Add the subs_ai directory to the path
sys.path.insert(0, str(Path(__file__).parent / "subs_ai"))

from simple_subtitle_generator import main as generate_subtitle_files

def main():
    """Main function to generate subtitle files only."""
    
    print("📝 Generating VTT subtitle file for final_video.mp4...")
    print("=" * 50)
    
    # Generate subtitle files
    result = generate_subtitle_files()
    
    if result == 0:
        print("\n🎉 SUCCESS!")
        print("=" * 50)
        project_root = Path(__file__).parent
        print(f"📁 Generated subtitle file:")
        print(f"   - {project_root / 'output' / 'final_video.vtt'}")
        print("\n💡 To burn subtitles into video, run: python burn_subtitles.py")
        return 0
    else:
        print("\n❌ Failed to generate subtitle file")
        return result

if __name__ == "__main__":
    exit(main()) 