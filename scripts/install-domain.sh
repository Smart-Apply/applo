#!/usr/bin/env bash
# =============================================================================
# install-domain.sh — One-shot VM installer for the smart-apply.io domain.
# =============================================================================
# Run this ON THE VM (not locally) AFTER:
#   1. Cloudflare nameservers are active for your domain
#   2. DNS A records for @ and api point to this VM's public IP (proxied 🟧)
#   3. You generated a Cloudflare Origin Certificate and have the .pem + .key
#
# Usage (on the VM):
#   cd /home/azureuser/smart-apply
#   git pull origin main
#   bash scripts/install-domain.sh smart-apply.io
#
# The script will:
#   - Install nginx if missing
#   - Prompt for the Cloudflare origin cert + private key (paste, then Ctrl-D)
#   - Drop them into /etc/ssl/cloudflare/
#   - Symlink the versioned nginx config from this repo into sites-enabled
#   - Test + reload nginx
#   - Update apps/api/.env with new CORS_ORIGINS, APP_URL, API_BASE_URL
#   - Restart the API container so the new env is picked up
#
# Idempotent: safe to re-run. Cert files are not overwritten if they exist
# (delete /etc/ssl/cloudflare/<domain>.pem manually to force re-prompt).
# =============================================================================

set -euo pipefail

# --- Args ------------------------------------------------------------------
DOMAIN="${1:-}"
if [[ -z "$DOMAIN" ]]; then
    echo "Usage: bash scripts/install-domain.sh <domain>"
    echo "Example: bash scripts/install-domain.sh smart-apply.io"
    exit 1
fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NGINX_SRC="$REPO_ROOT/infra/nginx/smart-apply.conf"
NGINX_DST="/etc/nginx/sites-available/smart-apply.conf"
NGINX_LINK="/etc/nginx/sites-enabled/smart-apply.conf"
CERT_DIR="/etc/ssl/cloudflare"
CERT_FILE="$CERT_DIR/$DOMAIN.pem"
KEY_FILE="$CERT_DIR/$DOMAIN.key"
ENV_FILE="$REPO_ROOT/apps/api/.env"
COMPOSE_FILE="$REPO_ROOT/infra/docker-compose.prod.yml"

# --- Colors ----------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
log()  { echo -e "${GREEN}==>${NC} $*"; }
warn() { echo -e "${YELLOW}!! ${NC} $*"; }
die()  { echo -e "${RED}xx ${NC} $*" >&2; exit 1; }

# --- 1) Sanity checks ------------------------------------------------------
[[ -f "$NGINX_SRC" ]] || die "Repo nginx config not found at $NGINX_SRC. Did you 'git pull'?"
[[ -f "$COMPOSE_FILE" ]] || die "docker-compose.prod.yml not found at $COMPOSE_FILE."
[[ "$EUID" -ne 0 ]] && SUDO="sudo" || SUDO=""

# --- 2) Install nginx if missing -------------------------------------------
if ! command -v nginx >/dev/null 2>&1; then
    log "Installing nginx..."
    $SUDO apt-get update -y
    $SUDO apt-get install -y nginx
else
    log "nginx already installed ($(nginx -v 2>&1))"
fi

# --- 3) Cloudflare origin cert ---------------------------------------------
$SUDO mkdir -p "$CERT_DIR"
$SUDO chmod 700 "$CERT_DIR"

if [[ -f "$CERT_FILE" && -f "$KEY_FILE" ]]; then
    log "Cert + key already exist at $CERT_DIR (skipping prompt)."
    log "Delete them manually if you want to re-paste."
