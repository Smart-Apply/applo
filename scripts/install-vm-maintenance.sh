#!/usr/bin/env bash
# ================================================================
# install-vm-maintenance.sh
# ================================================================
# Installs three maintenance jobs on the production VM:
#
#   1. Daily Postgres backup -> Cloudflare R2 (encrypted)
#   2. Weekly Docker image prune (saves disk)
#   3. Daily disk-usage check (alerts via stderr at >85%)
#
# Idempotent: re-running upgrades the scripts in place but never
# duplicates cron entries. Existing backups are kept.
#
# Prerequisites on the VM (auto-installed if missing):
#   - awscli v2 (for R2 uploads via S3-compatible API)
#   - gpg (for at-rest encryption of backups, defense-in-depth on top
#          of R2's built-in AES-256)
#
# Usage from a local machine:
#   VM_SSH_KEY=~/.ssh/smartapply-mvp-vm_key.pem \
#     bash scripts/install-vm-maintenance.sh
#
# Override with env vars:
#   VM_HOST=1.2.3.4 VM_USER=azureuser
#
# To rotate the backup encryption passphrase, re-run with:
#   BACKUP_PASSPHRASE='new-passphrase' \
#     bash scripts/install-vm-maintenance.sh
# ================================================================
set -euo pipefail

# ----------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------
VM_HOST="${VM_HOST:-135.225.56.134}"
VM_USER="${VM_USER:-azureuser}"
VM_SSH_KEY="${VM_SSH_KEY:-}"
LOCAL_ENV="${LOCAL_ENV:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/apps/api/.env}"

# Defaults that can be overridden
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
DISK_ALERT_THRESHOLD="${DISK_ALERT_THRESHOLD:-85}"

# ----------------------------------------------------------------
# Colours
# ----------------------------------------------------------------
if [[ -t 1 ]]; then
  C_RED=$'\033[0;31m'; C_GREEN=$'\033[0;32m'; C_YELLOW=$'\033[1;33m'
  C_BLUE=$'\033[0;34m'; C_RST=$'\033[0m'
else
  C_RED=""; C_GREEN=""; C_YELLOW=""; C_BLUE=""; C_RST=""
fi
log()  { printf '%s\n' "${C_BLUE}==>${C_RST} $*"; }
ok()   { printf '%s\n' "${C_GREEN}✓${C_RST} $*"; }
warn() { printf '%s\n' "${C_YELLOW}⚠${C_RST} $*"; }
err()  { printf '%s\n' "${C_RED}✗${C_RST} $*" >&2; }

# ----------------------------------------------------------------
# Pre-flight
# ----------------------------------------------------------------
log "Pre-flight"

if [[ -z "$VM_SSH_KEY" || ! -f "$VM_SSH_KEY" ]]; then
  err "VM_SSH_KEY must point to a readable private key. Got: $VM_SSH_KEY"
  exit 1
fi
ok "SSH key: $VM_SSH_KEY"

if [[ ! -f "$LOCAL_ENV" ]]; then
  err "Local .env not found: $LOCAL_ENV"
  exit 1
fi

# Pull R2 + backup-passphrase config from local .env (these never get
# committed to git — they live on the VM).
R2_ACCOUNT_ID=$(awk -F= '$1=="R2_ACCOUNT_ID"{print $2}' "$LOCAL_ENV")
R2_ACCESS_KEY_ID=$(awk -F= '$1=="R2_ACCESS_KEY_ID"{print $2}' "$LOCAL_ENV")
R2_SECRET_ACCESS_KEY=$(awk -F= '$1=="R2_SECRET_ACCESS_KEY"{print $2}' "$LOCAL_ENV")
R2_BUCKET=$(awk -F= '$1=="R2_BUCKET"{print $2}' "$LOCAL_ENV")
R2_ENDPOINT=$(awk -F= '$1=="R2_ENDPOINT"{print $2}' "$LOCAL_ENV")
: "${R2_ENDPOINT:=https://${R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com}"

