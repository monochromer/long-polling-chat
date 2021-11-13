const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { STATUS_CODES } = require('node:http');
const http2 = require('node:http2');
const { constants: HTTP_CONSTANTS } = require('node:http2');

const PORT = process.env.PORT || 8443;

const server = http2.createSecureServer({
  key: fs.readFileSync(process.env.KEY),
  cert: fs.readFileSync(process.env.CERT)
});;

const clients = new Set();

function onStream(stream, headers) {
  const route = `${headers[HTTP_CONSTANTS.HTTP2_HEADER_METHOD]} ${headers[HTTP_CONSTANTS.HTTP2_HEADER_PATH]}`;

  switch (route) {
    case 'GET /':
      const fileStream = fs.createReadStream(path.join(__dirname, 'index.html'));
      fileStream
        .on('open', () => {
          stream.respond({
            [HTTP_CONSTANTS.HTTP2_HEADER_CONTENT_TYPE]: 'text/html; charset=utf-8',
            [HTTP_CONSTANTS.HTTP2_HEADER_STATUS]: HTTP_CONSTANTS.HTTP_STATUS_OK
          })
        })
        .on('error', error => {
          stream.respond({
            [HTTP_CONSTANTS.HTTP2_HEADER_STATUS]: HTTP_CONSTANTS.HTTP_STATUS_INTERNAL_SERVER_ERROR
          })
          stream.end(STATUS_CODES[HTTP_CONSTANTS.HTTP_STATUS_INTERNAL_SERVER_ERROR])
        })
        .pipe(stream);

      stream.on('aborted', () => {
        fileStream.destroy();
      })
      stream.on('close', () => {
        fileStream.destroy();
      })
      break;

    case 'GET /subscribe':
      clients.add(stream);
      stream.respond({
        [HTTP_CONSTANTS.HTTP2_HEADER_CONTENT_TYPE]: 'text/event-stream',
        [HTTP_CONSTANTS.HTTP2_HEADER_CACHE_CONTROL]: 'no-cache',
      })
      stream.on('aborted', () => {
        clients.delete(stream);
      })
      stream.on('close', () => {
        clients.delete(stream);
      })
      break;

    case 'POST /publish':
      let body = '';
      stream.setEncoding('utf8');
      stream
        .on('error', (err) => {
          stream.respond({
            [HTTP_CONSTANTS.HTTP2_HEADER_STATUS]: HTTP_CONSTANTS.HTTP_STATUS_INTERNAL_SERVER_ERROR
          })
          stream.end(STATUS_CODES[HTTP_CONSTANTS.HTTP_STATUS_INTERNAL_SERVER_ERROR])
        })
        .on('data', chunk => {
          body += chunk;
          if (body.length > 1000) {
            stream.respond({
              [HTTP_CONSTANTS.HTTP2_HEADER_STATUS]: HTTP_CONSTANTS.HTTP_STATUS_PAYLOAD_TOO_LARGE
            })
            stream.end(STATUS_CODES[HTTP_CONSTANTS.HTTP_STATUS_PAYLOAD_TOO_LARGE])
          }
        })
        .on('end', () => {
          clients.forEach(client => {
            const data = [
              `data: ${body}`,
              `id: ${randomUUID()}`,
              '\n'
            ].join('\n');
            client.write(data);
          });
          stream.respond({
            [HTTP_CONSTANTS.HTTP2_HEADER_STATUS]: HTTP_CONSTANTS.HTTP_STATUS_OK
          })
          stream.end(STATUS_CODES[HTTP_CONSTANTS.HTTP_STATUS_OK])
          return;
        })
      break;

    default:
      stream.respond({
        [HTTP_CONSTANTS.HTTP2_HEADER_STATUS]: HTTP_CONSTANTS.HTTP_STATUS_NOT_FOUND
      })
      stream.end(STATUS_CODES[HTTP_CONSTANTS.HTTP_STATUS_NOT_FOUND]);
      break;
  }
};

server
  .on('stream', onStream)
  .on('error', console.error)
  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });