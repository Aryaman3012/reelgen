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
exports.processUserText = processUserText;
const path_1 = __importDefault(require("path"));
const tts_1 = require("./service/tts");
const video_1 = require("./service/video");
const fs_extra_1 = __importDefault(require("fs-extra"));
function processUserText(userText, inputTextId, outputDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseDir = path_1.default.resolve(__dirname); // src directory
        const inputVideosDir = path_1.default.join(baseDir, "input_videos");
        const ttsAudio = path_1.default.join(outputDir, "tts_audio.wav");
        const concatenatedVideo = path_1.default.join(outputDir, "concatenated.mp4");
        const finalVideo = path_1.default.join(outputDir, "final_with_audio.mp4");
        const chunksDir = path_1.default.join(outputDir, "chunks");
        console.log("[processUserText] Ensuring output and input directories exist...");
        yield fs_extra_1.default.ensureDir(outputDir);
        yield fs_extra_1.default.ensureDir(inputVideosDir);
        yield fs_extra_1.default.ensureDir(chunksDir);
        console.log("[processUserText] Generating TTS audio...");
        yield (0, tts_1.generateTTS)(userText, ttsAudio);
        console.log("[processUserText] TTS audio generated at:", ttsAudio);
        console.log("[processUserText] Concatenating input videos...");
        yield (0, video_1.concatenateVideos)(inputVideosDir, concatenatedVideo);
        console.log("[processUserText] Concatenated video at:", concatenatedVideo);
        console.log("[processUserText] Overlaying TTS audio on video...");
        yield (0, video_1.overlayAudioOnVideo)(concatenatedVideo, ttsAudio, finalVideo);
        console.log("[processUserText] Final video with audio at:", finalVideo);
        // Chunk the final video into 60-90 second segments
        console.log("[processUserText] Chunking video into 60-90 second segments...");
        yield (0, video_1.chunkVideo)(finalVideo, chunksDir, 60, 90, 30);
        // Get all generated chunks and return their info
        const chunkFiles = yield fs_extra_1.default.readdir(chunksDir);
        const videoChunks = chunkFiles
            .filter(file => file.endsWith('.mp4'))
            .sort((a, b) => {
            var _a, _b;
            // Sort by chunk number
            const numA = parseInt(((_a = a.match(/chunk_(\d+)\.mp4/)) === null || _a === void 0 ? void 0 : _a[1]) || '0');
            const numB = parseInt(((_b = b.match(/chunk_(\d+)\.mp4/)) === null || _b === void 0 ? void 0 : _b[1]) || '0');
            return numA - numB;
        })
            .map(file => ({
            filePath: path_1.default.join(chunksDir, file),
            inputTextId,
            timestamp: new Date()
        }));
        // Store the chunk paths in a manifest file
        const manifestPath = path_1.default.join(outputDir, 'chunks_manifest.json');
        yield fs_extra_1.default.writeJson(manifestPath, {
            chunks: videoChunks,
            createdAt: new Date().toISOString(),
            inputTextId
        }, { spaces: 2 });
        console.log(`[processUserText] Generated ${videoChunks.length} video chunks`);
        console.log(`[processUserText] Chunks manifest stored at: ${manifestPath}`);
        return videoChunks;
    });
}
