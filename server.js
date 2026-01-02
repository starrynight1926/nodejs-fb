const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('NodeJSFB API OK');
});

app.post('/download', (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'Missing url' });
  }

  // escape đơn giản
  const safeUrl = url.replace(/"/g, '\\"');

  const cmd = `node fb_download.js "${safeUrl}"`;

  exec(cmd, { cwd: __dirname, timeout: 5 * 60 * 1000 }, (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        error: stderr || err.message
      });
    }

    res.json({
      success: true,
      output: stdout
    });
  });
});

app.listen(3001, () => {
  console.log('API listening on port 3001');
});
