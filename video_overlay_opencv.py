#!/usr/bin/env python3
"""
Video Text Overlay Script using OpenCV
Overlays part numbers and captions on the first 5 seconds of video chunks
"""

import cv2
import os
import numpy as np
import subprocess
import shutil
import re
import glob
from typing import List

def clean_processed_videos_directory(processed_dir: str):
    """
    Clean only the processed videos directory
    
    Args:
        processed_dir: Path to processed videos directory
    """
    print("🧹 Cleaning processed videos directory...")
    
    # Clean processed videos directory
    if os.path.exists(processed_dir):
        try:
            for filename in os.listdir(processed_dir):
                file_path = os.path.join(processed_dir, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                elif os.path.isdir(file_path):
                    shutil.rmtree(file_path)
            print(f"✅ Cleaned processed videos directory: {processed_dir}")
        except Exception as e:
            print(f"⚠️ Warning: Could not clean processed videos directory: {e}")
    
    # Recreate directory
    os.makedirs(processed_dir, exist_ok=True)

def clean_chunks_directory(chunks_dir: str):
    """
    Clean the chunks directory after processing
    
    Args:
        chunks_dir: Path to chunks directory
    """
    print("🧹 Cleaning chunks directory...")
    
    # Clean chunks directory
    if os.path.exists(chunks_dir):
        try:
            shutil.rmtree(chunks_dir)
            print(f"✅ Cleaned chunks directory: {chunks_dir}")
        except Exception as e:
            print(f"⚠️ Warning: Could not clean chunks directory: {e}")
    
    # Recreate directory
    os.makedirs(chunks_dir, exist_ok=True)

def draw_simple_rectangle_with_border(img, pt1, pt2, bg_color, border_color, border_thickness):
    """
    Draw a simple rectangle with background and border (no curves to avoid artifacts)
    """
    x1, y1 = pt1
    x2, y2 = pt2
    
    # Draw white background rectangle
    cv2.rectangle(img, (x1, y1), (x2, y2), bg_color, -1)
    
    # Draw black border
    if border_thickness > 0:
        cv2.rectangle(img, (x1, y1), (x2, y2), border_color, border_thickness)

def overlay_text_on_chunks_opencv(video_files: List[str], caption: str, output_dir: str = "output", start_number: int = 1) -> List[str]:
    """
    Overlay text on the first 5 seconds of each video chunk using OpenCV
    
    Args:
        video_files: List of video file paths
        caption: Caption text to display
        output_dir: Directory to save output files
        start_number: Starting number for unique video numbering
    
    Returns:
        List of output file paths
    """
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    output_files = []
    
    for i, video_file in enumerate(video_files, 1):
        # Use unique number for this video
        unique_number = start_number + i - 1
        print(f"Processing Part {i} (Video #{unique_number}): {video_file}")
        
        try:
            # Open video file
            cap = cv2.VideoCapture(video_file)
            
            if not cap.isOpened():
                print(f"❌ Error: Could not open video file {video_file}")
                continue
            
            # Get video properties
            fps = int(cap.get(cv2.CAP_PROP_FPS))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            
            # Calculate frames for 5 seconds
            overlay_frames = min(5 * fps, total_frames)
            
            # Create output video writer with unique number
            temp_output_file = os.path.join(output_dir, f"video_{unique_number}_temp.mp4")
            output_file = os.path.join(output_dir, f"video_{unique_number}.mp4")
            
            fourcc = cv2.VideoWriter_fourcc(*'mp4v')
            out = cv2.VideoWriter(temp_output_file, fourcc, fps, (width, height))
            
            # Create the overlay text and split into lines (max 4 words per line)
            full_text = f"Video {unique_number} | {caption}"
            words = full_text.split()
            
            # Split words into lines of max 4 words each
            text_lines = []
            for j in range(0, len(words), 4):
                line = " ".join(words[j:j+4])
                text_lines.append(line)
            
            # Text properties
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 1.8  # Increased text size
            text_color = (0, 0, 0)  # Black text
            bg_color = (255, 255, 255)  # White background
            border_color = (0, 0, 0)  # Black border
            border_thickness = 3
            corner_radius = 15
            thickness = 3  # Increased text thickness
            padding = 20  # Increased padding around text
            line_spacing = 15  # Increased space between lines
            
            # Calculate total text dimensions
            max_text_width = 0
            total_text_height = 0
            line_heights = []
            
            for line in text_lines:
                (line_width, line_height), baseline = cv2.getTextSize(line, font, font_scale, thickness)
                max_text_width = max(max_text_width, line_width)
                line_heights.append(line_height)
                total_text_height += line_height + line_spacing
            
            total_text_height -= line_spacing  # Remove extra spacing from last line
            
            # Calculate background rectangle dimensions
            bg_width = max_text_width + (padding * 2)
            bg_height = total_text_height + (padding * 2)
            
            # Position the background rectangle (centered horizontally, margin from top)
            bg_x = (width - bg_width) // 2
            bg_y = 250  # 250px margin from top (moved down by 50px)
            
            # Calculate text starting position
            text_start_x = bg_x + padding
            text_start_y = bg_y + padding
            
            frame_count = 0
            
            while True:
                ret, frame = cap.read()
                if not ret:
                    break
                
                # Add text overlay for first 5 seconds
                if frame_count < overlay_frames:
                    # Draw simple rectangle with background and border (no artifacts)
                    draw_simple_rectangle_with_border(frame, (bg_x, bg_y), (bg_x + bg_width, bg_y + bg_height), 
                                                     bg_color, border_color, border_thickness)
                    
                    # Draw each line of text
                    current_y = text_start_y
                    for idx, line in enumerate(text_lines):
                        line_height = line_heights[idx]
                        # Center each line horizontally within the background
                        (line_width, _), _ = cv2.getTextSize(line, font, font_scale, thickness)
                        line_x = bg_x + (bg_width - line_width) // 2
                        
                        cv2.putText(frame, line, (line_x, current_y + line_height), font, font_scale, 
                                  text_color, thickness, cv2.LINE_AA)
                        current_y += line_height + line_spacing
                
                out.write(frame)
                frame_count += 1
            
            # Release everything
            cap.release()
            out.release()
            
            # Use FFmpeg to copy audio from original file to processed video
            try:
                ffmpeg_cmd = [
                    'ffmpeg', '-y',  # -y to overwrite output file
                    '-i', temp_output_file,  # Video input (processed)
                    '-i', video_file,        # Audio input (original)
                    '-c:v', 'copy',          # Copy video without re-encoding
                    '-c:a', 'aac',           # Use AAC audio codec
                    '-map', '0:v:0',         # Map video from first input
                    '-map', '1:a:0',         # Map audio from second input
                    output_file
                ]
                
                result = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
                
                if result.returncode == 0:
                    # Remove temporary file
                    os.remove(temp_output_file)
                    output_files.append(output_file)
                    print(f"✅ Video {unique_number} completed with audio: {output_file}")
                else:
                    print(f"⚠️ Warning: Audio merge failed for Video {unique_number}")
                    print(f"FFmpeg error: {result.stderr}")
                    # Fallback: use the temp file without audio
                    os.rename(temp_output_file, output_file)
                    output_files.append(output_file)
                    print(f"✅ Video {unique_number} completed (no audio): {output_file}")
                    
            except FileNotFoundError:
                print(f"⚠️ Warning: FFmpeg not found. Video {unique_number} will have no audio.")
                # Fallback: use the temp file without audio
                os.rename(temp_output_file, output_file)
                output_files.append(output_file)
                print(f"✅ Video {unique_number} completed (no audio): {output_file}")
            
        except Exception as e:
            print(f"❌ Error processing {video_file}: {str(e)}")
    
    return output_files

def get_video_chunks(chunks_dir: str) -> List[str]:
    """
    Get all video files from the chunks directory
    
    Args:
        chunks_dir: Directory containing video chunks
    
    Returns:
        Sorted list of video file paths
    """
    if not os.path.exists(chunks_dir):
        return []
    
    # Common video file extensions
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'}
    
    video_files = []
    for file in os.listdir(chunks_dir):
        if os.path.splitext(file.lower())[1] in video_extensions:
            video_files.append(os.path.join(chunks_dir, file))
    
    # Sort files to ensure consistent processing order
    return sorted(video_files)

def main():
    """Main function to run the script"""
    
    # Read caption from userText.txt
    try:
        with open("userText.txt", "r", encoding="utf-8") as f:
            CAPTION = f.readline().strip()
        print(f"📖 Caption loaded from userText.txt: {CAPTION}")
    except FileNotFoundError:
        CAPTION = "Default Caption"
        print("⚠️ userText.txt not found, using default caption")
    except Exception as e:
        CAPTION = "Default Caption"
        print(f"⚠️ Error reading userText.txt: {e}")
    
    # Chunks directory
    CHUNKS_DIR = "output/chunks"
    
    # Output directory
    OUTPUT_DIR = r"processed_videos"
    
    # Clean only the processed videos directory before processing
    clean_processed_videos_directory(OUTPUT_DIR)
    
    # Get all video chunks from the directory
    VIDEO_CHUNKS = get_video_chunks(CHUNKS_DIR)
    
    if not VIDEO_CHUNKS:
        print(f"❌ No video files found in '{CHUNKS_DIR}' directory.")
        print(f"Please ensure video files exist in: {os.path.abspath(CHUNKS_DIR)}")
        return
    
    print(f"🎬 Found {len(VIDEO_CHUNKS)} video chunks in '{CHUNKS_DIR}':")
    for i, chunk in enumerate(VIDEO_CHUNKS, 1):
        print(f"   {i}. {os.path.basename(chunk)}")
    print(f"📝 Caption: {CAPTION}")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print("-" * 50)
    
    # Process the videos with numbering starting from 1
    output_files = overlay_text_on_chunks_opencv(VIDEO_CHUNKS, CAPTION, OUTPUT_DIR, start_number=1)
    
    print("\n" + "=" * 50)
    print("🎉 Processing complete!")
    print(f"✅ {len(output_files)} videos processed successfully")
    print("\nOutput files:")
    for file in output_files:
        print(f"   📹 {file}")
    
    # Clean chunks directory after processing
    clean_chunks_directory(CHUNKS_DIR)
    print("🧹 Chunks directory cleaned after processing")

if __name__ == "__main__":
    main() 