if [[ -z "$R2_ACCOUNT_ID" || -z "$R2_ACCESS_KEY_ID" || -z "$R2_SECRET_ACCESS_KEY" || -z "$R2_BUCKET" ]]; then
  err "Missing R2 credentials in $LOCAL_ENV"
  exit 1
fi
ok "R2 credentials loaded"

# Generate a backup passphrase if none provided. We'll write it to the VM
# (root-owned, 600 perms). Override BACKUP_PASSPHRASE to re-use an existing one.
if [[ -z "${BACKUP_PASSPHRASE:-}" ]]; then
  BACKUP_PASSPHRASE=$(openssl rand -base64 48 | tr -d '\n')
  warn "Generated new backup passphrase \u2014 store it somewhere safe:"
  warn "  $BACKUP_PASSPHRASE"
  warn "(Without it the backups in R2 are unrecoverable.)"
fi

SSH_OPTS=(-i "$VM_SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10)

# ----------------------------------------------------------------
# Push installer to the VM and run it as root via sudo
# ----------------------------------------------------------------
log "Installing maintenance scripts on ${VM_HOST}"

ssh "${SSH_OPTS[@]}" "${VM_USER}@${VM_HOST}" \
  R2_ACCOUNT_ID="$R2_ACCOUNT_ID" \
  R2_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID" \
  R2_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY" \
  R2_BUCKET="$R2_BUCKET" \
  R2_ENDPOINT="$R2_ENDPOINT" \
  BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE" \
  BACKUP_RETENTION_DAYS="$BACKUP_RETENTION_DAYS" \
  DISK_ALERT_THRESHOLD="$DISK_ALERT_THRESHOLD" \
  bash -s <<'REMOTE_EOF'
set -euo pipefail

# ----------------------------------------------------------------
# 1. Install dependencies (awscli v2 + gpg)
# ----------------------------------------------------------------
echo "  → Installing awscli + gpg if missing"
if ! command -v aws >/dev/null 2>&1; then
  echo "    Installing awscli v2…"
  curl -sSf "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
  unzip -q /tmp/awscliv2.zip -d /tmp
  sudo /tmp/aws/install --update
  rm -rf /tmp/aws /tmp/awscliv2.zip
fi
if ! command -v gpg >/dev/null 2>&1; then
  sudo apt-get update -qq && sudo apt-get install -y -qq gnupg
fi
echo "    ✓ aws=$(aws --version 2>&1 | head -c 40)"
echo "    ✓ gpg=$(gpg --version | head -1)"

# ----------------------------------------------------------------
# 2. Write secrets file (root-owned, 600 perms)
# ----------------------------------------------------------------
sudo mkdir -p /etc/smartapply
sudo tee /etc/smartapply/backup.env >/dev/null <<EOF
# Generated by install-vm-maintenance.sh — do not edit by hand.
# Used by /usr/local/bin/smartapply-pg-backup.sh
R2_ACCOUNT_ID="$R2_ACCOUNT_ID"
R2_BUCKET="$R2_BUCKET"
R2_ENDPOINT="$R2_ENDPOINT"
AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
BACKUP_PASSPHRASE="$BACKUP_PASSPHRASE"
BACKUP_RETENTION_DAYS="$BACKUP_RETENTION_DAYS"
DISK_ALERT_THRESHOLD="$DISK_ALERT_THRESHOLD"
EOF
sudo chmod 600 /etc/smartapply/backup.env
sudo chown root:root /etc/smartapply/backup.env
echo "  ✓ Secrets stored at /etc/smartapply/backup.env (root:root 600)"

# ----------------------------------------------------------------
# 3. Postgres backup script
# ----------------------------------------------------------------
sudo tee /usr/local/bin/smartapply-pg-backup.sh >/dev/null <<'BACKUP_SCRIPT'
#!/usr/bin/env bash
# Daily Postgres dump → encrypted → uploaded to R2.
# Cron entry: 0 3 * * * /usr/local/bin/smartapply-pg-backup.sh
set -euo pipefail

# `set -a` auto-exports every variable defined until `set +a`. Without this,
# `source backup.env` puts AWS_ACCESS_KEY_ID into the shell scope but does
# NOT export it to subprocesses — and `aws s3 cp` runs as a subprocess.
set -a
source /etc/smartapply/backup.env
set +a

TS=$(date -u +%Y%m%dT%H%M%SZ)
TMP="/tmp/smartapply-${TS}.sql.gz.gpg"

# pg_dump runs INSIDE the smartapply-db container so we don't need PG creds
# on the host. Pipe through gzip then symmetrically encrypt with the
# passphrase stored alongside this script. R2 already encrypts at rest with
# AES-256, but doing it ourselves means a Cloudflare insider can't read
# the backups.
docker exec smartapply-db pg_dump -U postgres -d smartapply --no-owner --no-acl \
  | gzip -9 \
  | gpg --batch --yes --quiet --symmetric --cipher-algo AES256 \
        --passphrase "$BACKUP_PASSPHRASE" --output "$TMP"

SIZE=$(du -h "$TMP" | cut -f1)
echo "[$(date -u +%FT%TZ)] Encrypted dump ready: $TMP ($SIZE)"

# Upload to R2 under backups/postgres/YYYY/MM/DD/
DATE_PATH=$(date -u +%Y/%m/%d)
S3_KEY="backups/postgres/${DATE_PATH}/smartapply-${TS}.sql.gz.gpg"
aws s3 cp "$TMP" "s3://${R2_BUCKET}/${S3_KEY}" \
  --endpoint-url "$R2_ENDPOINT" \
  --no-progress

echo "[$(date -u +%FT%TZ)] Uploaded to s3://${R2_BUCKET}/${S3_KEY}"

# Local cleanup (R2 is the source of truth)
rm -f "$TMP"

# Remote retention: prune backups older than $BACKUP_RETENTION_DAYS days.
# We use `aws s3 ls` + xargs to avoid needing a lifecycle rule on R2.
CUTOFF_EPOCH=$(date -u -d "${BACKUP_RETENTION_DAYS} days ago" +%s 2>/dev/null \
            || date -u -v-${BACKUP_RETENTION_DAYS}d +%s)
aws s3 ls "s3://${R2_BUCKET}/backups/postgres/" --recursive \
  --endpoint-url "$R2_ENDPOINT" \
  | while read -r ts time size key; do
      [[ -z "$key" ]] && continue
      OBJ_EPOCH=$(date -u -d "$ts $time" +%s 2>/dev/null || true)
      if [[ -n "$OBJ_EPOCH" && "$OBJ_EPOCH" -lt "$CUTOFF_EPOCH" ]]; then
        aws s3 rm "s3://${R2_BUCKET}/${key}" --endpoint-url "$R2_ENDPOINT"
        echo "  pruned: $key"
      fi
    done

echo "[$(date -u +%FT%TZ)] Backup complete."
BACKUP_SCRIPT
sudo chmod 750 /usr/local/bin/smartapply-pg-backup.sh
sudo chown root:root /usr/local/bin/smartapply-pg-backup.sh
echo "  ✓ Backup script: /usr/local/bin/smartapply-pg-backup.sh"

# ----------------------------------------------------------------
# 4. Docker prune script (weekly)
# ----------------------------------------------------------------
sudo tee /usr/local/bin/smartapply-docker-prune.sh >/dev/null <<'PRUNE_SCRIPT'
#!/usr/bin/env bash
# Weekly Docker cleanup. Removes:
#   - stopped containers
#   - unused images (older than 7 days)
#   - unused networks
#   - dangling volumes
#
# Does NOT touch volumes in use (postgres_data is safe).
set -euo pipefail

echo "[$(date -u +%FT%TZ)] Starting Docker prune…"
df -h / | tail -1

docker container prune -f
docker image prune -af --filter "until=168h"
docker network prune -f
docker builder prune -af --filter "until=168h" 2>/dev/null || true

echo "[$(date -u +%FT%TZ)] Docker prune complete:"
df -h / | tail -1
PRUNE_SCRIPT
sudo chmod 750 /usr/local/bin/smartapply-docker-prune.sh
sudo chown root:root /usr/local/bin/smartapply-docker-prune.sh
echo "  ✓ Docker prune: /usr/local/bin/smartapply-docker-prune.sh"

# ----------------------------------------------------------------
# 5. Disk usage check (daily, alerts via journald + stderr)
# ----------------------------------------------------------------
sudo tee /usr/local/bin/smartapply-disk-check.sh >/dev/null <<'DISK_SCRIPT'
#!/usr/bin/env bash
# Alerts when /  is over $DISK_ALERT_THRESHOLD percent full.
# Output goes to stderr → captured by journald → visible in `journalctl`.
set -euo pipefail
set -a
source /etc/smartapply/backup.env
set +a
USED=$(df / | awk 'NR==2 {gsub("%",""); print $5}')
if [[ "$USED" -ge "$DISK_ALERT_THRESHOLD" ]]; then
  echo "[$(date -u +%FT%TZ)] DISK ALERT: / is ${USED}% full (threshold ${DISK_ALERT_THRESHOLD}%)" >&2
  df -h / | tail -1 >&2
  echo "Top consumers:" >&2
  sudo du -sh /var/lib/docker /home/azureuser/smart-apply /var/log 2>/dev/null | sort -h >&2
fi
DISK_SCRIPT
sudo chmod 750 /usr/local/bin/smartapply-disk-check.sh
sudo chown root:root /usr/local/bin/smartapply-disk-check.sh
echo "  ✓ Disk check: /usr/local/bin/smartapply-disk-check.sh"

# ----------------------------------------------------------------
# 6. Cron entries (root crontab — idempotent re-write)
# ----------------------------------------------------------------
# Strip our entries first to avoid duplicates, then re-add.
sudo crontab -l 2>/dev/null | grep -vE 'smartapply-(pg-backup|docker-prune|disk-check)\.sh' > /tmp/cron.tmp || true

cat <<'CRON' >> /tmp/cron.tmp
# === smartapply maintenance (managed by install-vm-maintenance.sh) ===
0 3 * * *   /usr/local/bin/smartapply-pg-backup.sh   2>&1 | logger -t smartapply-pg-backup
30 4 * * 0  /usr/local/bin/smartapply-docker-prune.sh 2>&1 | logger -t smartapply-docker-prune
0 * * * *   /usr/local/bin/smartapply-disk-check.sh  2>&1 | logger -t smartapply-disk-check
CRON
sudo crontab /tmp/cron.tmp
rm -f /tmp/cron.tmp
echo "  ✓ Cron entries installed (root crontab):"
sudo crontab -l | grep smartapply | sed 's/^/      /'

# ----------------------------------------------------------------
# 7. Run a smoke test of the backup right now
# ----------------------------------------------------------------
echo "  → Running first backup as smoke test (this proves R2 works)…"
sudo /usr/local/bin/smartapply-pg-backup.sh
echo "  ✓ First backup uploaded successfully."
REMOTE_EOF

ok "Maintenance installed on ${VM_HOST}"
echo
log "Verification — listing recent backups in R2:"
ssh "${SSH_OPTS[@]}" "${VM_USER}@${VM_HOST}" \
  "AWS_ACCESS_KEY_ID='$R2_ACCESS_KEY_ID' AWS_SECRET_ACCESS_KEY='$R2_SECRET_ACCESS_KEY' \
   aws s3 ls 's3://${R2_BUCKET}/backups/postgres/' --recursive --endpoint-url '$R2_ENDPOINT' \
   | tail -5" 2>&1 | sed 's/^/  /'

echo
ok "Done. Schedule:"
echo "    03:00 UTC daily — Postgres backup → R2"
echo "    04:30 UTC Sundays — Docker prune"
echo "    every hour — Disk-usage check (alerts at ${DISK_ALERT_THRESHOLD}%)"
echo
warn "Tail maintenance logs on the VM with:"
echo "    ssh ${VM_USER}@${VM_HOST} 'journalctl -t smartapply-pg-backup -t smartapply-disk-check -t smartapply-docker-prune -n 50'"
