import path from "path";
import { generateTTS } from "./service/tts";
import { concatenateVideos, overlayAudioOnVideo, chunkVideo } from "./service/video";
import fs from "fs-extra";

interface VideoChunk {
  filePath: string;
  inputTextId: string;
  timestamp: Date;
}

export async function processUserText(
  userText: string, 
  inputTextId: string, 
  outputDir: string
): Promise<VideoChunk[]> {
  const baseDir = path.resolve(__dirname); // src directory
  const inputVideosDir = path.join(baseDir, "input_videos");
  const ttsAudio = path.join(outputDir, "tts_audio.wav");
  const concatenatedVideo = path.join(outputDir, "concatenated.mp4");
  const finalVideo = path.join(outputDir, "final_with_audio.mp4");
  const chunksDir = path.join(outputDir, "chunks");

  console.log("[processUserText] Ensuring output and input directories exist...");
  await fs.ensureDir(outputDir);
  await fs.ensureDir(inputVideosDir);
  await fs.ensureDir(chunksDir);

  console.log("[processUserText] Generating TTS audio...");
  await generateTTS(userText, ttsAudio);
  console.log("[processUserText] TTS audio generated at:", ttsAudio);

  console.log("[processUserText] Concatenating input videos...");
  await concatenateVideos(inputVideosDir, concatenatedVideo);
  console.log("[processUserText] Concatenated video at:", concatenatedVideo);

  console.log("[processUserText] Overlaying TTS audio on video...");
  await overlayAudioOnVideo(concatenatedVideo, ttsAudio, finalVideo);
  console.log("[processUserText] Final video with audio at:", finalVideo);

  // Chunk the final video into 60-90 second segments
  console.log("[processUserText] Chunking video into 60-80 second segments...");
  await chunkVideo(finalVideo, chunksDir, 60, 80, 30);

  // Get all generated chunks and return their info
  const chunkFiles = await fs.readdir(chunksDir);
  const videoChunks: VideoChunk[] = chunkFiles
    .filter(file => file.endsWith('.mp4'))
    .sort((a, b) => {
      // Sort by chunk number
      const numA = parseInt(a.match(/chunk_(\d+)\.mp4/)?.[1] || '0');
      const numB = parseInt(b.match(/chunk_(\d+)\.mp4/)?.[1] || '0');
      return numA - numB;
    })
    .map(file => ({
      filePath: path.join(chunksDir, file),
      inputTextId,
      timestamp: new Date()
    }));

  // Store the chunk paths in a manifest file
  const manifestPath = path.join(outputDir, 'chunks_manifest.json');
  await fs.writeJson(manifestPath, {
    chunks: videoChunks,
    createdAt: new Date().toISOString(),
    inputTextId
  }, { spaces: 2 });

  console.log(`[processUserText] Generated ${videoChunks.length} video chunks`);
  console.log(`[processUserText] Chunks manifest stored at: ${manifestPath}`);
  return videoChunks;
} 