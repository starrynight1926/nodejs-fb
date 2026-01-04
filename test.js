const http = require('http');

const server = http.createServer((req, res) => {
  res.end('OK\n');
});

server.on('error', (err) => {
  console.error('SERVER ERROR:', err);
});

server.listen(3001, '127.0.0.1', () => {
  console.log('Listening on 127.0.0.1:3001');
});

// giữ process sống
setInterval(() => {}, 1000);