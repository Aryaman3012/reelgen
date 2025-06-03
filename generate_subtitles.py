#!/usr/bin/env python3
"""
Simple script to generate subtitles for final_video.mp4 and burn them into the video.
Run this from the project root directory.
"""

import sys
from pathlib import Path

# Add the subs_ai directory to the path
sys.path.insert(0, str(Path(__file__).parent / "subs_ai"))

from simple_subtitle_generator import main as generate_subtitle_files
from burn_subtitles import check_ffmpeg, burn_subtitles_into_video

def main():
    """Main function to generate subtitles and burn them into video."""
    
    print("🎬 Generating subtitles for final_video.mp4...")
    print("=" * 50)
    
    # First, generate subtitle files
    subtitle_result = generate_subtitle_files()
    
    if subtitle_result != 0:
        print("❌ Failed to generate subtitle files")
        return subtitle_result
    
    # Check if ffmpeg is available
    if not check_ffmpeg():
        print("❌ FFmpeg not found. Please install FFmpeg to burn subtitles into video.")
        print("💡 Subtitle files have been generated successfully.")
        print("   To install FFmpeg:")
        print("   - Windows: choco install ffmpeg  or  scoop install ffmpeg")
        print("   - macOS: brew install ffmpeg")
        print("   - Linux: sudo apt install ffmpeg")
        return 1
    
    # Define paths
    project_root = Path(__file__).parent
    video_path = project_root / "output" / "final_video.mp4"
    subtitle_path = project_root / "output" / "final_video.srt"
    output_video_path = project_root / "output" / "final_video_with_subtitles.mp4"
    
    # Check if files exist
    if not video_path.exists():
        print(f"❌ Video file not found: {video_path}")
        return 1
    
    if not subtitle_path.exists():
        print(f"❌ Subtitle file not found: {subtitle_path}")
        return 1
    
    print("\n🔥 Burning subtitles into video...")
    print("=" * 50)
    
    # Burn subtitles into video
    success = burn_subtitles_into_video(video_path, subtitle_path, output_video_path)
    
    if success:
        print("\n🎉 COMPLETE SUCCESS!")
        print("=" * 50)
        print(f"📁 Original video: {video_path}")
        print(f"📁 Video with burned subtitles: {output_video_path}")
        print(f"📁 Subtitle files:")
        print(f"   - {project_root / 'output' / 'final_video.srt'}")
        print(f"   - {project_root / 'output' / 'final_video.vtt'}")
        print(f"   - {project_root / 'output' / 'final_video.txt'}")
        print("\n📱 The video with burned subtitles is ready to use!")
        print("🎬 Subtitles are centered on screen with white text and black outline for readability.")
        return 0
    else:
        print("\n⚠️ Subtitle files generated successfully, but failed to burn into video.")
        print("📝 You can still use the separate subtitle files with video players.")
        return 1

if __name__ == "__main__":
    exit(main()) 