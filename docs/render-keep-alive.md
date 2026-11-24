# Render Keep-Alive Automation

## Overview
Render free-tier web services automatically spin down into a cold sleep state after **15 minutes of inactivity**. Waking up from a cold start takes anywhere from **30 to 75 seconds**, causing significant latency for the first user request.

To keep the backend server continuously warm, an automated cron job pings the health endpoint every **12 minutes** (`*/12 * * * *`):
- **Target URL**: `https://window-kq5v.onrender.com/health`
- **Script**: [`scripts/keep-alive.sh`](file:///home/aatir/local_dev/window/scripts/keep-alive.sh)
- **Local Crontab**: Installed on user `aatir`
- **Logs**: [`logs/keep-alive.log`](file:///home/aatir/local_dev/window/logs/keep-alive.log)

---

## Handled Situations & Edge Cases

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
| **Machine Sleep / Shutdown** | If developer closes laptop or shuts down workstation, local cron cannot run. | Provided GitHub Actions workflow + external cloud pingers (cron-job.org / UptimeRobot) for 24/7 uptime. |
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

Because local crons only run while this machine is powered on and connected to the internet, we have also provided two 24/7 cloud options:

### Option A: Free Cloud Pingers (Recommended Industry Standard)
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

### Option B: GitHub Actions Scheduled Workflow
A workflow file has been created at [`.github/workflows/keep-alive.yaml`](file:///home/aatir/local_dev/window/.github/workflows/keep-alive.yaml).
- Runs every 12 minutes on GitHub runners: `cron: "*/12 * * * *"`
- Supports manual execution via `workflow_dispatch`
- *Note*: GitHub Actions schedule triggers can experience queue delays of 5–20 minutes during peak times on GitHub's shared infrastructure.
