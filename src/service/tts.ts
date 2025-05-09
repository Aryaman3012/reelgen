import axios from "axios";
import fs from "fs-extra";
import dotenv from "dotenv";
dotenv.config();

export async function generateTTS(text: string, outputPath: string) {
  const apiKey = process.env.AZURE_API_KEY;
  const url = "https://dunlin-deployment.openai.azure.com/openai/deployments/tts-hd/audio/speech?api-version=2025-03-01-preview";
  const data = {
    model: "tts-hd",
    input: text,
    voice: "alloy"
  };

  console.log("[generateTTS] Sending request to Azure TTS API...");
  try {
    const response = await axios.post(url, data, {
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      responseType: "arraybuffer"
    });
    console.log("[generateTTS] TTS API response received. Writing to:", outputPath);
    await fs.writeFile(outputPath, response.data);
    console.log("[generateTTS] Audio file written.");
  } catch (error) {
    console.error("[generateTTS] Error during TTS generation:", error);
    throw error;
  }
} 