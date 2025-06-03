import ffmpeg from "fluent-ffmpeg";
import fs from "fs-extra";
import path from "path";
import { execFile } from "child_process";
import ffmpegPath from "ffmpeg-static";

// Helper function to get audio duration
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(audioPath, (err, metadata) => {
      if (err) return reject(err);
      if (!metadata.format || typeof metadata.format.duration !== 'number') {
        return reject(new Error('Could not determine audio duration'));
      }
      resolve(metadata.format.duration);
    });
  });
}

// Helper function to get video duration
async function getVideoDuration(videoPath: string): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      if (!metadata.format || typeof metadata.format.duration !== 'number') {
        return reject(new Error('Could not determine video duration'));
      }
      resolve(metadata.format.duration);
    });
  });
}

export async function concatenateVideos(videoDir: string, outputPath: string) {
  // Always resolve videoDir relative to the project root
  const resolvedVideoDir = path.isAbsolute(videoDir)
    ? videoDir
    : path.resolve(process.cwd(), videoDir);
  console.log("[concatenateVideos] videoDir (resolved):", resolvedVideoDir);
  const dirExists = await fs.pathExists(resolvedVideoDir);
  console.log("[concatenateVideos] Directory exists:", dirExists);
  if (!dirExists) {
    throw new Error(`[concatenateVideos] Input directory does not exist: ${resolvedVideoDir}`);
  }
  const allFiles = await fs.readdir(resolvedVideoDir);
  console.log("[concatenateVideos] Files in directory:", allFiles);
  const files = allFiles
    .filter(f => f.match(/\.(mp4|mov|avi|mkv)$/i))
    .map(f => path.join(resolvedVideoDir, f));
  console.log("[concatenateVideos] Video files found:", files);

  if (files.length === 0) throw new Error("No video files found in input directory.");

  // Create filelist.txt for ffmpeg concat demuxer
  const fileListPath = path.resolve(resolvedVideoDir, "filelist.txt");
  const fileListContent = files.map(f => `file '${path.resolve(f).replace(/\\/g, "/")}'`).join("\n");
  await fs.writeFile(fileListPath, fileListContent, { encoding: "utf8" });

  // Debug: print filelist.txt content
  console.log("filelist.txt content:\n", fileListContent);
  console.log("filelist.txt exists:", await fs.pathExists(fileListPath));

  return new Promise<void>((resolve, reject) => {
    execFile(
      ffmpegPath || "ffmpeg",
      [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", fileListPath,
        "-c", "copy",
        outputPath
      ],
      (error, stdout, stderr) => {
        console.log("ffmpeg stdout:\n", stdout);
        console.log("ffmpeg stderr:\n", stderr);
        if (error) {
          console.error("ffmpeg error:", stderr || error.message);
          reject(new Error(stderr || error.message));
        } else {
          // Check output file exists and is non-empty
          fs.stat(outputPath)
            .then(stats => {
              if (stats.size > 0) {
                resolve();
              } else {
                reject(new Error("Output file is empty after ffmpeg run."));
              }
            })
            .catch(() => reject(new Error("Output file not found after ffmpeg run.")));
        }
        // Clean up filelist.txt
        fs.remove(fileListPath).catch(() => {});
      }
    );
  });
}

