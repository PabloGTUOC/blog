import test from 'node:test';
import assert from 'node:assert/strict';

test('GET handler is a function', async () => {
  process.env.MONGODB_URI = 'mongodb://localhost/test';
  const { GET } = await import('@/app/api/posts/route');
  assert.strictEqual(typeof GET, 'function');
});

test('POST handler is a function', async () => {
  process.env.MONGODB_URI = 'mongodb://localhost/test';
  const { POST } = await import('@/app/api/posts/route');
  assert.strictEqual(typeof POST, 'function');
});
