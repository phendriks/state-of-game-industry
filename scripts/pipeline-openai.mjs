import OpenAI from 'openai';

const MAX_API_ATTEMPTS = 6;
const MIN_REQUEST_INTERVAL_MS = 15000;
const MAX_RETRY_WAIT_MS = 10 * 60 * 1000;
const RETRYABLE_429_CODES = new Set(['rate_limit_exceeded', 'slow_down']);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function header(headers, name) {
  return headers?.get?.(name) ?? headers?.[name];
}

function resetDuration(value) {
  if (typeof value !== 'string' || !/^(?:\d+(?:\.\d+)?(?:ms|s|m|h))+$/.test(value)) return 0;
  return [...value.matchAll(/(\d+(?:\.\d+)?)(ms|s|m|h)/g)].reduce((total, [, number, unit]) =>
    total + Number(number) * ({ ms: 1, s: 1000, m: 60000, h: 3600000 }[unit]), 0);
}

function capacityDelay(headers, tokensUsed = 0) {
  let delay = 0;
  for (const scope of ['requests', 'tokens', 'project-tokens']) {
    const remainingValue = header(headers, `x-ratelimit-remaining-${scope}`);
    if (remainingValue === undefined || remainingValue === null || remainingValue === '') continue;
    const remaining = Number(remainingValue);
    const limit = Number(header(headers, `x-ratelimit-limit-${scope}`)) || 0;
    // Preserve headroom; observed token use is a pacing hint, not a prediction of the next request.
    const reserve = scope === 'requests' ? 1 : Math.max(tokensUsed, limit * 0.2);
    if (Number.isFinite(remaining) && remaining <= reserve) {
      const reset = resetDuration(header(headers, `x-ratelimit-reset-${scope}`));
      if (reset > 0) delay = Math.max(delay, reset + 1000);
    }
  }
  return delay;
}

function retryDelay(error, attempt, now, random) {
  const retryAfter = header(error?.headers, 'retry-after');
  const seconds = Number(retryAfter);
  if (retryAfter !== null && retryAfter !== undefined && String(retryAfter).trim() && Number.isFinite(seconds) && seconds >= 0) return (seconds * 1000) + 1000;
  if (retryAfter) {
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - now()) + 1000;
  }
  const messageDelay = String(error?.message ?? '').match(/try again in\s+([\d.]+)s/i);
  if (messageDelay) return (Number(messageDelay[1]) * 1000) + 1000;
  return Math.max(capacityDelay(error?.headers), Math.min(5000 * (2 ** (attempt - 1)), 60000) + Math.floor(random() * 1000));
}

function isTemporaryAPIError(error) {
  if (error?.status === 503) return true;
  if (error?.type === 'insufficient_quota' || ['credit_balance_exhausted', 'insufficient_quota'].includes(error?.code)) return false;
  return error?.status === 429 && (
    RETRYABLE_429_CODES.has(error?.code) ||
    error?.type === 'tokens' ||
    error?.type === 'rate_limit_error'
  );
}

export function createPacedResponseRequester(create, {
  minIntervalMs = MIN_REQUEST_INTERVAL_MS, maxRetryWaitMs = MAX_RETRY_WAIT_MS,
  now = Date.now, wait = sleep, random = Math.random, warn = console.warn
} = {}) {
  let queue = Promise.resolve();
  let nextRequestAt = 0;
  const request = async (...args) => {
    let retryWait = 0;
    for (let attempt = 1; attempt <= MAX_API_ATTEMPTS; attempt += 1) {
      const pacingDelay = Math.max(0, nextRequestAt - now());
      if (pacingDelay > maxRetryWaitMs - retryWait) throw new Error('Evidence pipeline cooldown exceeds its 10-minute wait budget; defer this run.');
      if (pacingDelay) {
        warn(`Evidence pipeline pacing: waiting ${(pacingDelay / 1000).toFixed(1)}s before the next request.`);
        await wait(pacingDelay);
        retryWait += pacingDelay;
      }
      nextRequestAt = now() + minIntervalMs;
      try {
        const pending = create(...args);
        // The SDK exposes response headers through withResponse(); plain promises support test clients.
        const { data, response } = typeof pending?.withResponse === 'function'
          ? await pending.withResponse() : { data: await pending };
        nextRequestAt = Math.max(nextRequestAt, now() + capacityDelay(response?.headers, data?.usage?.total_tokens));
        return data;
      } catch (error) {
        if (!isTemporaryAPIError(error)) throw error;
        const delay = Math.max(retryDelay(error, attempt, now, random), capacityDelay(error?.headers), nextRequestAt - now());
        // A queued caller must also respect this cooldown if this request ultimately fails.
        nextRequestAt = now() + delay;
        if (attempt === MAX_API_ATTEMPTS) throw error;
        // Never shorten a server-mandated wait to squeeze it into the retry budget.
        if (delay > maxRetryWaitMs - retryWait) throw error;
        const condition = error.status === 429 ? 'rate limited' : 'temporarily unavailable';
        warn(`Evidence pipeline ${condition} (HTTP ${error.status}); retrying attempt ${attempt + 1}/${MAX_API_ATTEMPTS} in ${(delay / 1000).toFixed(1)}s.`);
        await wait(delay);
        retryWait += delay;
      }
    }
    throw new Error('Evidence pipeline exhausted its retry attempts.');
  };
  return (...args) => {
    const result = queue.then(() => request(...args));
    queue = result.catch(() => {});
    return result;
  };
}


function githubOIDCProvider(requestURL, requestToken, audience) {
  return {
    tokenType: 'jwt',
    getToken: async () => {
      const url = new URL(requestURL);
      url.searchParams.set('audience', audience);
      const response = await fetch(url, { headers: { Authorization: `bearer ${requestToken}` } });
      if (!response.ok) throw new Error(`GitHub OIDC token request failed: ${response.status}`);
      const data = await response.json();
      if (!data.value) throw new Error('GitHub OIDC response did not contain a token.');
      return data.value;
    }
  };
}

export function pipelineOpenAIClient() {
  const { OPENAI_IDENTITY_PROVIDER_ID: identityProviderId, OPENAI_SERVICE_ACCOUNT_ID: serviceAccountId,
    OPENAI_WIF_AUDIENCE: audience, ACTIONS_ID_TOKEN_REQUEST_URL: requestURL,
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: requestToken, OPENAI_API_KEY: apiKey } = process.env;
  const options = { maxRetries: 0 };
  if (identityProviderId && serviceAccountId && audience && requestURL && requestToken) {
    options.workloadIdentity = { identityProviderId, serviceAccountId,
      provider: githubOIDCProvider(requestURL, requestToken, audience) };
  } else if (apiKey) {
    options.apiKey = apiKey;
  } else {
    throw new Error('Configure OpenAI workload identity variables or OPENAI_API_KEY.');
  }
  const client = new OpenAI(options);
  const create = client.responses.create.bind(client.responses);
  client.responses.create = createPacedResponseRequester(create);
  return client;
}
