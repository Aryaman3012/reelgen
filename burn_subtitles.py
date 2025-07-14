#!/usr/bin/env python3
"""
Script to burn subtitles into video using ffmpeg.
Run this from the project root directory.
"""

import subprocess
import os
from pathlib import Path

def check_ffmpeg():
    """Check if ffmpeg is available."""
    try:
        subprocess.run(['ffmpeg', '-version'], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

def burn_subtitles_alternative(video_path, subtitle_path, output_path):
    """
    Alternative method to burn subtitles using a simpler ffmpeg approach.
    """
    try:
        print(f"🔥 Burning subtitles into video...")
        print(f"📹 Input video: {video_path}")
        print(f"📝 Subtitle file: {subtitle_path}")
        print(f"💾 Output video: {output_path}")
        
        print("🔄 Using alternative subtitle burning method...")
        
        # Convert paths to Windows format with double backslashes
        subtitle_path_escaped = str(subtitle_path).replace('\\', '\\\\').replace(':', '\\:')
        
        # Updated ffmpeg command with proper center positioning
        ffmpeg_cmd = [
            'ffmpeg',
            '-i', str(video_path),
            '-filter_complex', f"[0:v]subtitles=filename='{subtitle_path_escaped}':force_style='Alignment=10,MarginV=0,Fontsize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,Shadow=1'[v]",
            '-map', '[v]',
            '-map', '0:a',
            '-c:a', 'copy',
            '-c:v', 'libx264',
            '-preset', 'medium',
            '-crf', '23',
            '-y',
            str(output_path)
        ]
        
        print("⚙️ Running alternative ffmpeg command...")
        
        process = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        print("✅ Successfully burned subtitles using alternative method!")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Alternative method also failed: {e}")
        print(f"FFmpeg stderr: {e.stderr}")
        
        # Try the simplest possible method
        return burn_subtitles_simple(video_path, subtitle_path, output_path)
    
    except Exception as e:
        print(f"❌ Error with alternative method: {e}")
        return False

def burn_subtitles_simple(video_path, subtitle_path, output_path):
    """
    Simplest subtitle burning method with center positioning.
    """
    try:
        print("🔄 Using simplest subtitle burning method...")
        
        # Most basic subtitle burning command with center positioning
        ffmpeg_cmd = [
            'ffmpeg',
            '-i', str(video_path),
            '-vf', f"subtitles={str(subtitle_path)}:force_style='Alignment=10,MarginV=0,FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2'",
            '-c:a', 'copy',
            '-y',
            str(output_path)
        ]
        
        print("⚙️ Running simple ffmpeg command...")
        
        process = subprocess.run(
            ffmpeg_cmd,
            capture_output=True,
            text=True,
            check=True
        )
        
        print("✅ Successfully burned subtitles using simple method!")
        return True
        
    except subprocess.CalledProcessError as e:
        print(f"❌ Simple method failed: {e}")
        print(f"FFmpeg stderr: {e.stderr}")
        return False
    
    except Exception as e:
        print(f"❌ Error with simple method: {e}")
        return False

def main():
    """Main function to burn subtitles into video."""
    
    print("🔥 Burning subtitles into video...")
    print("=" * 50)
    
    # Check if ffmpeg is available
    if not check_ffmpeg():
        print("❌ FFmpeg not found. Please install FFmpeg to burn subtitles into video.")
        print("💡 To install FFmpeg:")
        print("   - Windows: choco install ffmpeg  or  scoop install ffmpeg")
        print("   - macOS: brew install ffmpeg")
        print("   - Linux: sudo apt install ffmpeg")
        return 1
    
    # Define paths - using VTT instead of SRT
    project_root = Path(__file__).parent
    video_path = project_root / "output" / "final_video.mp4"
    subtitle_path = project_root / "output" / "final_video.vtt"
    output_video_path = project_root / "output" / "final_video_with_subtitles.mp4"
    
    # Check if files exist
    if not video_path.exists():
        print(f"❌ Video file not found: {video_path}")
        print("💡 Make sure you have 'output/final_video.mp4' file")
        return 1
    
    if not subtitle_path.exists():
        print(f"❌ Subtitle file not found: {subtitle_path}")
        print("💡 Run 'python generate_subtitles_only.py' first to generate subtitle files")
        return 1
    
    # Burn subtitles into video using the working alternative method
    success = burn_subtitles_alternative(video_path, subtitle_path, output_video_path)
    
    if success:
        print("\n🎉 SUCCESS!")
        print("=" * 50)
        print(f"📁 Original video: {video_path}")
        print(f"📁 Video with burned subtitles: {output_video_path}")
        print("\n🎬 Video with burned subtitles is ready!")
        print("📝 Subtitles are centered on screen with white text and black outline.")
        return 0
    else:
        print("\n❌ Failed to burn subtitles into video.")
        print("💡 Check that ffmpeg is installed and subtitle files exist.")
        return 1

if __name__ == "__main__":
    exit(main()) 