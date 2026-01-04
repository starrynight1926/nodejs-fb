const express = require('express');
const fbDownload = require('./fb_download');

const app = express();
app.use(express.json());

/**
 * POST /fb
 * body: { "url": "https://www.facebook.com/..." }
 */
app.post('/fb', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing url'
      });
    }

    const result = await fbDownload(url);

    // TRẢ FULL JSON Ở ĐÂY
    res.json({
      success: true,
      output: result
    });
  } catch (err) {
    console.error('FB DOWNLOAD ERROR:', err);

    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 FB API running on port ${PORT}`);
});
