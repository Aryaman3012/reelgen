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
const tts_1 = require("./tts");
const video_1 = require("./video");
const fs_extra_1 = __importDefault(require("fs-extra"));
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        const userText = `As a kid I would get magazines from my parents about all sorts of stuff, but instead of being interested in lego or whatever, I was fascinated by this sort of plastic skeleton for anatomy studies you could order parts off to be delivered to you every month. I would read the magazine, explore the human body and build the skeleton up bit by bit from head to torso. When I managed to have one limb, torso and head attached, I'd treat the skeleton like a friend, bringing him around with me and even hugging his skeletal arm around me that helped me sleep. We're talking like snoozing forehead-to-forehead touching with a damn skull with detachable eyes.

As a kid I never understood why my parents would cut the subscription, they said they didn't have any money for it, but as an adult I see they must have been creeped out.

I still miss my skelly boy, and it led me to study anatomy more. The experience didn't turn me into a psychopath, pinky promise.


  `; // Replace with user input or CLI
        const ttsAudio = "output/tts_audio.wav";
        const concatenatedVideo = "output/concatenated.mp4";
        const finalVideo = "output/final_with_audio.mp4";
        yield fs_extra_1.default.ensureDir("output");
        yield fs_extra_1.default.ensureDir("input_videos");
        console.log("Generating TTS audio...");
        yield (0, tts_1.generateTTS)(userText, ttsAudio);
        console.log("Concatenating videos...");
        yield (0, video_1.concatenateVideos)("input_videos", concatenatedVideo);
        console.log("Overlaying audio on video...");
        yield (0, video_1.overlayAudioOnVideo)(concatenatedVideo, ttsAudio, finalVideo);
        console.log("Process complete. Final video at:", finalVideo);
        // TODO: Implement chunking logic
    });
}
main().catch(console.error);
