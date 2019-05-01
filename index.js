const fs = require('fs');
const path = require('path');
const EventEmitter = require('events');
const { Server, STATUS_CODES } = require('http');

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaStatic = require('koa-static');

const PORT = process.env.PORT || 3000;
const server = new Server();
const app = new Koa();
const router = new Router();

const chat = new EventEmitter();

async function errorMiddleware(ctx, next) {
  try {
    await next();
  } catch(e) {
    if (e.status) {
      ctx.body = e.message;
      ctx.status = e.status;
    } else {
      ctx.body = STATUS_CODES[500];
      ctx.status = 500;
      console.error(e.message, e.stack);
    }
  }
}

router
  .post('/subscribe', async (ctx, next) => {
    await new Promise((resolve) => {
      function onMessage(message) {
        ctx.body = message;
        resolve();
      }

      chat.once('message', onMessage);

      ctx.res.on('close', () => {
        chat.off('message', onMessage);
        resolve();
      })
    });
  })
  .post('/publish', async (ctx, next) => {
    const message = ctx.request.body;

    if (!message) {
      ctx.throw(404);
    }

    chat.emit('message', message);

    ctx.status = 200;
    ctx.body = STATUS_CODES[200];
  });

app
  .use(koaStatic(path.join(__dirname, 'public')))
  .use(bodyParser({ jsonLimit: '56kb' }))
  .use(errorMiddleware)
  .use(router.routes())
  .use(router.allowedMethods());

server
  .on('request', app.callback())
  .on('error', console.error)
  .listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });