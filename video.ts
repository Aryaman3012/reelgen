import ffmpeg from "fluent-ffmpeg";
import fs from "fs-extra";
import path from "path";
import { execFile } from "child_process";
import ffmpegPath from "ffmpeg-static";

export async function concatenateVideos(videoDir: string, outputPath: string) {
  const files = (await fs.readdir(videoDir))
    .filter(f => f.match(/\.(mp4|mov|avi|mkv)$/i))
    .map(f => path.join(videoDir, f));

  if (files.length === 0) throw new Error("No video files found in input directory.");

  // Create filelist.txt for ffmpeg concat demuxer
  const fileListPath = path.resolve(videoDir, "filelist.txt");
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
  return new Promise<void>((resolve, reject) => {
    ffmpeg(videoPath)
      .addInput(audioPath)
      .outputOptions('-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-shortest')
      .save(outputPath)
      .on('end', (_stdout: string | null, _stderr: string | null) => resolve())
      .on('error', reject);
  });
} 