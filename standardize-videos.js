const path = require('path');
const fs = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Helper function to get video duration
async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err);
      if (!metadata.format || typeof metadata.format.duration !== 'number') {
        return reject(new Error('Could not determine video duration'));
      }
      resolve(metadata.format.duration);
    });
  });
}

async function standardizeVideos() {
  const inputDir = path.join(__dirname, 'input_videos');
  const outputDir = path.join(__dirname, 'standardized_videos');
  
  console.log('🎬 Video Standardization Script');
  console.log('================================');
  
  // Check if input directory exists
  if (!await fs.pathExists(inputDir)) {
    console.error(`❌ Input directory not found: ${inputDir}`);
    console.log('Please create the input_videos folder and add your video files.');
    process.exit(1);
  }
  
  // Create output directory
  await fs.ensureDir(outputDir);
  
  // Get all video files
  const allFiles = await fs.readdir(inputDir);
  const videoFiles = allFiles.filter(f => f.match(/\.(mp4|mov|avi|mkv)$/i));
  
  if (videoFiles.length === 0) {
    console.error('❌ No video files found in input_videos directory');
    console.log('Supported formats: .mp4, .mov, .avi, .mkv');
    process.exit(1);
  }
  
  console.log(`📁 Found ${videoFiles.length} video files to standardize:`);
  videoFiles.forEach(file => console.log(`   - ${file}`));
  console.log('');
  
  // Process each video file
  for (let i = 0; i < videoFiles.length; i++) {
    const inputFile = videoFiles[i];
    const inputPath = path.join(inputDir, inputFile);
    const outputFile = `standardized_${i + 1}_${path.parse(inputFile).name}.mp4`;
    const outputPath = path.join(outputDir, outputFile);
    
    console.log(`🔄 Processing ${i + 1}/${videoFiles.length}: ${inputFile}`);
    
    try {
      // Get original video info
      const originalDuration = await getVideoDuration(inputPath);
      console.log(`   Original duration: ${originalDuration.toFixed(2)}s`);
      
      // Check if already processed
      if (await fs.pathExists(outputPath)) {
        console.log(`   ⏭️  Already exists: ${outputFile}`);
        continue;
      }
      
      // Standardize the video
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .outputOptions([
            '-c:v', 'libx264',      // Use H.264 codec
            '-preset', 'medium',     // Encoding speed vs quality
            '-crf', '23',           // Quality (lower = better quality)
            '-r', '30',             // Frame rate
            '-s', '1280x720',       // Resolution
            '-an',                  // Remove audio (we'll add TTS audio later)
            '-avoid_negative_ts', 'make_zero',
            '-movflags', '+faststart' // Optimize for streaming
          ])
          .output(outputPath)
          .on('start', (commandLine) => {
            console.log(`   🎯 Standardizing to 1280x720, 30fps, H.264...`);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              process.stdout.write(`\r   📊 Progress: ${Math.round(progress.percent)}%`);
            }
          })
          .on('end', () => {
            console.log('\n   ✅ Completed');
            resolve();
          })
          .on('error', (err) => {
            console.log('\n   ❌ Error:', err.message);
            reject(err);
          })
          .run();
      });
      
      // Verify the output
      const finalDuration = await getVideoDuration(outputPath);
      console.log(`   📏 Final duration: ${finalDuration.toFixed(2)}s`);
      
      const stats = await fs.stat(outputPath);
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(1);
      console.log(`   💾 File size: ${sizeMB}MB`);
      console.log('');
      
    } catch (error) {
      console.error(`   ❌ Failed to process ${inputFile}:`, error.message);
      console.log('');
    }
  }
  
  // Summary
  const finalFiles = await fs.readdir(outputDir);
  const standardizedCount = finalFiles.filter(f => f.endsWith('.mp4')).length;
  
  console.log('🎉 Standardization Complete!');
  console.log('============================');
  console.log(`✅ Successfully standardized: ${standardizedCount}/${videoFiles.length} videos`);
  console.log(`📁 Standardized videos saved to: ${outputDir}`);
  console.log('');
  console.log('📋 Standardization settings used:');
  console.log('   - Resolution: 1280x720');
  console.log('   - Frame rate: 30fps');
  console.log('   - Codec: H.264 (libx264)');
  console.log('   - Quality: CRF 23 (high quality)');
  console.log('   - Audio: Removed (TTS audio will be added later)');
  console.log('');
  console.log('🚀 You can now run generate.js for fast video processing!');
}

// Run the standardization
standardizeVideos().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
}); 