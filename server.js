const fs = require('fs');
const path = require('path');
const { Server, STATUS_CODES } = require('http');

const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');
const koaStatic = require('koa-static');

const PORT = process.env.PORT || 3000;
const server = new Server();
const app = new Koa();
const router = new Router();

const clients = new Set();

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
    const message = await new Promise((resolve) => {
      clients.add(resolve);
      ctx.res.on('close', () => {
        clients.delete(resolve);
        resolve();
      });
    });
    ctx.body = message;
  })
  .post('/publish', async (ctx, next) => {
    const message = ctx.request.body;

    if (!message) {
      ctx.throw(404);
    }

    clients.forEach(resolve => resolve(message));
    clients.clear();
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

module.exports = server;