import { generateTTS } from "./tts";
import { concatenateVideos, overlayAudioOnVideo } from "./video";
import fs from "fs-extra";

async function main() {
  const userText = `As a kid I would get magazines from my parents about all sorts of stuff, but instead of being interested in lego or whatever, I was fascinated by this sort of plastic skeleton for anatomy studies you could order parts off to be delivered to you every month. I would read the magazine, explore the human body and build the skeleton up bit by bit from head to torso. When I managed to have one limb, torso and head attached, I'd treat the skeleton like a friend, bringing him around with me and even hugging his skeletal arm around me that helped me sleep. We're talking like snoozing forehead-to-forehead touching with a damn skull with detachable eyes.

As a kid I never understood why my parents would cut the subscription, they said they didn't have any money for it, but as an adult I see they must have been creeped out.

I still miss my skelly boy, and it led me to study anatomy more. The experience didn't turn me into a psychopath, pinky promise.


  `; // Replace with user input or CLI
  const ttsAudio = "output/tts_audio.wav";
  const concatenatedVideo = "output/concatenated.mp4";
  const finalVideo = "output/final_with_audio.mp4";

  await fs.ensureDir("output");
  await fs.ensureDir("input_videos");

  console.log("Generating TTS audio...");
  await generateTTS(userText, ttsAudio);

  console.log("Concatenating videos...");
  await concatenateVideos("input_videos", concatenatedVideo);

  console.log("Overlaying audio on video...");
  await overlayAudioOnVideo(concatenatedVideo, ttsAudio, finalVideo);

  console.log("Process complete. Final video at:", finalVideo);
  // TODO: Implement chunking logic
}

main().catch(console.error); 