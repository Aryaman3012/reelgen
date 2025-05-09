"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatenateVideos = concatenateVideos;
exports.overlayAudioOnVideo = overlayAudioOnVideo;
exports.chunkVideo = chunkVideo;
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const util_1 = __importDefault(require("util"));
const execFilePromise = util_1.default.promisify(child_process_1.execFile);
function concatenateVideos(videoDir, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = (yield fs_extra_1.default.readdir(videoDir))
            .filter(f => f.match(/\.(mp4|mov|avi|mkv)$/i))
            .map(f => path_1.default.join(videoDir, f));
        if (files.length === 0)
            throw new Error("No video files found in input directory.");
        // Create filelist.txt for ffmpeg concat demuxer
        const fileListPath = path_1.default.resolve(videoDir, "filelist.txt");
        const fileListContent = files.map(f => `file '${path_1.default.resolve(f).replace(/\\/g, "/")}'`).join("\n");
        yield fs_extra_1.default.writeFile(fileListPath, fileListContent, { encoding: "utf8" });
        // Debug: print filelist.txt content
        console.log("filelist.txt content:\n", fileListContent);
        console.log("filelist.txt exists:", yield fs_extra_1.default.pathExists(fileListPath));
        return new Promise((resolve, reject) => {
            (0, child_process_1.execFile)(ffmpeg_static_1.default || "ffmpeg", [
                "-y",
                "-f", "concat",
                "-safe", "0",
                "-i", fileListPath,
                "-c", "copy",
                outputPath
            ], (error, stdout, stderr) => {
                console.log("ffmpeg stdout:\n", stdout);
                console.log("ffmpeg stderr:\n", stderr);
                if (error) {
                    console.error("ffmpeg error:", stderr || error.message);
                    reject(new Error(stderr || error.message));
                }
                else {
                    // Check output file exists and is non-empty
                    fs_extra_1.default.stat(outputPath)
                        .then(stats => {
                        if (stats.size > 0) {
                            resolve();
                        }
                        else {
                            reject(new Error("Output file is empty after ffmpeg run."));
                        }
                    })
                        .catch(() => reject(new Error("Output file not found after ffmpeg run.")));
                }
                // Clean up filelist.txt
                fs_extra_1.default.remove(fileListPath).catch(() => { });
            });
        });
    });
}
function overlayAudioOnVideo(videoPath, audioPath, outputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            (0, fluent_ffmpeg_1.default)(videoPath)
                .addInput(audioPath)
                .outputOptions('-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-shortest')
                .save(outputPath)
                .on('end', (_stdout, _stderr) => resolve())
                .on('error', reject);
        });
    });
}
function chunkVideo(inputPath_1, outputDir_1) {
    return __awaiter(this, arguments, void 0, function* (inputPath, outputDir, minChunk = 60, maxChunk = 90, minLastChunk = 30) {
        yield fs_extra_1.default.ensureDir(outputDir);
        // 1. Get video duration using fluent-ffmpeg's ffprobe
        const duration = yield new Promise((resolve, reject) => {
            fluent_ffmpeg_1.default.ffprobe(inputPath, (err, metadata) => {
                if (err)
                    return reject(err);
                if (!metadata.format || typeof metadata.format.duration !== 'number') {
                    return reject(new Error('Could not determine video duration'));
                }
                resolve(metadata.format.duration);
            });
        });
        // 2. Calculate chunk start/end times
        let start = 0, idx = 1;
        while (start < duration) {
            let remaining = duration - start;
            let chunkLength = Math.min(maxChunk, remaining);
            if (remaining < minLastChunk && idx > 1) {
                // If the last chunk would be too short, merge it with the previous
                break;
            }
            if (chunkLength < minChunk && idx > 1)
                chunkLength = remaining; // last chunk
            if (chunkLength < minLastChunk)
                break; // don't create too short chunk
            // 3. Use ffmpeg to extract the chunk
            const outputFile = path_1.default.join(outputDir, `chunk_${idx}.mp4`);
            yield new Promise((resolve, reject) => {
                (0, fluent_ffmpeg_1.default)(inputPath)
                    .setStartTime(start)
                    .setDuration(chunkLength)
                    .outputOptions('-c', 'copy')
                    .output(outputFile)
                    .on('end', () => resolve())
                    .on('error', (err) => reject(err))
                    .run();
            });
            start += chunkLength;
            idx++;
        }
    });
}
