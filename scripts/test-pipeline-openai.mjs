import assert from 'node:assert/strict';
import OpenAI from 'openai';
import { createPacedResponseRequester } from './pipeline-openai.mjs';

function harness(create, options = {}) {
  let clock = Date.parse('2026-09-28T12:00:00Z');
  const waits = [];
  const warnings = [];
  const request = createPacedResponseRequester(create, {
    now: () => clock,
    wait: async (delay) => { waits.push(delay); clock += delay; },
    random: () => 0, warn: (message) => warnings.push(message), ...options
  });
  return { request, waits, warnings, now: () => clock };
}

const responseWithHeaders = (data, headers) => ({
  withResponse: async () => ({ data, response: { headers: new Headers(headers) } })
});
const rateLimit = (headers = {}, extra = {}) => Object.assign(new Error('Temporary limit'), {
  status: 429, code: 'rate_limit_exceeded', headers: new Headers(headers), ...extra
});

export async function testPipelineOpenAI() {
  // Exercise the installed SDK's actual APIPromise/withResponse path using an in-memory fetch.
  let sdkFetches = 0;
  const sdk = new OpenAI({ apiKey: 'test-only-not-a-real-key', maxRetries: 0, fetch: async () => {
    sdkFetches += 1;
    return new Response(JSON.stringify({ id: 'resp_test', object: 'response', output: [], usage: { total_tokens: 200 } }), {
      headers: { 'content-type': 'application/json', 'x-ratelimit-remaining-tokens': '0', 'x-ratelimit-reset-tokens': '20s' }
    });
  } });
  const sdkPaced = harness(sdk.responses.create.bind(sdk.responses));
  assert.equal((await sdkPaced.request({ model: 'test-model', input: 'test' })).id, 'resp_test');
  await sdkPaced.request({ model: 'test-model', input: 'test' });
  assert.equal(sdkFetches, 2);
  assert.deepEqual(sdkPaced.waits, [21000]);

  // Even concurrent callers share a serial queue, with no real sleeps or API calls in these tests.
  let active = 0;
  let maxActive = 0;
  const order = [];
  const serial = harness(async (value) => {
    active += 1;
    maxActive = Math.max(maxActive, active);
    order.push(value);
    await Promise.resolve();
    active -= 1;
    return value;
  });
  assert.deepEqual(await Promise.all([serial.request('a'), serial.request('b'), serial.request('c')]), ['a', 'b', 'c']);
  assert.deepEqual(order, ['a', 'b', 'c']);
  assert.equal(maxActive, 1);
  assert.deepEqual(serial.waits, [15000, 15000]);

  // Read successful SDK response headers while returning only the original response data.
  const payload = { output_text: 'preserved', usage: { total_tokens: 200 } };
  for (const scope of ['tokens', 'project-tokens', 'requests']) {
    const headerNames = {
      [`x-ratelimit-limit-${scope}`]: '1000',
      [`x-ratelimit-remaining-${scope}`]: scope === 'requests' ? '1' : '100',
      [`x-ratelimit-reset-${scope}`]: '1m2.5s'
    };
    const adaptive = harness(() => responseWithHeaders(payload, headerNames));
    assert.equal(await adaptive.request(), payload);
    await adaptive.request();
    assert.deepEqual(adaptive.waits, [63500]);
  }
  const enough = harness(() => responseWithHeaders(payload, {
    'x-ratelimit-limit-tokens': '1000', 'x-ratelimit-remaining-tokens': '900', 'x-ratelimit-reset-tokens': '6m'
  }));
  await enough.request();
  await enough.request();
  assert.deepEqual(enough.waits, [15000]);
  const invalid = harness(() => responseWithHeaders(payload, {
    'x-ratelimit-remaining-tokens': '0', 'x-ratelimit-reset-tokens': 'invalid'
  }));
  await invalid.request();
  await invalid.request();
  assert.deepEqual(invalid.waits, [15000]);

  let attempts = 0;
  const retry = harness(async () => {
    if (++attempts === 1) throw rateLimit({ 'retry-after': '20' });
    return payload;
  });
  assert.equal(await retry.request(), payload);
  assert.equal(attempts, 2);
  assert.deepEqual(retry.waits, [21000]);
  assert.match(retry.warnings[0], /rate limited.*attempt 2\/6/);

  for (const [headers, extra, expected] of [
    [{ 'retry-after': 'Mon, 28 Sep 2026 12:00:30 GMT' }, {}, 31000],
    [{ 'x-ratelimit-remaining-tokens': '0', 'x-ratelimit-reset-tokens': '1m' }, {}, 61000],
    [{ 'retry-after': '5', 'x-ratelimit-remaining-tokens': '0', 'x-ratelimit-reset-tokens': '1m' }, {}, 61000],
    [{}, { message: 'Please try again in 22.5s.' }, 23500],
    [{ 'retry-after': 'nonsense' }, {}, 15000],
    [{ 'retry-after': '0' }, {}, 15000],
    [{ 'retry-after': '18' }, { status: 503, code: 'server_is_overloaded' }, 19000]
  ]) {
    let count = 0;
    const hinted = harness(async () => {
      if (++count === 1) throw rateLimit(headers, extra);
      return payload;
    });
    await hinted.request();
    assert.deepEqual(hinted.waits, [expected]);
  }

  // Billing failures never retry, and one failed request cannot poison the queue.
  const quota = rateLimit({}, { code: 'credit_balance_exhausted', type: 'insufficient_quota' });
  let quotaCalls = 0;
  const failed = harness(async () => { if (++quotaCalls === 1) throw quota; return payload; });
  await assert.rejects(failed.request(), (error) => error === quota);
  assert.deepEqual(failed.waits, []);
  assert.equal(await failed.request(), payload);
  assert.equal(quotaCalls, 2);

  const longWait = rateLimit({ 'retry-after': '3600' });
  const deferred = harness(async () => { throw longWait; });
  await assert.rejects(deferred.request(), (error) => error === longWait);
  assert.deepEqual(deferred.waits, []);

  let cappedCalls = 0;
  const limited = harness(async () => { if (++cappedCalls <= 6) throw rateLimit(); return payload; });
  await assert.rejects(limited.request(), /Temporary limit/);
  assert.equal(cappedCalls, 6);
  assert.deepEqual(limited.waits, [15000, 15000, 20000, 40000, 60000]);
  assert.equal(await limited.request(), payload);
  assert.equal(limited.waits.at(-1), 60000, 'Queued requests respect the cooldown after retry exhaustion');

  const budget = harness(async () => { throw rateLimit({ 'retry-after': '20' }); }, { maxRetryWaitMs: 40000 });
  await assert.rejects(budget.request(), /Temporary limit/);
  assert.deepEqual(budget.waits, [21000]);
  console.log('OpenAI request queue, adaptive pacing, retries and billing safeguards passed.');
}
