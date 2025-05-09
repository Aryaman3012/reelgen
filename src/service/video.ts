import ffmpeg from "fluent-ffmpeg";
import fs from "fs-extra";
import path from "path";
import { execFile } from "child_process";
import ffmpegPath from "ffmpeg-static";
import util from "util";
import { PassThrough } from "stream";
import concat from "concat-stream";
const execFilePromise = util.promisify(execFile);

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

export async function overlayAudioOnVideo(videoPath: string, audioPath: string, outputPath: string) {
  console.log("[overlayAudioOnVideo] Overlaying audio:", audioPath, "on video:", videoPath, "->", outputPath);
  return new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .addInput(audioPath)
      .outputOptions('-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-shortest')
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

  // 2. Calculate chunk start/end times with lookahead logic
  let start = 0, idx = 1;
  let prevChunkLength = 0;
  while (start < duration) {
    let remaining = duration - start;
    let chunkLength = Math.min(maxChunk, remaining);

    // Lookahead: If taking chunkLength would leave a last chunk < minLastChunk, adjust
    if (remaining - chunkLength < minLastChunk && remaining > maxChunk) {
      chunkLength = remaining - minLastChunk;
      if (chunkLength < minChunk) chunkLength = minChunk;
    }

    // If the chunk would be too short, break
    if (chunkLength < minLastChunk && idx > 1) break;

    // For overlap: if not the first chunk, start 1 second earlier
    let chunkStart = start;
    if (idx > 1) {
      chunkStart = start - 1;
      if (chunkStart < 0) chunkStart = 0;
      chunkLength += 1; // extend chunk to cover the overlap
      // Ensure we don't go past the video duration
      if (chunkStart + chunkLength > duration) {
        chunkLength = duration - chunkStart;
      }
    }

    const outputFile = path.join(outputDir, `chunk_${idx}.mp4`);
    console.log(`[chunkVideo] Creating chunk ${idx}: start=${chunkStart}s, duration=${chunkLength}s, output=${outputFile}`);
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(chunkStart)
        .setDuration(chunkLength)
        .outputOptions('-c', 'copy')
        .output(outputFile)
        .on('end', () => {
          console.log(`[chunkVideo] Chunk ${idx} done: ${outputFile}`);
          resolve();
        })
        .on('error', (err: Error) => {
          console.error(`[chunkVideo] Error in chunk ${idx}:`, err);
          reject(err);
        })
        .run();
    });
    start += chunkLength - 1; // move start forward, but overlap by 1 second
    idx++;
  }
  console.log(`[chunkVideo] All chunks created.`);
}

export async function chunkVideoToDb({
  inputPath,
  videosDb,
  userId,
  inputTextId,
  minChunk = 60,
  maxChunk = 90,
  minLastChunk = 30,
}: {
  inputPath: string,
  videosDb: any,
  userId: string,
  inputTextId: string,
  minChunk?: number,
  maxChunk?: number,
  minLastChunk?: number,
}) {
  // 1. Get video duration
  const duration = await new Promise<number>((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err);
      if (!metadata.format || typeof metadata.format.duration !== 'number') {
        return reject(new Error('Could not determine video duration'));
      }
      resolve(metadata.format.duration);
    });
  });

  // 2. Calculate chunk start/end times
  let start = 0, idx = 1;
  const now = new Date().toISOString();
  const videoDocs = [];
  while (start < duration) {
    let remaining = duration - start;
    let chunkLength = Math.min(maxChunk, remaining);
    if (remaining - chunkLength < minLastChunk && remaining > maxChunk) {
      chunkLength = remaining - minLastChunk;
      if (chunkLength < minChunk) chunkLength = minChunk;
    }
    if (chunkLength < minLastChunk && idx > 1) break;
    let chunkStart = start;
    if (idx > 1) {
      chunkStart = start - 1;
      if (chunkStart < 0) chunkStart = 0;
      chunkLength += 1;
      if (chunkStart + chunkLength > duration) {
        chunkLength = duration - chunkStart;
      }
    }
    const chunkName = `chunk_${idx}.mp4`;
    // Pipe ffmpeg output to buffer
    const pass = new PassThrough();
    const bufferPromise = new Promise<Buffer>((resolve, reject) => {
      pass.pipe(concat(resolve));
      pass.on('error', reject);
    });
    await new Promise<void>((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(chunkStart)
        .setDuration(chunkLength)
        .outputOptions('-c', 'copy')
        .outputOptions('-movflags', 'frag_keyframe+empty_moov')
        .format('mp4')
        .on('error', reject)
        .on('end', () => resolve())
        .pipe(pass, { end: true });
    });
    const videoBuffer = await bufferPromise;
    // Create video doc and attach
    const video = {
      _id: undefined,
      type: 'video',
      userId,
      inputTextId,
      filePath: chunkName,
      createdAt: now,
    };
    const insertResult = await videosDb.insert(video);
    await videosDb.attachment.insert(
      insertResult.id,
      chunkName,
      videoBuffer,
      'video/mp4',
      { rev: insertResult.rev }
    );
    videoDocs.push({ ...video, _id: insertResult.id, _rev: insertResult.rev });
    start += chunkLength - 1;
    idx++;
  }
  return videoDocs;
} 