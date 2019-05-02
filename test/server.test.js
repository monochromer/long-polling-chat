const { STATUS_CODES } = require('http');
const assert = require('assert');
const request = require('superagent');

const server = require('../server');
const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;

function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time));
}

describe('server', () => {
  before(done => {
    server.listen(PORT, done);
  });

  after(done => {
    server.close(done);
  });

  describe('POST /publish', () => {
    it('sends a message to all subscribers', async () => {
      const message = {
        message: 'Hello',
        username: 'John Doe',
        avatar: 'http://example.com/avatar.jpg'
      };

      const subscribers = Promise.all([
        request
          .post(`${BASE_URL}/subscribe`)
          .timeout(500)
          .then(res => res.body),
          request
          .post(`${BASE_URL}/subscribe`)
          .timeout(500)
          .then(res => res.body),
      ]);

      await wait(50);

      const publisherResponse = await request.post(`${BASE_URL}/publish`)
        .send(message)

      const messages = await subscribers;
      console.log(messages);

      messages.forEach(msg => {
        assert.deepEqual(msg, message);
      });

      assert.deepEqual(publisherResponse.status, 200);
      assert.deepEqual(publisherResponse.text, STATUS_CODES[200]);
    });

    it('when body is too big', () => {
      it('returns 413', async () => {
        const message = {
          username: 'John Doe',
          avatar: 'http://example.com/avatar.jpg',
          message: '*'.repeat(1e6)
        };

        const res = await request
          .post(`${BASE_URL}/publish`)
          .timeout(5000)
          .send(message)
          .catch(error => error)
          .then(res => res);

        assert.deepEqual(res.status, 413);
      });
    });

    it('message is ignored', async () => {
      const subscriber = request
        .post(`${BASE_URL}/subscribe`)
        .timeout(100)

      await wait(50);

      const message = {
        username: 'John Doe',
        avatar: 'http://example.com/avatar.jpg',
        message: '*'.repeat(1e6)
      };

      const res = await request.post(`${BASE_URL}/publish`)
        .send(message)
        .catch(error => error)
        .then(res => res);

      try {
        await subscriber;
        assert.fail('Should not reach here, but die with ESOCKETTIMEDOUT');
      } catch(err) {
        // assert.deepEqual(err.name, 'RequestError');
        // assert.deepEqual(err.cause.code, 'ESOCKETTIMEDOUT');
        assert.deepEqual(err.code, 'ABORTED');
      }
    });
  });
})