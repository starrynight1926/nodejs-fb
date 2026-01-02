const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('NodeJSFB API OK');
});

app.listen(201, '127.0.0.1', () => {
  console.log('Listening on 127.0.0.1:201');
});
