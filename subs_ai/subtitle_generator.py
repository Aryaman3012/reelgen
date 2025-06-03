#!/usr/bin/env python3
"""
Subtitle generation script using subsai library.
Generates subtitles for final_video.mp4 in the output directory.
"""

import os
import sys
from pathlib import Path

def install_subsai():
    """Install subsai if not already installed."""
    try:
        import subsai
        print("✓ subsai is already installed")
        return True
    except ImportError:
        print("Installing subsai...")
        import subprocess
        try:
            # Try to install with --force-reinstall for compatibility issues
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", 
                "git+https://github.com/absadiki/subsai", "--force-reinstall", "--no-deps"
            ])
            
            # Install core dependencies separately
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", 
                "openai-whisper", "torch>=2.0.0", "torchaudio>=2.0.0", "transformers>=4.21.0"
            ])
            
            print("✓ subsai installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Failed to install subsai: {e}")
            print("🔧 Trying with basic whisper installation...")
            try:
                # Fallback to basic openai-whisper
                subprocess.check_call([
                    sys.executable, "-m", "pip", "install", "openai-whisper"
                ])
                return "fallback"
            except subprocess.CalledProcessError:
                return False

def generate_subtitles_basic(video_path, output_dir=None, model_type='base', subtitle_format='srt'):
    """
    Generate subtitles using basic openai-whisper as fallback.
    """
    try:
        import whisper
        import json
        
        print(f"🎬 Processing video: {video_path}")
        print(f"🤖 Using basic Whisper model: {model_type}")
        print(f"📝 Output format: {subtitle_format}")
        
        # Load the model
        print("Loading model...")
        model = whisper.load_model(model_type)
        
        # Transcribe the video
        print("🎤 Transcribing audio... This may take a while.")
        result = model.transcribe(video_path)
        
        # Determine output path
        video_name = Path(video_path).stem
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            subtitle_path = os.path.join(output_dir, f"{video_name}.{subtitle_format}")
        else:
            subtitle_path = str(Path(video_path).parent / f"{video_name}.{subtitle_format}")
        
        # Save subtitles
        print(f"💾 Saving subtitles to: {subtitle_path}")
        
        if subtitle_format.lower() == 'srt':
            # Generate SRT format
            with open(subtitle_path, 'w', encoding='utf-8') as f:
                for i, segment in enumerate(result['segments'], 1):
                    start_time = format_timestamp(segment['start'])
                    end_time = format_timestamp(segment['end'])
                    text = segment['text'].strip()
                    
                    f.write(f"{i}\n")
                    f.write(f"{start_time} --> {end_time}\n")
                    f.write(f"{text}\n\n")
        
        elif subtitle_format.lower() == 'vtt':
            # Generate VTT format
            with open(subtitle_path, 'w', encoding='utf-8') as f:
                f.write("WEBVTT\n\n")
                for segment in result['segments']:
                    start_time = format_timestamp_vtt(segment['start'])
                    end_time = format_timestamp_vtt(segment['end'])
                    text = segment['text'].strip()
                    
                    f.write(f"{start_time} --> {end_time}\n")
                    f.write(f"{text}\n\n")
        
        elif subtitle_format.lower() == 'json':
            # Save raw JSON
            with open(subtitle_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
        
        elif subtitle_format.lower() == 'txt':
            # Save plain text
            with open(subtitle_path, 'w', encoding='utf-8') as f:
                f.write(result['text'])
        
        print("✅ Subtitles generated successfully!")
        return subtitle_path
        
    except Exception as e:
        print(f"❌ Error generating subtitles with basic whisper: {e}")
        raise

def format_timestamp(seconds):
    """Convert seconds to SRT timestamp format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millisecs = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millisecs:03d}"

def format_timestamp_vtt(seconds):
    """Convert seconds to VTT timestamp format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = seconds % 60
    return f"{hours:02d}:{minutes:02d}:{secs:06.3f}"

def generate_subtitles(video_path, output_dir=None, model_type='base', subtitle_format='srt'):
    """
    Generate subtitles for a video file using subsai or fallback to basic whisper.
    
    Args:
        video_path (str): Path to the video file
        output_dir (str): Directory to save subtitles (defaults to same as video)
        model_type (str): Whisper model type ('tiny', 'base', 'small', 'medium', 'large')
        subtitle_format (str): Output format ('srt', 'vtt', 'ass', 'json', 'txt')
    
    Returns:
        str: Path to the generated subtitle file
    """
    try:
        from subsai import SubsAI
        
        # Validate video file exists
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        print(f"🎬 Processing video: {video_path}")
        print(f"🤖 Using Whisper model: {model_type}")
        print(f"📝 Output format: {subtitle_format}")
        
        # Create SubsAI instance
        subs_ai = SubsAI()
        
        # Create the model
        print("Loading model...")
        model = subs_ai.create_model('openai/whisper', {'model_type': model_type})
        
        # Transcribe the video
        print("🎤 Transcribing audio... This may take a while depending on video length.")
        subs = subs_ai.transcribe(video_path, model)
        
        # Determine output path
        video_name = Path(video_path).stem
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            subtitle_path = os.path.join(output_dir, f"{video_name}.{subtitle_format}")
        else:
            subtitle_path = str(Path(video_path).parent / f"{video_name}.{subtitle_format}")
        
        # Save subtitles
        print(f"💾 Saving subtitles to: {subtitle_path}")
        subs.save(subtitle_path)
        
        print("✅ Subtitles generated successfully!")
        return subtitle_path
        
    except Exception as e:
        print(f"❌ Error with subsai: {e}")
        print("🔄 Falling back to basic whisper...")
        return generate_subtitles_basic(video_path, output_dir, model_type, subtitle_format)

def main():
    """Main function to generate subtitles for final_video.mp4."""
    
    # Install subsai if needed
    install_result = install_subsai()
    if not install_result:
        print("❌ Could not install subtitle generation dependencies")
        return 1
    
    # Define paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    video_path = project_root / "output" / "final_video.mp4"
    
    print(f"🎯 Target video: {video_path}")
    
    if not video_path.exists():
        print(f"❌ Video file not found: {video_path}")
        return 1
    
    try:
        # Generate subtitles with different quality options
        subtitle_path = generate_subtitles(
            str(video_path),
            output_dir=str(project_root / "output"),
            model_type='base',  # Good balance of speed and accuracy
            subtitle_format='srt'
        )
        
        print(f"\n🎉 SUCCESS!")
        print(f"📁 Subtitle file: {subtitle_path}")
        print(f"📱 You can now use this subtitle file with your video player")
        
        # Also generate VTT format for web use
        try:
            vtt_path = generate_subtitles(
                str(video_path),
                output_dir=str(project_root / "output"),
                model_type='base',
                subtitle_format='vtt'
            )
            print(f"🌐 Web subtitle file: {vtt_path}")
        except Exception as e:
            print(f"⚠️ Could not generate VTT format: {e}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Failed to generate subtitles: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 