const express = require("express");
const fbDownload = require("./fb_download");

const app = express();

/**
 * ⚠️ RẤT QUAN TRỌNG
 * n8n có lúc gửi body rỗng → vẫn cần middleware này
 */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "FB Download API is running"
  });
});

/**
 * MAIN API
 * Hỗ trợ:
 * - POST /download (body JSON)
 * - POST /download?url=...
 * - GET  /download?url=...
 */
app.all("/download", async (req, res) => {
  try {
    // ƯU TIÊN QUERY → BODY
    const url =
      req.query.url ||
      (req.body && req.body.url);

    if (!url) {
      return res.status(400).json({
        success: false,
        error: "Missing Facebook URL"
      });
    }

    const result = await fbDownload(url);

    res.json({
      success: true,
      output: result
    });
  } catch (err) {
    console.error("❌ API ERROR:", err.message);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

/**
 * Start server
 */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FB Download API listening on port ${PORT}`);
});
