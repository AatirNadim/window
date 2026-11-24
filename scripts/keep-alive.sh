#!/usr/bin/env bash
# ==============================================================================
# Render Service Keep-Alive Ping Script
# Target: https://window-kq5v.onrender.com/health
# Purpose: Prevent Render free-tier container cold sleep (inactivity > 15 mins)
# Frequency: Every 12 minutes
# Max Retries: 3 (1 initial attempt + 3 retries = 4 total attempts)
# ==============================================================================

set -euo pipefail

# Ensure standard tools are in PATH when invoked via non-interactive cron
PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH}"

# --- Configuration (customizable via environment variables) ---
TARGET_URL="${TARGET_URL:-https://window-kq5v.onrender.com/health}"
MAX_RETRIES="${MAX_RETRIES:-3}"                  # Up to 3 retries if initial attempt fails
CONNECT_TIMEOUT="${CONNECT_TIMEOUT:-20}"        # Max time in seconds to establish TCP connection
MAX_TIME="${MAX_TIME:-90}"                      # Max total time in seconds (Render cold boot can take 35-70s)
INITIAL_BACKOFF="${INITIAL_BACKOFF:-10}"        # Base wait (seconds) before 1st retry
BACKOFF_MULTIPLIER="${BACKOFF_MULTIPLIER:-1.5}" # Backoff multiplier for consecutive retries
LOCK_FILE="${LOCK_FILE:-/tmp/window_render_keepalive.lock}"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LOG_DIR="${LOG_DIR:-${PROJECT_ROOT}/logs}"
LOG_FILE="${LOG_FILE:-${LOG_DIR}/keep-alive.log}"
MAX_LOG_LINES="${MAX_LOG_LINES:-5000}"          # Truncate logs if exceeding this line count
USER_AGENT="Window-KeepAlive-Ping/1.0 (+https://render.com)"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# --- Concurrency Lock (Prevent cron overlap / stampedes) ---
# If a previous run is stalled or still in retry loop, exit gracefully.
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] [WARN] Another keep-alive instance is already active. Skipping overlapping run." >> "$LOG_FILE"
    exit 0
fi

# --- Helper: Logging ---
log() {
    local level="$1"
    shift
    local timestamp
    timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    local message="[$timestamp] [$level] $*"
    echo "$message"
    echo "$message" >> "$LOG_FILE"
}

# --- Helper: Automatic Log Rotation / Line Capping ---
rotate_logs() {
    if [[ -f "$LOG_FILE" ]]; then
        local line_count
        line_count=$(wc -l < "$LOG_FILE" 2>/dev/null || echo 0)
        if (( line_count > MAX_LOG_LINES )); then
            local keep_lines=$(( MAX_LOG_LINES / 2 ))
            tail -n "$keep_lines" "$LOG_FILE" > "${LOG_FILE}.tmp" && mv "${LOG_FILE}.tmp" "$LOG_FILE"
            log "INFO" "Log truncated: preserved most recent $keep_lines lines."
        fi
    fi
}

# --- Main Retry Loop ---
total_attempts=$(( MAX_RETRIES + 1 ))
current_backoff="$INITIAL_BACKOFF"

for (( attempt = 1; attempt <= total_attempts; attempt++ )); do
    attempt_label="Initial Attempt"
    if (( attempt > 1 )); then
        attempt_label="Retry $(( attempt - 1 ))/${MAX_RETRIES}"
    fi

    log "INFO" "Pinging ${TARGET_URL} [${attempt}/${total_attempts}: ${attempt_label}]..."

    # Temporary files to store response payload and curl diagnostic error output
    response_body_file="$(mktemp)"
    curl_err_file="$(mktemp)"

    set +e
    http_data=$(curl -sS -L \
        --connect-timeout "$CONNECT_TIMEOUT" \
        --max-time "$MAX_TIME" \
        -A "$USER_AGENT" \
        -o "$response_body_file" \
        -w "%{http_code}:%{time_total}:%{size_download}" \
        "$TARGET_URL" 2>"$curl_err_file")
    curl_exit_code=$?
    set -e

    response_body=$(head -c 256 "$response_body_file" 2>/dev/null || true)
    curl_error=$(cat "$curl_err_file" 2>/dev/null || true)
    rm -f "$response_body_file" "$curl_err_file"

    if [[ "$http_data" =~ ^([0-9]{3}):([0-9.]+):([0-9]+)$ ]]; then
        status="${BASH_REMATCH[1]}"
        duration="${BASH_REMATCH[2]}"
        bytes="${BASH_REMATCH[3]}"
    else
        status="000"
        duration="0"
        bytes="0"
    fi

    # Situation Analysis: Check Success (HTTP 2xx)
    if [[ "$curl_exit_code" -eq 0 && "$status" =~ ^2[0-9]{2}$ ]]; then
        log "INFO" "SUCCESS: HTTP ${status} in ${duration}s (${bytes} bytes). Body: ${response_body}"
        rotate_logs
        exit 0
    fi

    # Situation Analysis: Categorize Failure
    reason="HTTP status ${status}"
    if [[ "$curl_exit_code" -ne 0 ]]; then
        case "$curl_exit_code" in
            6)  reason="DNS resolution failure (${curl_error})" ;;
            7)  reason="Failed to connect to host (${curl_error})" ;;
            28) reason="Request timed out after ${MAX_TIME}s (Render cold start latency exceeded timeout)" ;;
            35|51|53|54|58|59|60|64|66|77) reason="SSL/TLS handshake or certificate error (${curl_error})" ;;
            *)  reason="Curl exited with error code ${curl_exit_code}: ${curl_error}" ;;
        esac
    elif [[ "$status" =~ ^50[234]$ ]]; then
        reason="Render Gateway Error ${status} (Container starting up or reverse proxy temporary glitch). Body: ${response_body}"
    elif [[ "$status" -eq 404 ]]; then
        reason="HTTP 404 Not Found. Target endpoint missing or server routing changed. Body: ${response_body}"
    elif [[ "$status" =~ ^5[0-9]{2}$ ]]; then
        reason="Server 5xx Error ${status}. Body: ${response_body}"
    fi

    log "WARN" "Attempt ${attempt}/${total_attempts} FAILED: ${reason}"

    # If retries remain, wait with backoff
    if (( attempt < total_attempts )); then
        log "INFO" "Waiting ${current_backoff}s before retry (allows cold container sufficient time to boot)..."
        sleep "$current_backoff"
        current_backoff=$(awk "BEGIN {printf \"%.0f\", $current_backoff * $BACKOFF_MULTIPLIER}")
    fi
done

# If all attempts failed
log "ERROR" "CRITICAL: All ${total_attempts} attempts failed for ${TARGET_URL}."

# Optional: Webhook alert notification (Slack, Discord, generic HTTP POST)
if [[ -n "${WEBHOOK_URL:-}" ]]; then
    curl -s -X POST -H "Content-Type: application/json" \
        -d "{\"text\":\"[CRITICAL ALERT] Render keep-alive health ping failed for ${TARGET_URL} after ${total_attempts} attempts.\"}" \
        "$WEBHOOK_URL" >/dev/null 2>&1 || true
fi

rotate_logs
exit 1