// New function to extend video to match audio duration by concatenating multiple videos
export async function extendVideoToMatchAudio(videoDir: string, audioPath: string, outputPath: string) {
  console.log("[extendVideoToMatchAudio] Creating video sequence to match audio duration...");
  
  const audioDuration = await getAudioDuration(audioPath);
  console.log(`[extendVideoToMatchAudio] Target audio duration: ${audioDuration}s`);
  
  // Use standardized videos directory instead of raw input videos
  const standardizedDir = path.join(path.dirname(videoDir), 'standardized_videos');
  
  // Check if standardized videos exist
  if (!await fs.pathExists(standardizedDir)) {
    throw new Error(`Standardized videos directory not found: ${standardizedDir}\nPlease run 'node standardize-videos.js' first to create standardized videos.`);
  }
  
  const allFiles = await fs.readdir(standardizedDir);
  const videoFiles = allFiles
    .filter(f => f.match(/\.mp4$/i))
    .map(f => path.join(standardizedDir, f));
  
  if (videoFiles.length === 0) {
    throw new Error(`No standardized videos found in ${standardizedDir}\nPlease run 'node standardize-videos.js' first.`);
  }
  
  console.log(`[extendVideoToMatchAudio] Found ${videoFiles.length} standardized video files`);
  
  // Get duration of each video file
  const videoDurations = [];
  for (const videoFile of videoFiles) {
    const duration = await getVideoDuration(videoFile);
    videoDurations.push({ file: videoFile, duration });
    console.log(`[extendVideoToMatchAudio] ${path.basename(videoFile)}: ${duration}s`);
  }
  
  // Calculate which videos to use and in what order
  const selectedVideos = [];
  let currentDuration = 0;
  let videoIndex = 0;
  
  while (currentDuration < audioDuration) {
    const video = videoDurations[videoIndex % videoDurations.length];
    const remainingTime = audioDuration - currentDuration;
    
    if (remainingTime >= video.duration) {
      // Use the full video
      selectedVideos.push({ 
        file: video.file, 
        duration: video.duration,
        trim: false
      });
      currentDuration += video.duration;
    } else {
      // Trim the last video to fit exactly
      selectedVideos.push({ 
        file: video.file, 
        duration: remainingTime,
        trim: true
      });
      currentDuration = audioDuration;
    }
    
    videoIndex++;
    
    // Safety check to prevent infinite loops
    if (videoIndex > videoDurations.length * 10) {
      console.warn("[extendVideoToMatchAudio] Safety break: too many iterations");
      break;
    }
  }
  
  console.log(`[extendVideoToMatchAudio] Selected ${selectedVideos.length} video segments for total duration: ${currentDuration}s`);
  
  // Create a temporary directory for final processing
  const tempDir = path.dirname(outputPath);
  const segmentDir = path.join(tempDir, 'video_segments');
  await fs.ensureDir(segmentDir);
  
  // Process videos (only trim if needed, since they're already standardized)
  const finalSegments: string[] = [];
  for (let i = 0; i < selectedVideos.length; i++) {
    const segment = selectedVideos[i];
    
    if (segment.trim) {
      // Need to trim the last video
      const segmentPath = path.join(segmentDir, `trimmed_${i}.mp4`);
      console.log(`[extendVideoToMatchAudio] Trimming segment ${i + 1}: ${path.basename(segment.file)} to ${segment.duration}s`);
      
      await new Promise<void>((resolve, reject) => {
        ffmpeg(segment.file)
          .setDuration(segment.duration)
          .outputOptions([
            '-c', 'copy', // Fast copy since already standardized
            '-avoid_negative_ts', 'make_zero'
          ])
          .output(segmentPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });
      
      finalSegments.push(segmentPath);
    } else {
      // Use the full standardized video as-is
      finalSegments.push(segment.file);
    }
  }
  
  // Create file list for concatenation
  const fileListPath = path.join(segmentDir, 'concat_list.txt');
  const fileListContent = finalSegments.map(p => `file '${p.replace(/\\/g, "/")}'`).join('\n');
  await fs.writeFile(fileListPath, fileListContent, 'utf8');
  
  console.log(`[extendVideoToMatchAudio] Concatenating ${finalSegments.length} video segments...`);
  
  // Concatenate using simple concat demuxer (fast since all videos are standardized)
  await new Promise<void>((resolve, reject) => {
    execFile(
      ffmpegPath || "ffmpeg",
      [
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", fileListPath,
        "-c", "copy", // Fast copy since already standardized
        outputPath
      ],
      (error, stdout, stderr) => {
        if (error) {
          console.error("ffmpeg concat error:", stderr || error.message);
          reject(new Error(stderr || error.message));
        } else {
          resolve();
        }
      }
    );
  });
  
  // Validate the final video duration
  const finalDuration = await getVideoDuration(outputPath);
  console.log(`[extendVideoToMatchAudio] Final video duration: ${finalDuration}s (expected: ${audioDuration}s)`);
  
  if (Math.abs(finalDuration - audioDuration) > 2.0) {
    console.warn(`[extendVideoToMatchAudio] Warning: Duration mismatch! Expected ${audioDuration}s, got ${finalDuration}s`);
  }
  
  // Clean up temporary files
  await fs.remove(segmentDir);
  
  console.log(`[extendVideoToMatchAudio] Video sequence created successfully: ${outputPath}`);
}

export async function overlayAudioOnVideo(videoPath: string, audioPath: string, outputPath: string) {
  console.log("[overlayAudioOnVideo] Overlaying audio:", audioPath, "on video:", videoPath, "->", outputPath);
  
  const audioDuration = await getAudioDuration(audioPath);
  const videoDuration = await getVideoDuration(videoPath);
  
  console.log(`[overlayAudioOnVideo] Audio duration: ${audioDuration}s, Video duration: ${videoDuration}s`);
  
  return new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .addInput(audioPath)
      .outputOptions([
        '-map', '0:v:0',              // Map video from first input
        '-map', '1:a:0',              // Map audio from second input (our TTS audio)
        '-c:v', 'copy',               // Copy video codec for speed
        '-c:a', 'aac',                // Re-encode audio to AAC
        '-t', audioDuration.toString() // Set output duration to audio duration
      ])
      .save(outputPath)
      .on('end', (_stdout: string | null, _stderr: string | null) => {
        console.log("[overlayAudioOnVideo] Done. Output:", outputPath);
        resolve();
      })
      .on('error', (err) => {
        console.error("[overlayAudioOnVideo] Error:", err);
        reject(err);
      });
  });
}

