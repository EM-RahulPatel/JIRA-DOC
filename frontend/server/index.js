import express from "express";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createProxyMiddleware } from "http-proxy-middleware";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3000;
const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:8000";
const DIST_DIR = resolve(__dirname, "../dist");

const app = express();

app.use(
  "/api",
  createProxyMiddleware({
    target: API_BASE_URL,
    changeOrigin: true,
    secure: false,
    pathRewrite: {
      "^/api": "",
    },
  })
);

app.use(express.static(DIST_DIR));

app.get("*", (_req, res) => {
  res.sendFile(resolve(DIST_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Frontend server running on http://localhost:${PORT}`);
});
