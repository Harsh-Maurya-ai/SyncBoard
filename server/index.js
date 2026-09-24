import express from "express";
import http from "http";
import cors from "cors";
import { initSocketServer } from "./socket/socketServer.js";

const PORT = process.env.PORT || 5000;

// Comma-separated list of allowed client origins (Vite's default dev port is 5173)
const ALLOWED_ORIGINS = (
  process.env.CLIENT_ORIGIN || "http://localhost:5173,http://127.0.0.1:5173"
).split(",");

const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

const httpServer = http.createServer(app);
initSocketServer(httpServer, ALLOWED_ORIGINS);

httpServer.listen(PORT, () => {
  console.log(`SyncBoard server running on http://localhost:${PORT}`);
});