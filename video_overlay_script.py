#!/usr/bin/env python3
"""
Video Text Overlay Script
Overlays part numbers and captions on the first 5 seconds of video chunks
"""

import os
from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
from typing import List

def overlay_text_on_chunks(video_files: List[str], caption: str, output_dir: str = "output") -> List[str]:
    """
    Overlay text on the first 5 seconds of each video chunk
    
    Args:
        video_files: List of video file paths
        caption: Caption text to display
        output_dir: Directory to save output files
    
    Returns:
        List of output file paths
    """
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    output_files = []
    
    for i, video_file in enumerate(video_files, 1):
        print(f"Processing Part {i}: {video_file}")
        
        try:
            # Load the video
            video = VideoFileClip(video_file)
            
            # Create the overlay text
            overlay_text = f"Part {i} | {caption}"
            
            # Create text clip with styling
            text_clip = TextClip(
                overlay_text,
                fontsize=50,
                color='white',
                font='Arial-Bold',
                stroke_color='black',
                stroke_width=2
            ).set_duration(5).set_position(('center', 50))
            
            # Composite the video with text overlay for first 5 seconds
            final_video = CompositeVideoClip([video, text_clip])
            
            # Generate output filename
            base_name = os.path.splitext(os.path.basename(video_file))[0]
            output_file = os.path.join(output_dir, f"{base_name}_with_overlay.mp4")
            
            # Write the final video
            final_video.write_videofile(
                output_file,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile='temp-audio.m4a',
                remove_temp=True
            )
            
            output_files.append(output_file)
            print(f"✅ Part {i} completed: {output_file}")
            
            # Clean up
            video.close()
            text_clip.close()
            final_video.close()
            
        except Exception as e:
            print(f"❌ Error processing {video_file}: {str(e)}")
    
    return output_files

def main():
    """Main function to run the script"""
    
    # CONFIGURATION - Update these variables
    CAPTION = "Neighbor Sued Me After Harassing My Dog for Months, Lost Horribly"
    
    # List your video chunk files here
    VIDEO_CHUNKS = [
        "chunk1.mp4",  # Replace with your actual file paths
        "chunk2.mp4",  # Add more chunks as needed
        # "chunk3.mp4",
        # "chunk4.mp4",
    ]
    
    # Output directory
    OUTPUT_DIR = "processed_videos"
    
    # Verify input files exist
    missing_files = [f for f in VIDEO_CHUNKS if not os.path.exists(f)]
    if missing_files:
        print("❌ Missing video files:")
        for file in missing_files:
            print(f"   - {file}")
        print("\nPlease update the VIDEO_CHUNKS list with correct file paths.")
        return
    
    print(f"🎬 Processing {len(VIDEO_CHUNKS)} video chunks...")
    print(f"📝 Caption: {CAPTION}")
    print(f"📁 Output directory: {OUTPUT_DIR}")
    print("-" * 50)
    
    # Process the videos
    output_files = overlay_text_on_chunks(VIDEO_CHUNKS, CAPTION, OUTPUT_DIR)
    
    print("\n" + "=" * 50)
    print("🎉 Processing complete!")
    print(f"✅ {len(output_files)} videos processed successfully")
    print("\nOutput files:")
    for file in output_files:
        print(f"   📹 {file}")

if __name__ == "__main__":
    main() 