import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs-extra';
import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { generateTTS } from './service/tts';
import { concatenateVideos, overlayAudioOnVideo, chunkVideo } from './service/video';
import { processUserText } from './main';
import AWS from 'aws-sdk';
import FormData from 'form-data';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Initialize AWS SDK
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const execAsync = promisify(exec);
const PORT = process.env.PORT || 3000;
const app = express();

// Utility function to handle errors
const handleError = (error: unknown): { message: string; stack?: string } => {
  const err = error as Error;
  return { message: err.message, stack: err.stack };
};

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving
app.use('/output', express.static(path.join(__dirname, '../output')));
app.use('/processed_videos', express.static(path.join(__dirname, '../processed_videos')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

/**
 * Upload processed video to S3
 * POST /api/upload-to-s3
 */
// @ts-ignore Express v5 type compatibility
app.post('/api/upload-to-s3', async (req, res) => {
  try {
    const { videoPath } = req.body;
    
    if (!videoPath) {
      return res.status(400).json({ error: 'Video path is required' });
    }

    // Validate video path exists
    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: `Video file not found: ${videoPath}` });
    }

    console.log('[API] Starting S3 upload...');
    
    // Upload to S3
    const fileName = path.basename(videoPath);
    const fileStream = fs.createReadStream(videoPath);
    
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET || '',
      Key: `processed_videos/${fileName}`,
      Body: fileStream
    };

    const uploadResult = await s3.upload(uploadParams).promise();
    
    res.json({
      success: true,
      message: 'Video uploaded to S3 successfully',
      input: {
        videoPath: videoPath
      },
      output: {
        s3Location: uploadResult.Location,
        s3Key: uploadResult.Key,
        s3Bucket: uploadResult.Bucket
      }
    });
    
  } catch (error) {
    console.error('[API] Error in S3 upload:', error);
    const err = error as Error;
    res.status(500).json({
      error: 'Failed to upload to S3',
      details: err.message,
      stack: err.stack
    });
  }
});

/**
 * POST /api/pipeline/generate
 * Step 1: Generate TTS audio and combine with videos (equivalent to generate.js)
 */
// @ts-ignore Express v5 type compatibility
app.post('/api/pipeline/generate', async (req, res) => {
  try {
    const { text, caption, outputDir = 'output' } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!caption) {
      return res.status(400).json({ error: 'Caption is required' });
    }

    console.log('[API] Starting generate pipeline...');
    
    // Create userText.txt file with combined text for TTS
    await fs.writeFile('userText.txt', `${caption} ${text}`, 'utf8');
    
    // Create caption.txt file for video overlay
    await fs.writeFile('caption.txt', caption, 'utf8');
    
    // Run the generate.js script
    const { stdout, stderr } = await execAsync('node generate.js');
    
    console.log('[API] Generate.js completed successfully');
    console.log('stdout:', stdout);
    if (stderr) console.log('stderr:', stderr);
    
    // Check if output files were created
    const outputPath = path.join(__dirname, `../${outputDir}`);
    const finalVideoPath = path.join(outputPath, 'final_with_audio.mp4');
    
    const result = {
      success: true,
      message: 'Video generation completed successfully',
      files: {
        finalVideo: finalVideoPath,
        outputDirectory: outputPath
      },
      logs: {
        stdout: stdout,
        stderr: stderr
      }
    };
    
    res.json(result);
    
  } catch (error) {
    console.error('[API] Error in generate pipeline:', error);
    const err = error as Error;
    res.status(500).json({
      error: 'Failed to generate video',
      details: err.message,
      stack: err.stack
    });
  }
});

/**
 * POST /api/pipeline/subtitles
 * Step 2: Generate subtitles (equivalent to generate_subtitles_only.py)
 */
// @ts-ignore Express v5 type compatibility
app.post('/api/pipeline/subtitles', async (req, res) => {
  try {
    const { videoPath = 'output/final_with_audio.mp4', modelType = 'base' } = req.body;
    
    console.log('[API] Starting subtitle generation...');
    
    // Check if video file exists
    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: `Video file not found: ${videoPath}` });
    }
    
    // Run the Python subtitle generation script
    const { stdout, stderr } = await execAsync('python3 ./generate_subtitles_only.py');
    
    console.log('[API] Subtitle generation completed successfully');
    console.log('stdout:', stdout);
    if (stderr) console.log('stderr:', stderr);
    
    // Check for generated subtitle files
    const outputDir = path.dirname(videoPath);
    const videoName = path.basename(videoPath, path.extname(videoPath));
    const subtitleFiles = {
      srt: path.join(outputDir, `${videoName}.srt`),
      vtt: path.join(outputDir, `${videoName}.vtt`),
      txt: path.join(outputDir, `${videoName}.txt`)
    };
    
    // Check which files were actually created
    const createdFiles: Record<string, string> = {};
    for (const [format, filePath] of Object.entries(subtitleFiles)) {
      if (await fs.pathExists(filePath)) {
        createdFiles[format] = filePath;
      }
    }
    
    res.json({
      success: true,
      message: 'Subtitle generation completed successfully',
      files: createdFiles,
      videoPath: videoPath,
      logs: {
        stdout: stdout,
        stderr: stderr
      }
    });
    
  } catch (error) {
    console.error('[API] Error in subtitle generation:', error);
    const err = error as Error;
    res.status(500).json({
      error: 'Failed to generate subtitles',
      details: err.message,
      stack: err.stack
    });
  }
});

/**
 * POST /api/pipeline/burn-subtitles
 * Step 3: Burn subtitles into video (equivalent to burn_subtitles.py)
 */
// @ts-ignore Express v5 type compatibility
app.post('/api/pipeline/burn-subtitles', async (req, res) => {
  try {
    const { 
      videoPath = 'output/final_with_audio.mp4',
      subtitlePath = 'output/final_with_audio.srt',
      outputPath = 'output/final_video_with_subtitles.mp4'
    } = req.body;
    
    console.log('[API] Starting subtitle burning...');
    
    // Check if input files exist
    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: `Video file not found: ${videoPath}` });
    }
    
    if (!await fs.pathExists(subtitlePath)) {
      return res.status(400).json({ error: `Subtitle file not found: ${subtitlePath}` });
    }
    
    // Run the Python subtitle burning script
    const { stdout, stderr } = await execAsync('python3 burn_subtitles.py');
    
    console.log('[API] Subtitle burning completed successfully');
    console.log('stdout:', stdout);
    if (stderr) console.log('stderr:', stderr);
    
    // Check if output file was created
    const outputExists = await fs.pathExists(outputPath);
    
    res.json({
      success: true,
      message: 'Subtitle burning completed successfully',
      files: {
        input: videoPath,
        subtitles: subtitlePath,
        output: outputPath,
        outputExists: outputExists
      },
      logs: {
        stdout: stdout,
        stderr: stderr
      }
    });
    
  } catch (error) {
    console.error('[API] Error in subtitle burning:', error);
    const errorInfo = handleError(error);
    res.status(500).json({
      error: 'Failed to burn subtitles',
      details: errorInfo.message,
      stack: errorInfo.stack
    });
  }
});

/**
 * POST /api/pipeline/chunk
 * Step 4: Chunk video into segments (equivalent to chunk-video.js)
 */
// @ts-ignore Express v5 type compatibility
app.post('/api/pipeline/chunk', async (req, res) => {
  try {
    const { 
      videoPath = 'output/final_video_with_subtitles.mp4',
      outputDir = 'output/chunks',
      minChunk = 60,
      maxChunk = 90
    } = req.body;
    
    console.log('[API] Starting video chunking...');
    
    // Check if input video exists
    if (!await fs.pathExists(videoPath)) {
      return res.status(400).json({ error: `Video file not found: ${videoPath}` });
    }
    
    // Run the chunk-video.js script
    const { stdout, stderr } = await execAsync('node ./chunk-video.js');
    
    console.log('[API] Video chunking completed successfully');
    console.log('stdout:', stdout);
    if (stderr) console.log('stderr:', stderr);
    
    // Get list of created chunks
    const chunksDir = path.join(__dirname, '../output/chunks');
    let chunkFiles: Array<{filename: string, path: string, relativePath: string}> = [];
    
    if (await fs.pathExists(chunksDir)) {
      const files = await fs.readdir(chunksDir);
      chunkFiles = files
        .filter(file => file.endsWith('.mp4'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/chunk_(\d+)\.mp4/)?.[1] || '0');
          const numB = parseInt(b.match(/chunk_(\d+)\.mp4/)?.[1] || '0');
          return numA - numB;
        })
        .map(file => ({
          filename: file,
          path: path.join(chunksDir, file),
          relativePath: `output/chunks/${file}`
        }));
    }
    
    res.json({
      success: true,
      message: 'Video chunking completed successfully',
      input: videoPath,
      outputDirectory: outputDir,
      chunks: chunkFiles,
      chunkCount: chunkFiles.length,
      logs: {
        stdout: stdout,
        stderr: stderr
      }
    });
    
  } catch (error) {
    console.error('[API] Error in video chunking:', error);
    const errorInfo = handleError(error);
    res.status(500).json({
      error: 'Failed to chunk video',
      details: errorInfo.message,
      stack: errorInfo.stack
    });
  }
});

/**
 * POST /api/pipeline/overlay
 * Step 5: Add text overlay to video chunks (equivalent to video_overlay_opencv.py)
 */
// @ts-ignore Express v5 type compatibility
app.post('/api/pipeline/overlay', async (req, res) => {
  try {
    const { 
      caption,
      chunksDir = 'output/chunks',
      outputDir = 'processed_videos'
    } = req.body;
    
    console.log('[API] Starting video overlay...');
    
    // Update caption.txt if caption is provided
    if (caption) {
      await fs.writeFile('caption.txt', caption, 'utf8');
    }
    
    // Check if chunks directory exists
    const chunksPath = path.join(__dirname, `../${chunksDir}`);
    if (!await fs.pathExists(chunksPath)) {
      return res.status(400).json({ error: `Chunks directory not found: ${chunksPath}` });
    }
    
    // Run the video overlay script
    const { stdout, stderr } = await execAsync('python3 ./video_overlay_opencv.py');
    
    console.log('[API] Video overlay completed successfully');
    console.log('stdout:', stdout);
    if (stderr) console.log('stderr:', stderr);
    
    // Get list of processed videos
    const processedDir = path.join(__dirname, `../${outputDir}`);
    let processedFiles: Array<{filename: string, path: string, relativePath: string}> = [];
    
    if (await fs.pathExists(processedDir)) {
      const files = await fs.readdir(processedDir);
      processedFiles = files
        .filter(file => file.endsWith('.mp4'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/video_(\d+)\.mp4/)?.[1] || '0');
          const numB = parseInt(b.match(/video_(\d+)\.mp4/)?.[1] || '0');
          return numA - numB;
        })
        .map(file => ({
          filename: file,
          path: path.join(processedDir, file),
          relativePath: `${outputDir}/${file}`
        }));
    }
    
    res.json({
      success: true,
      message: 'Video overlay completed successfully',
      inputDirectory: chunksDir,
      outputDirectory: outputDir,
      processedVideos: processedFiles,
      videoCount: processedFiles.length,
      logs: {
        stdout: stdout,
        stderr: stderr
      }
    });
    
  } catch (error) {
    console.error('[API] Error in video overlay:', error);
    const errorInfo = handleError(error);
    res.status(500).json({
      error: 'Failed to add video overlay',
      details: errorInfo.message,
      stack: errorInfo.stack
    });
  }
});

/**
 * Compress video using FFmpeg before upload
 */
async function compressVideo(inputPath: string): Promise<string> {
  try {
    const dir = path.dirname(inputPath);
    const filename = path.basename(inputPath, '.mp4');
    const outputPath = path.join(dir, `${filename}_compressed.mp4`);

    console.log(`[API] Compressing video: ${inputPath}`);
    
    // Use FFmpeg to compress the video
    // -crf 28: Higher compression (default is 23, higher = more compression)
    // -preset faster: Faster encoding with reasonable compression
    // -movflags +faststart: Enables fast start for web playback
    const command = `ffmpeg -y -i "${inputPath}" -c:v libx264 -crf 28 -preset faster -c:a aac -b:a 128k -movflags +faststart "${outputPath}"`;
    
    await execAsync(command);
    console.log(`[API] Video compressed successfully: ${outputPath}`);
    
    return outputPath;
  } catch (error) {
    console.error(`[API] Error compressing video:`, error);
    throw error;
  }
}

/**
 * Upload a video file directly to S3
 */
async function uploadVideoToS3(videoPath: string): Promise<string> {
  try {
    // Compress the video first
    const compressedVideoPath = await compressVideo(videoPath);
    
    const fileStream = fs.createReadStream(compressedVideoPath);
    const fileName = path.basename(videoPath); // Use original filename
    
    const uploadParams = {
      Bucket: process.env.AWS_S3_BUCKET || '',
      Key: `processed_videos/${fileName}`,
      Body: fileStream
    };

    console.log(`[S3] Uploading ${fileName} to S3...`);
    const uploadResult = await s3.upload(uploadParams).promise();
    
    // Clean up compressed video
    await fs.remove(compressedVideoPath).catch(err => 
      console.warn(`[S3] Warning: Could not delete compressed video: ${err.message}`)
    );

    return uploadResult.Location;
  } catch (error) {
    console.error(`[S3] Error uploading ${videoPath}:`, error);
    throw error;
  }
}

/**
 * POST /api/pipeline/run-all
 * Run the complete pipeline (equivalent to run_pipeline.ps1)
 */
