import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { pingHealth, notifyFailure } from './worker.mjs';

test('retries failures and stops after a successful response', async () => {
  const statuses = [503, 200];
  const waits = [];
  let calls = 0;
  await pingHealth('https://example.com/health', async (url, options) => {
    assert.equal(url, 'https://example.com/health');
    assert.ok(options.signal);
    calls++;
    return new Response(null, { status: statuses.shift() });
  }, async ms => waits.push(ms));
  assert.equal(calls, 2);
  assert.deepEqual(waits, [10_000]);
});

test('reports failure after four failed attempts', async () => {
  let calls = 0;
  const waits = [];
  await assert.rejects(pingHealth('https://example.com/health', async () => {
    calls++;
    throw new Error('network error');
  }, async ms => waits.push(ms)), /failed after 4 attempts/);
  assert.equal(calls, 4);
  assert.deepEqual(waits, [10_000, 15_000, 22_000]);
});

test('scheduled handler uses the configured target', async () => {
  const originalFetch = globalThis.fetch;
  let target;
  globalThis.fetch = async url => { target = url; return new Response(null, { status: 204 }); };
  try {
    await worker.scheduled({}, { TARGET_URL: 'https://example.com/health' });
    assert.equal(target, 'https://example.com/health');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('handles a timeout and HTTP errors before recovering', async () => {
  const outcomes = [new DOMException('timed out', 'TimeoutError'), 502, 404, 204];
  const waits = [];
  let calls = 0;
  await pingHealth('https://example.com/health', async (_url, options) => {
    assert.equal(options.cache, 'no-store');
    assert.equal(options.redirect, 'follow');
    calls++;
    const outcome = outcomes.shift();
    if (outcome instanceof Error) throw outcome;
    return new Response(null, { status: outcome });
  }, async ms => waits.push(ms));
  assert.equal(calls, 4);
  assert.deepEqual(waits, [10_000, 15_000, 22_000]);
});

test('body cancellation failure does not turn a successful response into a retry', async () => {
  let calls = 0;
  await pingHealth('https://example.com/health', async () => {
    calls++;
    return { ok: true, status: 200, body: { cancel: () => Promise.reject(new Error('cancel failed')) } };
  }, async () => assert.fail('must not retry'));
  assert.equal(calls, 1);
});


test('optional failure alert is bounded and never hides a ping failure', async () => {
  let calls = 0;
  await notifyFailure('', async () => assert.fail('no webhook configured'));
  await notifyFailure('https://example.com/hook', async (_url, options) => {
    calls++;
    assert.equal(options.method, 'POST');
    assert.ok(options.signal);
    assert.match(JSON.parse(options.body).text, /failed after 4 attempts/);
    throw new Error('webhook unavailable');
  });
  assert.equal(calls, 1);
});