export async function chunkVideo(
  inputPath: string,
  outputDir: string,
  minChunk: number = 60,
  maxChunk: number = 90,
  minLastChunk: number = 30
) {
  console.log(`[chunkVideo] Chunking video: ${inputPath} -> ${outputDir}`);
  await fs.ensureDir(outputDir);

  // 1. Get video duration using fluent-ffmpeg's ffprobe
  const duration = await new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      if (!metadata.format || typeof metadata.format.duration !== 'number') {
        return reject(new Error('Could not determine video duration'));
      }
      resolve(metadata.format.duration);
    });
  });
  console.log(`[chunkVideo] Video duration: ${duration}s`);

  // Calculate optimal chunk size to ensure all chunks are between minChunk and maxChunk
  let numChunks = Math.ceil(duration / maxChunk);
  let optimalChunkSize = duration / numChunks;

  // If the optimal chunk size would create chunks smaller than minChunk,
  // reduce the number of chunks
  while (optimalChunkSize < minChunk && numChunks > 1) {
    numChunks--;
    optimalChunkSize = duration / numChunks;
  }

  console.log(`[chunkVideo] Creating ${numChunks} chunks of ~${optimalChunkSize.toFixed(1)}s each`);

  // 2. Create chunks with the calculated optimal size
  let start = 0;
  for (let idx = 1; idx <= numChunks; idx++) {
    let chunkLength: number;
    
    if (idx === numChunks) {
      // Last chunk - use remaining duration
      chunkLength = duration - start;
    } else {
      chunkLength = optimalChunkSize;
    }

    // Add overlap for all chunks except the first
    let chunkStart = start;
    if (idx > 1) {
      chunkStart = start - 1; // 1 second overlap
      if (chunkStart < 0) chunkStart = 0;
      chunkLength += 1; // extend chunk to cover the overlap
    }

    // Ensure we don't go past the video duration
    if (chunkStart + chunkLength > duration) {
      chunkLength = duration - chunkStart;
    }

    const outputFile = path.join(outputDir, `chunk_${idx}.mp4`);
    console.log(`[chunkVideo] Creating chunk ${idx}/${numChunks}: start=${chunkStart.toFixed(1)}s, duration=${chunkLength.toFixed(1)}s, output=${outputFile}`);
    
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(chunkStart)
        .setDuration(chunkLength)
        .outputOptions('-c', 'copy')
        .output(outputFile)
        .on('end', () => {
          console.log(`[chunkVideo] Chunk ${idx}/${numChunks} done: ${outputFile}`);
          resolve();
        })
        .on('error', (err: Error) => {
          console.error(`[chunkVideo] Error in chunk ${idx}:`, err);
          reject(err);
        })
        .run();
    });

    start += chunkLength - 1; // move start forward, but overlap by 1 second
  }
  console.log(`[chunkVideo] All ${numChunks} chunks created with optimal duration of ${optimalChunkSize.toFixed(1)}s`);
}

// Export types for video chunks
export interface VideoChunk {
  filePath: string;
  userId: string;
  inputTextId: string;
  timestamp: Date;
} 