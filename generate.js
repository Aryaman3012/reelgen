const path = require('path');
const fs = require('fs-extra');
const userText = fs.readFileSync('./userText.txt', 'utf8');

// Import the compiled JS
const { generateTTS } = require('./dist/service/tts');
const { concatenateVideos, overlayAudioOnVideo } = require('./dist/service/video');

// Function to split text into chunks without breaking words
function splitTextIntoChunks(text, maxLen = 4000) {
  const chunks = [];
  let currentIndex = 0;
  
  while (currentIndex < text.length) {
    // Get the next chunk of maxLen characters
    let endIndex = Math.min(currentIndex + maxLen, text.length);
    
    // If we're not at the end of the text, find the last space to avoid breaking words
    if (endIndex < text.length) {
      const lastSpace = text.lastIndexOf(' ', endIndex);
      if (lastSpace > currentIndex) {
        endIndex = lastSpace;
      }
    }
    
    chunks.push(text.slice(currentIndex, endIndex));
    currentIndex = endIndex + 1; // Skip the space
  }
  
  return chunks;
}

// Generate a unique runId for this script execution
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '');

async function main() {
  try {
    // 1. Create required directories
    const outputDir = path.join(__dirname, 'output');
    const tempDir = path.join(outputDir, 'temp', runId);
    await fs.ensureDir(outputDir);
    await fs.ensureDir(tempDir);
    await fs.ensureDir(path.join(__dirname, 'input_videos'));
    
    // 2. Split text into chunks
    const chunks = splitTextIntoChunks(userText, 4000);
    console.log(`Split text into ${chunks.length} chunks`);
    
    // 3. Generate TTS audio for each chunk
    const audioChunkPaths = [];
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const audioPath = path.join(tempDir, `chunk_${idx+1}.wav`);
      console.log(`Generating TTS for chunk ${idx+1}/${chunks.length}...`);
      await generateTTS(chunk, audioPath);
      audioChunkPaths.push(audioPath);
    }
    
    // 4. Concatenate all audio chunks into one combined audio
    const combinedAudioPath = path.join(tempDir, 'combined_audio.wav');
    if (audioChunkPaths.length > 1) {
      console.log('Concatenating audio chunks...');
      // Create a file list for ffmpeg
      const audioListPath = path.join(tempDir, 'audio_list.txt');
      const audioListContent = audioChunkPaths.map(p => `file '${p.replace(/\\/g, "/")}'`).join('\n');
      await fs.writeFile(audioListPath, audioListContent, 'utf8');
      
      // Use ffmpeg to concatenate audio
      const ffmpegPath = require('ffmpeg-static');
      const { execFile } = require('child_process');
      await new Promise((resolve, reject) => {
        execFile(
          ffmpegPath,
          [
            '-y',
            '-f', 'concat',
            '-safe', '0',
            '-i', audioListPath,
            combinedAudioPath
          ],
          (error, stdout, stderr) => {
            if (error) {
              console.error('Error concatenating audio:', stderr || error.message);
              reject(error);
            } else {
              resolve();
            }
          }
        );
      });
    } else if (audioChunkPaths.length === 1) {
      // Just copy the single audio file
      await fs.copy(audioChunkPaths[0], combinedAudioPath);
    } else {
      throw new Error('No audio chunks generated');
    }
    
    console.log('Combined audio created at:', combinedAudioPath);
    
    // 5. Concatenate videos to match the audio duration
    const inputVideosDir = path.join(__dirname, 'input_videos');
    const combinedVideoPath = path.join(tempDir, 'combined_video.mp4');
    console.log('Concatenating input videos...');
    await concatenateVideos(inputVideosDir, combinedVideoPath);
    
    // 6. Overlay the audio onto the video
    const finalVideoPath = path.join(outputDir, 'final_video.mp4');
    console.log('Overlaying audio onto video...');
    await overlayAudioOnVideo(combinedVideoPath, combinedAudioPath, finalVideoPath);
    
    console.log('🎉 Process completed successfully!');
    console.log('Final video saved to:', finalVideoPath);
    
  } catch (err) {
    console.error('Error in processing:', err);
    process.exit(1);
  }
}

main();
