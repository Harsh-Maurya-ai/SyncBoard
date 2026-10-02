import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import mongoose from "mongoose";
import { initSocketServer } from "./socket/socketServer.js";
import authRoutes from "./routes/authRoutes.js";
import boardRoutes from "./routes/boardRoutes.js";

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/syncboard";

// Comma-separated list of allowed client origins (Vite's default dev port is 5173)
const ALLOWED_ORIGINS = (
  process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
).split(",");

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
// Whole-board saves can be large (many freehand strokes), the 100kb default is too small
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/boards", boardRoutes);

const httpServer = http.createServer(app);
const io = initSocketServer(httpServer, ALLOWED_ORIGINS);
app.set("io", io); // controllers use it to update live connections when permissions change

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("[db] connected to MongoDB"))
  .catch((err) => {
    console.error("[db] MongoDB connection failed:", err.message);
    process.exit(1);
  });

httpServer.listen(PORT, () => {
  console.log(`SyncBoard server running on http://localhost:${PORT}`);
});