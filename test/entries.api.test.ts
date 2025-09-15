import test from 'node:test';
import assert from 'node:assert/strict';

test('entries GET handler exists', async () => {
  process.env.MONGODB_URI = 'mongodb://localhost/test';
  const { GET } = await import('@/app/api/entries/route');
  assert.strictEqual(typeof GET, 'function');
});

test('entries POST handler exists', async () => {
  process.env.MONGODB_URI = 'mongodb://localhost/test';
  const { POST } = await import('@/app/api/entries/route');
  assert.strictEqual(typeof POST, 'function');
});