else
    echo
    warn "Paste the Cloudflare ORIGIN CERTIFICATE (PEM)."
    warn "Begin with -----BEGIN CERTIFICATE----- and end with -----END CERTIFICATE-----"
    warn "Then press Ctrl-D on a new line."
    echo
    TMP_CERT=$(mktemp)
    cat > "$TMP_CERT"
    grep -q "BEGIN CERTIFICATE" "$TMP_CERT" || die "Pasted text does not look like a PEM certificate."
    $SUDO mv "$TMP_CERT" "$CERT_FILE"
    $SUDO chmod 644 "$CERT_FILE"
    log "Saved certificate to $CERT_FILE"

    echo
    warn "Paste the matching PRIVATE KEY (PEM)."
    warn "Begin with -----BEGIN PRIVATE KEY----- (or RSA PRIVATE KEY) and end with -----END..."
    warn "Then press Ctrl-D on a new line."
    echo
    TMP_KEY=$(mktemp)
    cat > "$TMP_KEY"
    grep -q "BEGIN.*PRIVATE KEY" "$TMP_KEY" || die "Pasted text does not look like a private key."
    $SUDO mv "$TMP_KEY" "$KEY_FILE"
    $SUDO chmod 600 "$KEY_FILE"
    log "Saved private key to $KEY_FILE"
fi

# --- 4) Activate the nginx config ------------------------------------------
log "Copying nginx config to $NGINX_DST"
$SUDO cp "$NGINX_SRC" "$NGINX_DST"

if [[ ! -L "$NGINX_LINK" ]]; then
    log "Enabling nginx site"
    $SUDO ln -sf "$NGINX_DST" "$NGINX_LINK"
fi

# Disable default nginx welcome page if present
if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
    log "Removing default nginx site"
    $SUDO rm /etc/nginx/sites-enabled/default
fi

log "Testing nginx config..."
$SUDO nginx -t

log "Reloading nginx..."
$SUDO systemctl reload nginx
$SUDO systemctl enable nginx >/dev/null 2>&1 || true

# --- 5) Update apps/api/.env -----------------------------------------------
# Add or replace CORS_ORIGINS, APP_URL, API_BASE_URL. Other vars are left
# untouched. Backs up the file first.
if [[ -f "$ENV_FILE" ]]; then
    log "Backing up $ENV_FILE → $ENV_FILE.bak.$(date +%s)"
    cp "$ENV_FILE" "$ENV_FILE.bak.$(date +%s)"

    # Helper: upsert KEY=value into the env file
    upsert_env() {
        local key="$1" value="$2"
        if grep -q "^${key}=" "$ENV_FILE"; then
            # Use a sed delimiter that won't appear in URLs
            sed -i "s|^${key}=.*|${key}=${value}|" "$ENV_FILE"
        else
            echo "${key}=${value}" >> "$ENV_FILE"
        fi
    }

    # Both the new domain and the old Azure FQDN are kept whitelisted so we
    # can fall back during the migration window. Remove the Azure one once
    # the cutover is verified.
    upsert_env "CORS_ORIGINS" "https://${DOMAIN},https://www.${DOMAIN},https://smartapplymvp.swedencentral.cloudapp.azure.com"
    upsert_env "APP_URL" "https://${DOMAIN}"
    upsert_env "API_BASE_URL" "https://api.${DOMAIN}"

    log "Updated CORS_ORIGINS, APP_URL, API_BASE_URL in $ENV_FILE"
else
    warn "$ENV_FILE not found — skipping env update. Create it manually with:"
    cat <<EOF
  CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN}
  APP_URL=https://${DOMAIN}
  API_BASE_URL=https://api.${DOMAIN}
EOF
fi

# --- 6) Restart API container so it picks up the new env ------------------
if command -v docker-compose >/dev/null 2>&1; then
    log "Restarting API container to apply new env..."
    docker-compose -f "$COMPOSE_FILE" up -d --no-deps api
elif docker compose version >/dev/null 2>&1; then
    log "Restarting API container to apply new env..."
    docker compose -f "$COMPOSE_FILE" up -d --no-deps api
else
    warn "Neither docker-compose nor 'docker compose' available — restart the api container manually."
fi

# --- 7) Smoke checks -------------------------------------------------------
log "Done!"
echo
echo "Verify:"
echo "  curl -I https://${DOMAIN}"
echo "  curl    https://api.${DOMAIN}/api/v1/health"
echo
echo "Then trigger a deploy from GitHub so the web image rebuilds with the"
echo "new NEXT_PUBLIC_API_URL baked in."
