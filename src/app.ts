import express from "express";
import cors from "cors";
import routes from "./routes";

const app = express();

app.use(cors());

console.log("[app] Initializing express app...");
app.use(express.json({ limit: "10mb" }));
console.log("[app] JSON middleware enabled.");
app.use("/api", routes);
console.log("[app] Routes mounted at /api");

export default app; 