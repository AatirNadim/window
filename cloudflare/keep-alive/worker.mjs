const DEFAULT_TARGET = 'https://window-kq5v.onrender.com/health';
const RETRY_DELAYS_MS = [10_000, 15_000, 22_000];
const TIMEOUT_MS = 90_000;
const ALERT_TIMEOUT_MS = 10_000;

function releaseBody(response) {
  // Do not let a stalled or failed body cancellation change the health result.
  if (response.body) void response.body.cancel().catch(() => {});
}

function failureKind(status) {
  if ([502, 503, 504].includes(status)) return 'gateway or cold start';
  if (status === 404) return 'health endpoint not found';
  if (status >= 500) return 'server error';
  return 'unexpected HTTP status';
}

export async function pingHealth(target = DEFAULT_TARGET, fetcher = fetch, sleep = delay) {
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const started = Date.now();
    const signal = AbortSignal.timeout(TIMEOUT_MS);
    try {
      const response = await fetcher(target, {
        headers: { 'User-Agent': 'Window-KeepAlive-Ping/1.0', 'Cache-Control': 'no-cache' },
        cache: 'no-store',
        redirect: 'follow',
        signal,
      });
      releaseBody(response);
      const elapsedMs = Date.now() - started;
      if (response.ok) {
        console.log(JSON.stringify({ event: 'keep_alive_success', attempt: attempt + 1, status: response.status, elapsedMs }));
        return;
      }
      console.warn(JSON.stringify({ event: 'keep_alive_failure', attempt: attempt + 1, status: response.status, reason: failureKind(response.status), elapsedMs }));
    } catch (error) {
      // Network error messages may contain URLs or credentials, so do not log them.
      console.warn(JSON.stringify({ event: 'keep_alive_failure', attempt: attempt + 1, reason: signal.aborted || error?.name === 'TimeoutError' ? 'timeout' : 'network or TLS error', elapsedMs: Date.now() - started }));
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }
  throw new Error('Keep-alive failed after 4 attempts');
}

export async function notifyFailure(webhookUrl, fetcher = fetch) {
  if (!webhookUrl) return;
  try {
    const response = await fetcher(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '[CRITICAL ALERT] Render keep-alive health ping failed after 4 attempts.' }),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
      redirect: 'error',
    });
    releaseBody(response);
    if (!response.ok) console.error(JSON.stringify({ event: 'keep_alive_alert_failure', status: response.status }));
  } catch {
    console.error(JSON.stringify({ event: 'keep_alive_alert_failure', reason: 'network error or timeout' }));
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default {
  async scheduled(_controller, env) {
    try {
      await pingHealth(env.TARGET_URL || DEFAULT_TARGET);
    } catch (error) {
      await notifyFailure(env.WEBHOOK_URL);
      throw error;
    }
  },
};