// @ts-ignore Express v5 type compatibility
app.post('/api/pipeline/run-all', async (req, res) => {
  const results: Array<{step: number, name: string, success: boolean, stdout?: string, stderr?: string, error?: string}> = [];
  
  try {
    const { text, caption } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!caption) {
      return res.status(400).json({ error: 'Caption is required' });
    }
    
    console.log('[API] Starting complete pipeline...');
    
    // Write text to userText.txt (combined for TTS)
    await fs.writeFile('userText.txt', `${caption} ${text}`, 'utf8');
    
    // Write caption to caption.txt (for video overlay)
    await fs.writeFile('caption.txt', caption, 'utf8');

    // Step 1: Generate video
    console.log('[API] Step 1/5: Generate video...');
    try {
      const { stdout: stdout1, stderr: stderr1 } = await execAsync('node generate.js');
      results.push({
        step: 1,
        name: 'generate',
        success: true,
        stdout: stdout1,
        stderr: stderr1
      });
    } catch (error) {
      const errorInfo = handleError(error);
      results.push({
        step: 1,
        name: 'generate',
        success: false,
        error: errorInfo.message
      });
      throw error;
    }
    
    // Step 2: Generate subtitles
    console.log('[API] Step 2/5: Generate subtitles...');
    try {
      const { stdout: stdout2, stderr: stderr2 } = await execAsync('python3 ./generate_subtitles_only.py');
      results.push({
        step: 2,
        name: 'subtitles',
        success: true,
        stdout: stdout2,
        stderr: stderr2
      });
    } catch (error) {
      const errorInfo = handleError(error);
      results.push({
        step: 2,
        name: 'subtitles',
        success: false,
        error: errorInfo.message
      });
      throw error;
    }
    
    // Step 3: Burn subtitles
    console.log('[API] Step 3/5: Burn subtitles...');
    try {
      const { stdout: stdout3, stderr: stderr3 } = await execAsync('python3 burn_subtitles.py');
      results.push({
        step: 3,
        name: 'burn-subtitles',
        success: true,
        stdout: stdout3,
        stderr: stderr3
      });
    } catch (error) {
      const errorInfo = handleError(error);
      results.push({
        step: 3,
        name: 'burn-subtitles',
        success: false,
        error: errorInfo.message
      });
      throw error;
    }
    
    // Step 4: Chunk video
    console.log('[API] Step 4/5: Chunk video...');
    try {
      const { stdout: stdout4, stderr: stderr4 } = await execAsync('node ./chunk-video.js');
      results.push({
        step: 4,
        name: 'chunk',
        success: true,
        stdout: stdout4,
        stderr: stderr4
      });
    } catch (error) {
      const errorInfo = handleError(error);
      results.push({
        step: 4,
        name: 'chunk',
        success: false,
        error: errorInfo.message
      });
      throw error;
    }
    
    // Step 5: Video overlay
    console.log('[API] Step 5/5: Video overlay...');
    try {
      const { stdout: stdout5, stderr: stderr5 } = await execAsync('python3 ./video_overlay_opencv.py');
      results.push({
        step: 5,
        name: 'overlay',
        success: true,
        stdout: stdout5,
        stderr: stderr5
      });
    } catch (error) {
      const errorInfo = handleError(error);
      results.push({
        step: 5,
        name: 'overlay',
        success: false,
        error: errorInfo.message
      });
      throw error;
    }
    
    console.log('[API] Complete pipeline finished successfully');
    
    // After all steps complete, get processed videos and upload them
    const processedDir = path.join(__dirname, '../processed_videos');
    let processedFiles: Array<{
      filename: string, 
      path: string, 
      relativePath: string,
      s3Url?: string
    }> = [];
    
    if (await fs.pathExists(processedDir)) {
      const files = await fs.readdir(processedDir);
      processedFiles = files
        .filter(file => file.endsWith('.mp4'))
        .sort((a, b) => {
          const numA = parseInt(a.match(/video_(\d+)\.mp4/)?.[1] || '0');
          const numB = parseInt(b.match(/video_(\d+)\.mp4/)?.[1] || '0');
          return numA - numB;
        })
        .map(file => ({
          filename: file,
          path: path.join(processedDir, file),
          relativePath: `processed_videos/${file}`
        }));

      // Upload each video to S3
      console.log('[API] Uploading processed videos to S3...');
      for (const file of processedFiles) {
        try {
          const s3Url = await uploadVideoToS3(file.path);
          file.s3Url = s3Url;
          console.log(`[API] Successfully uploaded ${file.filename} to S3`);
        } catch (error) {
          console.error(`[API] Failed to upload ${file.filename}:`, error);
          file.s3Url = `Error: ${(error as Error).message}`;
        }
      }
    }
    
    res.json({
      success: true,
      message: 'Complete pipeline executed successfully',
      inputText: text,
      inputCaption: caption,
      results: results,
      finalVideos: processedFiles,
      totalSteps: 5,
      completedSteps: results.filter(r => r.success).length,
      uploadResults: processedFiles.map(file => ({
        filename: file.filename,
        s3Url: file.s3Url
      }))
    });
    
  } catch (error) {
    console.error('[API] Error in complete pipeline:', error);
    const errorInfo = handleError(error);
    res.status(500).json({
      error: 'Pipeline execution failed',
      details: errorInfo.message,
      results: results,
      failedAt: results.length + 1
    });
  }
});

