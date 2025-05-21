import { Request, Response } from "express";
import { processUserText } from "./main";
import { usersDb, inputTextsDb, videosDb, User, ReelInputText, Video } from "./db";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import fs from "fs-extra";
import path from "path";

export async function registerUser(req: Request, res: Response) {
  try {
    const { email, name, password } = req.body;
    if (!email || !name || !password) {
      return res.status(400).json({ error: "email, name, and password are required" });
    }
    const existing = await usersDb.find({ selector: { email } });
    if (existing.docs.length > 0) {
      return res.status(409).json({ error: "User already exists" });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user: User = {
      _id: uuidv4(),
      type: "user",
      email,
      name,
      password: hashed,
    } as any;
    await usersDb.insert(user);
    res.status(201).json({ message: "User registered", userId: user._id });
  } catch (error) {
    console.error("[registerUser] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const found = await usersDb.find({ selector: { email } });
    const user = found.docs[0] as any;
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    // For demo: return userId as token (replace with JWT or session in production)
    res.json({ token: user._id, userId: user._id });
  } catch (error) {
    console.error("[loginUser] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function saveInputText(req: Request, res: Response) {
  try {
    const { userId, text } = req.body;
    if (!userId || !text) {
      return res.status(400).json({ error: "userId and text are required" });
    }
    const inputText: ReelInputText = {
      _id: uuidv4(),
      type: "input_text",
      userId,
      text,
      createdAt: new Date().toISOString(),
    };
    await inputTextsDb.insert(inputText);
    res.status(201).json({ message: "Input text saved", inputTextId: inputText._id });
  } catch (error) {
    console.error("[saveInputText] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function saveVideo(req: Request, res: Response) {
  try {
    const { userId, inputTextId, filePath } = req.body;
    if (!userId || !inputTextId || !filePath) {
      return res.status(400).json({ error: "userId, inputTextId, and filePath are required" });
    }
    // Read video file as buffer
    const videoBuffer = await fs.readFile(filePath);
    // Remove localstorage copy logic
    const video: Video = {
      _id: uuidv4(),
      type: "video",
      userId,
      inputTextId,
      filePath,
      createdAt: new Date().toISOString(),
    };
    await videosDb.insert(video);
    res.status(201).json({ message: "Video saved", videoId: video._id });
  } catch (error) {
    console.error("[saveVideo] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function generateVideoChunks(req: Request, res: Response) {
  try {
    console.log("[generateVideoChunks] Incoming request:", req.body);
    const { userText, inputTextId } = req.body;
    if (!userText || typeof userText !== "string" || !inputTextId) {
      console.error("[generateVideoChunks] Invalid input:", req.body);
      return res.status(400).json({ error: "userText and inputTextId are required." });
    }

    // Create output directory
    const outputDir = path.join(__dirname, 'output', 'videos', new Date().toISOString().replace(/[-:.TZ]/g, ''));
    await fs.ensureDir(outputDir);

    // Call processUserText with new signature
    const videoDocs = await processUserText(userText, inputTextId, outputDir);
    res.json({ videos: videoDocs });
  } catch (error) {
    console.error("[generateVideoChunks] Error:", error);
    res.status(500).json({ error: "Internal server error." });
  }
}

export async function getReelsByInputText(req: Request, res: Response) {
  try {
    const { inputTextId } = req.query;
    if (!inputTextId || typeof inputTextId !== 'string') {
      return res.status(400).json({ error: "inputTextId is required as a query parameter" });
    }

    // Get all video files from the output directory
    const outputDir = path.join(__dirname, 'output', 'videos');
    const allDirs = await fs.readdir(outputDir);
    
    const reels = [];
    for (const dir of allDirs) {
      const dirPath = path.join(outputDir, dir);
      const stats = await fs.stat(dirPath);
      if (stats.isDirectory()) {
        const files = await fs.readdir(dirPath);
        for (const file of files) {
          if (file.endsWith('.mp4')) {
            const filePath = path.join(dirPath, file);
            reels.push({
              filePath,
              inputTextId,
              createdAt: stats.birthtime.toISOString()
            });
          }
        }
      }
    }

    res.json({ reels });
  } catch (error) {
    console.error("[getReelsByInputText] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
} 