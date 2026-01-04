const express = require('express');
const { execFile } = require('child_process');
const path = require('path');

const app = express();

/* =========================
   Middleware
========================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* =========================
   Health check
========================= */
app.get('/', (req, res) => {
  res.send('NodeJSFB API OK');
});

/* =========================
   Download Facebook API
   POST /download
   Body: { "url": "https://facebook.com/..." }
========================= */
app.post('/download', (req, res) => {
  const url = req.body?.url;

  if (!url) {
    return res.status(400).json({
      error: 'Missing url'
    });
  }

  // đường dẫn tuyệt đối cho chắc
  const scriptPath = path.join(__dirname, 'fb_download.js');

  execFile(
    'node',
    [scriptPath, url],
    { timeout: 60_000 }, // 60s
    (error, stdout, stderr) => {
      if (error) {
        console.error('Download error:', error);
        return res.status(500).json({
          error: 'Download failed',
          detail: stderr || error.message
        });
      }

      res.json({
        success: true,
        output: stdout.trim()
      });
    }
  );
});

/* =========================
   404 fallback
========================= */
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

/* =========================
   Start server
========================= */
const PORT = 3001;
const HOST = '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`API listening on http://${HOST}:${PORT}`);