/**
 * GET /api/pipeline/status
 * Get current pipeline status and output files
 */
app.get('/api/pipeline/status', async (req, res) => {
  try {
    const outputDir = path.join(__dirname, '../output');
    const processedDir = path.join(__dirname, '../processed_videos');
    const chunksDir = path.join(__dirname, '../output/chunks');
    
    const status = {
      directories: {
        output: {
          exists: await fs.pathExists(outputDir),
          files: [] as Array<{name: string, path: string, relativePath: string}>
        },
        processed: {
          exists: await fs.pathExists(processedDir),
          files: [] as Array<{name: string, path: string, relativePath: string}>
        },
        chunks: {
          exists: await fs.pathExists(chunksDir),
          files: [] as Array<{name: string, path: string, relativePath: string}>
        }
      },
      files: {
        userText: await fs.pathExists('userText.txt') ? await fs.readFile('userText.txt', 'utf8') : null,
        finalVideo: await fs.pathExists(path.join(outputDir, 'final_with_audio.mp4')),
        finalVideoWithSubtitles: await fs.pathExists(path.join(outputDir, 'final_video_with_subtitles.mp4')),
        subtitles: {
          srt: await fs.pathExists(path.join(outputDir, 'final_video.srt')),
          vtt: await fs.pathExists(path.join(outputDir, 'final_video.vtt')),
          txt: await fs.pathExists(path.join(outputDir, 'final_video.txt'))
        }
      }
    };
    
    // Get files in each directory
    for (const [dirName, dirInfo] of Object.entries(status.directories)) {
      if (dirInfo.exists) {
        const dirPath = dirName === 'output' ? outputDir : 
                      dirName === 'processed' ? processedDir : chunksDir;
        const files = await fs.readdir(dirPath);
        dirInfo.files = files.map(file => ({
          name: file,
          path: path.join(dirPath, file),
          relativePath: `${dirName === 'output' ? 'output' : 
                          dirName === 'processed' ? 'processed_videos' : 'output/chunks'}/${file}`
        }));
      }
    }
    
    res.json(status);
    
  } catch (error) {
    console.error('[API] Error getting pipeline status:', error);
    const errorInfo = handleError(error);
    res.status(500).json({
      error: 'Failed to get pipeline status',
      details: errorInfo.message
    });
  }
});

/**
 * DELETE /api/pipeline/cleanup
 * Clean up output directories
 */
app.delete('/api/pipeline/cleanup', async (req, res) => {
  try {
    const { directories = ['output', 'processed_videos'] } = req.body;
    
    const results = [];
    
    for (const dir of directories) {
      const dirPath = path.join(__dirname, `../${dir}`);
      
      if (await fs.pathExists(dirPath)) {
        try {
          await fs.emptyDir(dirPath);
          results.push({
            directory: dir,
            success: true,
            message: `Cleaned ${dir} directory`
          });
        } catch (error) {
          const errorInfo = handleError(error);
          results.push({
            directory: dir,
            success: false,
            error: errorInfo.message
          });
        }
      } else {
        results.push({
          directory: dir,
          success: true,
          message: `Directory ${dir} does not exist`
        });
      }
    }
    
    res.json({
      success: true,
      message: 'Cleanup completed',
      results: results
    });
    
  } catch (error) {
    console.error('[API] Error in cleanup:', error);
    const errorInfo = handleError(error);
    res.status(500).json({
      error: 'Failed to cleanup directories',
      details: errorInfo.message
    });
  }
});

// Error handling middleware
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    details: error.message
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ReelGen API Server running on port ${PORT}`);
  console.log(`📖 Health check: http://localhost:${PORT}/health`);
  console.log(`📁 Static files: http://localhost:${PORT}/output/`);
  console.log(`📁 Processed videos: http://localhost:${PORT}/processed_videos/`);
});

export default app; 