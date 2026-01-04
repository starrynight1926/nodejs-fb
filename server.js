const express = require('express');
const fbDownload = require('./fb_download');

const app = express();
app.use(express.json());

app.post('/download', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Missing url'
      });
    }

    const result = await fbDownload(url);

    console.log('RESULT TYPE:', typeof result);
    console.log('RESULT VALUE:', result);

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

app.listen(3000, () => {
  console.log('🚀 Server running on port 3000');
});
