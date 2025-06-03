const path = require('path');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
ffmpeg.setFfmpegPath(ffmpegPath);

// Default paths
const DEFAULT_INPUT_VIDEO = path.join(__dirname, 'output', 'final_video_with_subtitles.mp4');
const DEFAULT_OUTPUT_DIR = path.join(__dirname, 'output', 'chunks');

// Parse command line arguments
const args = process.argv.slice(2);
const inputVideo = args[0] || DEFAULT_INPUT_VIDEO;
const outputDir = args[1] || DEFAULT_OUTPUT_DIR;

// Configuration
const MIN_CHUNK_DURATION = 60; // in seconds
const MAX_CHUNK_DURATION = 75; // in seconds

async function chunkVideo(inputPath, outputDir) {
  if (!await fs.pathExists(inputPath)) {
    console.error(`Error: Input video not found at ${inputPath}`);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  await fs.ensureDir(outputDir);
  
  console.log(`Chunking video: ${inputPath} -> ${outputDir}`);

  // Get video duration using ffprobe
  const duration = await new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      if (!metadata.format || typeof metadata.format.duration !== 'number') {
        return reject(new Error('Could not determine video duration'));
      }
      resolve(metadata.format.duration);
    });
  });
  
  console.log(`Video duration: ${duration.toFixed(2)}s`);

  // Calculate optimal chunk size
  let numChunks = Math.ceil(duration / MAX_CHUNK_DURATION);
  let optimalChunkSize = duration / numChunks;
  
  // Ensure chunks are at least MIN_CHUNK_DURATION seconds
  while (optimalChunkSize < MIN_CHUNK_DURATION && numChunks > 1) {
    numChunks--;
    optimalChunkSize = duration / numChunks;
  }
  
  console.log(`Creating ${numChunks} chunks of ~${optimalChunkSize.toFixed(1)}s each`);

  // Create chunks
  let start = 0;
  const chunkPromises = [];
  
  for (let idx = 1; idx <= numChunks; idx++) {
    let chunkLength;
    
    if (idx === numChunks) {
      // Last chunk - use remaining duration
      chunkLength = duration - start;
    } else {
      chunkLength = optimalChunkSize;
    }

    // Ensure we don't go past the video duration
    if (start + chunkLength > duration) {
      chunkLength = duration - start;
    }

    const outputFile = path.join(outputDir, `chunk_${idx}.mp4`);
    console.log(`Creating chunk ${idx}/${numChunks}: start=${start.toFixed(1)}s, duration=${chunkLength.toFixed(1)}s`);
    
    const chunkPromise = new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(start)
        .setDuration(chunkLength)
        .outputOptions('-c', 'copy') // Copy codecs for faster processing
        .output(outputFile)
        .on('end', () => {
          console.log(`Chunk ${idx}/${numChunks} created: ${outputFile}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`Error in chunk ${idx}:`, err);
          reject(err);
        })
        .run();
    });
    
    chunkPromises.push(chunkPromise);
    start += chunkLength;
  }

  // Wait for all chunks to be created
  await Promise.all(chunkPromises);
  console.log(`All ${numChunks} chunks created successfully in ${outputDir}`);
}

// Run the function
(async () => {
  try {
    console.log(`Starting video chunking process...`);
    console.log(`Input video: ${inputVideo}`);
    console.log(`Output directory: ${outputDir}`);
    await chunkVideo(inputVideo, outputDir);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})(); 