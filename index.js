const fs = require('fs');
const path = require('path');
const { Server, STATUS_CODES } = require('http');

const PORT = process.env.PORT || 3000;
const server = new Server();

const clients = new Set();

function onRequest(req, res) {
  const route = `${req.method} ${req.url}`;

  switch (route) {
    case 'GET /':
      const fileStream = fs.createReadStream(path.join(__dirname, 'index.html'));
      fileStream
        .on('open', () => {
          res.setHeader('Content-Type', 'text/html');
        })
        .on('error', error => {
          res.statusCode = 500;
          res.end(STATUS_CODES[500])
        })
        .pipe(res);
      req.on('close', () => {
        fileStream.destroy();
      });
      break;

    case 'POST /subscribe':
      // res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      clients.add(res);
      res.on('close', () => {
        clients.delete(res);
      });
      break;

    case 'POST /publish':
      let body = '';
      req.setEncoding('utf8');
      req
        .on('error', (err) => {
          res.statusCode = 500;
          res.end(STATUS_CODES[500]);
        })
        .on('data', chunk => {
          body += chunk;
          if (body.length > 1000) {
            res.statusCode = 413;
            res.end(STATUS_CODES[413]);
          }
        })
        .on('end', () => {
          try {
            // body = JSON.parse(body);
          } catch (error) {
            res.statusCode = 400;
            res.end(STATUS_CODES[400]);
            return;
          }
          clients.forEach(clientResponse => {
            clientResponse.setHeader('Content-Type', 'application/json; charset=utf-8')
            // clientResponse.end(body.message.toString());
            clientResponse.end(body);
          });
          clients.clear();
          res.statusCode = 200;
          res.setHeader('Content-Type', 'plain/text');
          res.end(STATUS_CODES[200]);
        })
      break;

    default:
      res.statusCode = 404;
      res.end(STATUS_CODES[404]);
      break;
  }
};

server
  .on('request', onRequest)
  .on('error', console.error)
  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });