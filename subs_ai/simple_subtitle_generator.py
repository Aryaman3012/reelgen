#!/usr/bin/env python3
"""
Simple subtitle generation script using openai-whisper.
Generates subtitles for final_video.mp4 in the output directory.
"""

import os
import sys
import json
from pathlib import Path

def install_whisper():
    """Install openai-whisper if not already installed."""
    try:
        import whisper
        print("openai-whisper is already installed")
        return True
    except ImportError:
        print("Installing openai-whisper...")
        import subprocess
        try:
            subprocess.check_call([
                sys.executable, "-m", "pip", "install", "openai-whisper"
            ])
            print("openai-whisper installed successfully")
            return True
        except subprocess.CalledProcessError as e:
            print(f"Failed to install openai-whisper: {e}")
            return False

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

def split_text_into_chunks(text, max_words=4):
    """Split text into chunks of maximum words per line."""
    words = text.strip().split()
    chunks = []
    
    for i in range(0, len(words), max_words):
        chunk = ' '.join(words[i:i + max_words])
        chunks.append(chunk)
    
    return chunks

def generate_subtitles(video_path, output_dir=None, model_type='base', subtitle_format='srt'):
    """
    Generate subtitles for a video file using openai-whisper.
    
    Args:
        video_path (str): Path to the video file
        output_dir (str): Directory to save subtitles (defaults to same as video)
        model_type (str): Whisper model type ('tiny', 'base', 'small', 'medium', 'large')
        subtitle_format (str): Output format ('srt', 'vtt', 'json', 'txt')
    
    Returns:
        str: Path to the generated subtitle file
    """
    try:
        import whisper
        
        # Validate video file exists
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        print(f"Processing video: {video_path}")
        print(f"Using Whisper model: {model_type}")
        print(f"Output format: {subtitle_format}")
        print(f"Max words per line: 4")
        
        # Load the model
        print("Loading model...")
        model = whisper.load_model(model_type)
        
        # Transcribe the video
        print("Transcribing audio... This may take a while depending on video length.")
        result = model.transcribe(video_path)
        
        # Determine output path
        video_name = Path(video_path).stem
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)
            subtitle_path = os.path.join(output_dir, f"{video_name}.{subtitle_format}")
        else:
            subtitle_path = str(Path(video_path).parent / f"{video_name}.{subtitle_format}")
        
        # Save subtitles
        print(f"Saving subtitles to: {subtitle_path}")
        
        if subtitle_format.lower() == 'srt':
            # Generate SRT format with 4-word line limit
            with open(subtitle_path, 'w', encoding='utf-8') as f:
                subtitle_index = 1
                for segment in result['segments']:
                    text = segment['text'].strip()
                    text_chunks = split_text_into_chunks(text, max_words=4)
                    
                    if text_chunks:
                        # Calculate time per chunk
                        segment_duration = segment['end'] - segment['start']
                        time_per_chunk = segment_duration / len(text_chunks)
                        
                        for i, chunk in enumerate(text_chunks):
                            start_time = segment['start'] + (i * time_per_chunk)
                            end_time = segment['start'] + ((i + 1) * time_per_chunk)
                            
                            start_time_formatted = format_timestamp(start_time)
                            end_time_formatted = format_timestamp(end_time)
                            
                            f.write(f"{subtitle_index}\n")
                            f.write(f"{start_time_formatted} --> {end_time_formatted}\n")
                            f.write(f"{chunk}\n\n")
                            subtitle_index += 1
        
        elif subtitle_format.lower() == 'vtt':
            # Generate VTT format with 4-word line limit
            with open(subtitle_path, 'w', encoding='utf-8') as f:
                f.write("WEBVTT\n\n")
                for segment in result['segments']:
                    text = segment['text'].strip()
                    text_chunks = split_text_into_chunks(text, max_words=4)
                    
                    if text_chunks:
                        # Calculate time per chunk
                        segment_duration = segment['end'] - segment['start']
                        time_per_chunk = segment_duration / len(text_chunks)
                        
                        for i, chunk in enumerate(text_chunks):
                            start_time = segment['start'] + (i * time_per_chunk)
                            end_time = segment['start'] + ((i + 1) * time_per_chunk)
                            
                            start_time_formatted = format_timestamp_vtt(start_time)
                            end_time_formatted = format_timestamp_vtt(end_time)
                            
                            f.write(f"{start_time_formatted} --> {end_time_formatted}\n")
                            f.write(f"{chunk}\n\n")
        
        elif subtitle_format.lower() == 'json':
            # Save raw JSON
            with open(subtitle_path, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
        
        elif subtitle_format.lower() == 'txt':
            # Save plain text
            with open(subtitle_path, 'w', encoding='utf-8') as f:
                f.write(result['text'])
        
        else:
            raise ValueError(f"Unsupported subtitle format: {subtitle_format}")
        
        print("Subtitles generated successfully!")
        return subtitle_path
        
    except Exception as e:
        print(f"Error generating subtitles: {e}")
        raise

def main():
    """Main function to generate subtitles for final_video.mp4."""
    
    # Install whisper if needed
    if not install_whisper():
        print("Could not install openai-whisper")
        return 1
    
    # Define paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    video_path = project_root / "output" / "final_video.mp4"
    
    print(f"Target video: {video_path}")
    
    if not video_path.exists():
        print(f"Video file not found: {video_path}")
        return 1
    
    try:
        # Generate subtitles in VTT format only
        vtt_path = generate_subtitles(
            str(video_path),
            output_dir=str(project_root / "output"),
            model_type='base',  # Good balance of speed and accuracy
            subtitle_format='vtt'
        )
        
        print(f"\nSUCCESS!")
        print(f"VTT subtitle file: {vtt_path}")
        
        print(f"\nYou can now use this subtitle file with your video player!")
        print(f"Video file: {video_path}")
        print(f"Subtitle file saved in: {project_root / 'output'}")
        
        return 0
        
    except Exception as e:
        print(f"Failed to generate subtitles: {e}")
        return 1

if __name__ == "__main__":
    exit(main()) 