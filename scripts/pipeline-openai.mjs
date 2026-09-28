import OpenAI from 'openai';

const MAX_API_ATTEMPTS = 6;
const RETRYABLE_429_CODES = new Set(['rate_limit_exceeded', 'slow_down']);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(error, attempt) {
  const retryAfter = error?.headers?.get?.('retry-after') ?? error?.headers?.['retry-after'];
  const seconds = Number(retryAfter);
  if (retryAfter !== null && retryAfter !== undefined && String(retryAfter).trim() && Number.isFinite(seconds) && seconds >= 0) return (seconds * 1000) + 1000;
  if (retryAfter) {
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(0, date - Date.now()) + 1000;
  }
  const messageDelay = String(error?.message ?? '').match(/try again in\s+([\d.]+)s/i);
  if (messageDelay) return (Number(messageDelay[1]) * 1000) + 1000;
  return Math.min(5000 * (2 ** (attempt - 1)), 60000) + Math.floor(Math.random() * 1000);
}

function isTemporaryAPIError(error) {
  if (error?.status === 503) return true;
  return error?.status === 429 && (
    RETRYABLE_429_CODES.has(error?.code) ||
    error?.type === 'tokens' ||
    error?.type === 'rate_limit_error'
  );
}

async function withTemporaryRetry(label, operation) {
  for (let attempt = 1; attempt <= MAX_API_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTemporaryAPIError(error) || attempt === MAX_API_ATTEMPTS) throw error;
      const delay = retryDelay(error, attempt);
      console.warn(`${label} temporarily limited; retrying attempt ${attempt + 1}/${MAX_API_ATTEMPTS} in ${(delay / 1000).toFixed(1)}s.`);
      await sleep(delay);
    }
  }
  throw new Error(`${label} exhausted its retry attempts.`);
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
  client.responses.create = (...args) => withTemporaryRetry('Evidence pipeline', () => create(...args));
  return client;
}
