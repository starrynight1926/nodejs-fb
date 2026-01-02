const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('NodeJSFB API OK');
});

app.listen(3001, () => {
  console.log('Listening on 0.0.0.0:3001');
});
