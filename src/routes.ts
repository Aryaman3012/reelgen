import { Router } from "express";
import { registerUser, loginUser, saveInputText, saveVideo, generateVideoChunks, getReelsByInputText } from "./controllers";
import { requireAuth } from "./auth";

const router = Router();

router.post("/register", registerUser as any);
router.post("/login", loginUser as any);
router.post("/input-text", saveInputText as any);
router.post("/video",saveVideo as any);
router.post("/generate", generateVideoChunks as any);
router.get("/reels", getReelsByInputText as any);

export default router; 