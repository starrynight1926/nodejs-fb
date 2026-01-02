const express = require('express');
const { exec } = require('child_process');

const app = express();
app.use(express.json());

app.post('/download', (req, res) => {
  const url = req.body.url;
  if (!url) return res.status(400).json({ error: 'Missing url' });

  exec(`node fb_download.js "${url}"`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ error: stderr });
    }
    res.json({ result: stdout });
  });
});

app.listen(201, () => {
  console.log('API listening on port 201');
});
