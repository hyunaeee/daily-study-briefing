// 초간단 정적 서버 — 의존성 없음. 실행: node server.js  (기본 포트 4173)
// 사이트 본체는 ../docs (GitHub Pages와 같은 소스를 로컬에서 서빙)
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "docs");
const PORT = process.env.PORT || 4173;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let filePath = path.normalize(path.join(ROOT, urlPath === "/" ? "index.html" : urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end("Forbidden"); }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found: " + urlPath); }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(data);
  });
}).listen(PORT, () => console.log(`매일 학습 브리핑 → http://localhost:${PORT}`));
