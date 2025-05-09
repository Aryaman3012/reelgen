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
    const { userText, userId, inputTextId } = req.body;
    if (!userText || typeof userText !== "string" || !userId || !inputTextId) {
      console.error("[generateVideoChunks] Invalid input:", req.body);
      return res.status(400).json({ error: "userText, userId, and inputTextId are required." });
    }
    // Call processUserText with new signature
    const videoDocs = await processUserText(userText, userId, inputTextId, videosDb);
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
    const result = await videosDb.find({ selector: { inputTextId } });
    const reels = await Promise.all(result.docs.map(async (video) => {
      try {
        // Try to fetch the attachment (if it exists)
        const attachmentName = video.filePath ? require('path').basename(video.filePath) : null;
        if (attachmentName) {
          const att = await videosDb.attachment.get(video._id, attachmentName);
          // Convert buffer to base64 string
          const videoData = Buffer.from(att).toString('base64');
          return { ...video, videoData, videoDataType: 'video/mp4', attachmentName };
        } else {
          return { ...video, videoData: null, videoDataType: null, attachmentName: null };
        }
      } catch (err) {
        // If attachment not found, just return metadata
        return { ...video, videoData: null, videoDataType: null, attachmentName: null };
      }
    }));
    res.json({ reels });
  } catch (error) {
    console.error("[getReelsByInputText] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
} 