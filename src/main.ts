import path from "path";
import { generateTTS } from "./service/tts";
import { concatenateVideos, overlayAudioOnVideo, chunkVideoToDb } from "./service/video";
import fs from "fs-extra";

export async function processUserText(userText: string, userId: string, inputTextId: string, videosDb: any) {
  const baseDir = path.resolve(__dirname); // src directory
  const outputDir = path.join(baseDir, "output");
  const inputVideosDir = path.join(baseDir, "input_videos");
  const ttsAudio = path.join(outputDir, "tts_audio.wav");
  const concatenatedVideo = path.join(outputDir, "concatenated.mp4");
  const finalVideo = path.join(outputDir, "final_with_audio.mp4");

  console.log("[processUserText] Ensuring output and input directories exist...");
  await fs.ensureDir(outputDir);
  await fs.ensureDir(inputVideosDir);

  console.log("[processUserText] Generating TTS audio...");
  await generateTTS(userText, ttsAudio);
  console.log("[processUserText] TTS audio generated at:", ttsAudio);

  console.log("[processUserText] Concatenating input videos...");
  await concatenateVideos(inputVideosDir, concatenatedVideo);
  console.log("[processUserText] Concatenated video at:", concatenatedVideo);

  console.log("[processUserText] Overlaying TTS audio on video...");
  await overlayAudioOnVideo(concatenatedVideo, ttsAudio, finalVideo);
  console.log("[processUserText] Final video with audio at:", finalVideo);

  console.log("[processUserText] Chunking final video and storing directly to DB...");
  const videoDocs = await chunkVideoToDb({
    inputPath: finalVideo,
    videosDb,
    userId,
    inputTextId,
  });
  console.log("[processUserText] Video chunks stored in DB:", videoDocs.map(v => v._id));
  return videoDocs;
} 