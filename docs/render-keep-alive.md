# Render Keep-Alive Automation

## Overview
Render free-tier web services automatically spin down into a cold sleep state after **15 minutes of inactivity**. Waking up from a cold start takes anywhere from **30 to 75 seconds**, causing significant latency for the first user request.

A Cloudflare Worker is configured to ping the health endpoint every **12 minutes** (`*/12 * * * *`), once deployed:
- **Target URL**: `https://window-kq5v.onrender.com/health`
- **Script**: [`scripts/keep-alive.sh`](file:///home/aatir/local_dev/window/scripts/keep-alive.sh)
- **Cloudflare Worker**: `cloudflare/keep-alive` (scheduled independently of GitHub Actions)
- **Local Crontab**: Optional, if installed on your machine
- **Logs**: [`logs/keep-alive.log`](file:///home/aatir/local_dev/window/logs/keep-alive.log)

---

## Local Script: Handled Situations & Edge Cases

| Scenario / Situation | Failure Risk | How It Is Handled |
| :--- | :--- | :--- |
| **Cold Start Latency** | Waking up takes 30–75s. Default short timeouts (5–15s) drop connections prematurely. | `--max-time 90` and `--connect-timeout 20` allow the request to hold open while Render spins up the container. |
| **Gateway 502/503/504 Errors** | Render proxy returns 502/503 while Node.js is initializing port 10000. | Validates HTTP response is explicitly `2xx`. Treats 502/503/504 as recoverable wake-up states. |
| **Rapid Retry Thundering** | Instant retries after a failure fail repeatedly because the server is still booting. | Progressive backoff delay (10s → 15s → 22s) gives the booting container time to stabilize. |
| **Retry Limit (3 Retries)** | Infinite loops or excessive retries wasting compute. | Configured for 1 initial attempt + 3 retries (total 4 attempts) with attempt tracking. |
| **Process Overlap / Stampede** | If retries take ~2 minutes or network hangs, overlapping cron runs could spawn. | `flock -n 200` on `/tmp/window_render_keepalive.lock`. Overlapping instances exit immediately. |
| **Network & SSL Diagnostics** | Silent curl failures leave developers guessing why it failed. | Captures exit codes (DNS failure, connection refused, SSL/TLS handshake error) and logs diagnostics. |
| **Cron Minimal Environment** | Crontab runs without user environment variables and with minimal `PATH`. | Explicit `PATH` exported at top of script; POSIX-compliant standard shell syntax. |
| **Unbounded Log Growth** | Running 120 times/day would cause log files to grow indefinitely. | Built-in log rotation caps the log file at 5,000 lines, pruning to the newest 2,500 lines. |
| **Machine Sleep / Shutdown** | If developer closes laptop or shuts down workstation, local cron cannot run. | The Cloudflare Worker runs independently of the developer machine once deployed. |
| **Failure Alerting** | Server completely down without developer knowing. | Optional `WEBHOOK_URL` support to send alerts to Discord, Slack, or monitoring webhooks. |

---

## Managing the Local Cron

### View Active Crontab
```bash
crontab -l
```

### Inspect Live Logs
```bash
tail -f logs/keep-alive.log
```

### Run Script Manually
```bash
./scripts/keep-alive.sh
```

### Customize Parameters
Parameters can be overridden via environment variables:
```bash
TARGET_URL="https://window-kq5v.onrender.com/health" \
MAX_RETRIES=3 \
MAX_TIME=90 \
INITIAL_BACKOFF=10 \
./scripts/keep-alive.sh
```

### Remove Cron Job
```bash
(crontab -l | grep -v 'keep-alive.sh') | crontab -
```

---

## 24/7 Cloud Solutions (When Laptop Is Asleep)

Because local crons only run while the machine is powered on, use the Cloudflare Worker for scheduled cloud pings. External monitors remain optional.

### Cloudflare Worker

The Worker and its cron trigger are managed in `cloudflare/keep-alive/wrangler.toml`. It accepts only 2xx responses, follows redirects, bypasses the cache, and retries network errors and non-2xx responses up to three times. Each request has a 90-second timeout for response headers, including connection and Render cold-start time; retries wait 10, 15, then 22 seconds. The Workers fetch API does not expose curl's separate 20-second connection timeout. Response bodies are discarded rather than logged or waited on.

Structured logs record attempts, status, duration, and broad failure categories; observability is enabled in the Wrangler configuration. DNS, connection, and TLS errors are grouped because Workers fetch does not expose curl exit codes. After all four attempts fail, the invocation fails so it is visible in Cloudflare Cron Events and Workers Logs. The target URL is a non-secret Worker variable in that file; change it there when the Render endpoint changes.

Optionally set the Worker secret `WEBHOOK_URL` in the Cloudflare dashboard or with `wrangler secret put WEBHOOK_URL` from `cloudflare/keep-alive`. On final failure the Worker sends a JSON `text` alert to that endpoint with a 10-second timeout. A failed alert is logged and does not hide the failed cron invocation. Do not put the webhook URL in `wrangler.toml`.

The bounded normal execution time is about 407 seconds for four timed-out requests and the backoffs (plus up to 10 seconds for an alert), below the 12-minute interval. Unlike the local script's `flock`, this does not provide a distributed lock: delayed, duplicate, or manually triggered invocations can overlap. Use a coordinated lock service if strict single execution is required.

To enable deployment, add these GitHub Actions secrets to the repository:

- `CLOUDFLARE_API_TOKEN`: Cloudflare API token with Workers Scripts edit permission for the intended account and permission to edit Worker cron triggers.
- `CLOUDFLARE_ACCOUNT_ID`: the target Cloudflare account ID.

The **Deploy Cloudflare Worker** workflow deploys on changes to the Worker or its workflow on `master`, and supports manual dispatch for the initial deployment. Wrangler creates or updates `window-keep-alive` and applies its cron schedule. No HTTP route, CDN, or application hosting is configured. Cron changes can take time to propagate; check the Worker's Cron Events and logs in the Cloudflare dashboard after deployment. The schedule uses UTC. The free Workers plan and Render's terms/usage limits still apply; a cron schedule does not guarantee uptime.

Run the Worker tests with `node --test cloudflare/keep-alive/worker.test.mjs`.

### Optional: External Cloud Pingers
Free services that run from the cloud and never sleep:
1. **[cron-job.org](https://cron-job.org)** (100% Free):
   - URL: `https://window-kq5v.onrender.com/health`
   - Schedule: Every 12 minutes
   - Request timeout: 60s
   - Email alert on failure: Enabled
2. **[UptimeRobot](https://uptimerobot.com)** (Free):
   - Monitor Type: `HTTP(s)`
   - URL: `https://window-kq5v.onrender.com/health`
   - Interval: Every 5 minutes (keeps it warm and alerts you if it goes down)

### Manual GitHub Actions Fallback
A workflow file has been created at [`.github/workflows/keep-alive.yaml`](file:///home/aatir/local_dev/window/.github/workflows/keep-alive.yaml).
- Run manually via `workflow_dispatch` if a one-off ping is needed.
- It no longer runs on a schedule; deploy the Cloudflare Worker to enable scheduled pings.
