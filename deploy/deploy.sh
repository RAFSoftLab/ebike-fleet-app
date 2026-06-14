#!/usr/bin/env bash
# ===========================================================================
# eBike Fleet Management — native bare-metal installer (no Docker).
#
# Sets up, on a single Linux server:
#   * Postgres database + user
#   * Python venv + gunicorn/uvicorn backend  (systemd, localhost:8000)
#   * Built React SPA served by nginx on one public port (your choice)
#
# Run from inside the cloned repo, as a user with sudo:
#     cd <your-cloned-dir>
#     cp deploy/.env.production.example .env   # then edit .env with real secrets
#     sudo LISTEN_PORT=8080 bash deploy/deploy.sh
#
# Re-runnable: safe to run again after `git pull` to redeploy (idempotent).
# ===========================================================================
set -euo pipefail

# --- Resolve paths & identity (directory-agnostic) -------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"            # repo root = the dir you cloned into
RUN_USER="${SUDO_USER:-$(id -un)}"                # the human user, not root
LISTEN_PORT="${LISTEN_PORT:-8080}"                # public nginx port; override with env
SERVICE_NAME="ebike-api"

# nginx site path differs by distro; resolved below.
log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[!]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[x]\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "Run with sudo: sudo LISTEN_PORT=$LISTEN_PORT bash deploy/deploy.sh"
[ -f "$APP_DIR/.env" ] || die "Missing $APP_DIR/.env — copy deploy/.env.production.example to .env and fill it in first."

# --- Parse DATABASE_URL from .env (single source of truth) -----------------
DB_URL="$(grep -E '^DATABASE_URL=' "$APP_DIR/.env" | head -1 | cut -d= -f2-)"
[ -n "$DB_URL" ] || die "DATABASE_URL not found in .env"
# postgresql+psycopg2://USER:PASS@HOST:PORT/DBNAME
_stripped="${DB_URL#*://}"
DB_USER="${_stripped%%:*}"
_rest="${_stripped#*:}"
DB_PASS="${_rest%%@*}"
DB_NAME="${DB_URL##*/}"
DB_HOST="$(echo "$_stripped" | sed -E 's#.*@([^:/]+).*#\1#')"
[ "$DB_HOST" = "127.0.0.1" ] || [ "$DB_HOST" = "localhost" ] || \
    warn "DATABASE_URL host is '$DB_HOST' (expected 127.0.0.1 for a local Postgres). Continuing anyway."
log "Parsed DB: user=$DB_USER db=$DB_NAME host=$DB_HOST"

# --- Detect package manager ------------------------------------------------
if command -v apt-get >/dev/null 2>&1; then PKG=apt
elif command -v dnf >/dev/null 2>&1; then PKG=dnf
else die "No supported package manager (apt/dnf) found."; fi
log "Package manager: $PKG"

# --- Verify chosen port is free --------------------------------------------
if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${LISTEN_PORT}\$"; then
    die "Port $LISTEN_PORT is already in use. Pick a free one:
       ss -ltn | awk '{print \$4}'    # lists ports in use
   then re-run with:  sudo LISTEN_PORT=<free_port> bash deploy/deploy.sh"
fi
log "Port $LISTEN_PORT is free."

# --- Install system dependencies -------------------------------------------
log "Installing system packages (python, nginx, postgres, node)..."
if [ "$PKG" = apt ]; then
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -y
    apt-get install -y python3 python3-venv python3-dev build-essential libpq-dev \
        nginx postgresql postgresql-contrib curl
    if ! command -v node >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    fi
else
    dnf install -y python3 python3-devel gcc gcc-c++ make libpq-devel \
        nginx postgresql-server postgresql-contrib curl
    if [ ! -d /var/lib/pgsql/data/base ]; then postgresql-setup --initdb || true; fi
    command -v node >/dev/null 2>&1 || dnf install -y nodejs
fi

systemctl enable --now postgresql

# --- Create database role + database (idempotent) --------------------------
log "Ensuring Postgres role and database exist..."
sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE ROLE \"$DB_USER\" LOGIN PASSWORD '$DB_PASS';"
sudo -u postgres psql -c "ALTER ROLE \"$DB_USER\" PASSWORD '$DB_PASS';"
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE \"$DB_NAME\" OWNER \"$DB_USER\";"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"$DB_NAME\" TO \"$DB_USER\";"

# --- Python venv + dependencies (as the app user) --------------------------
log "Creating venv and installing Python dependencies..."
sudo -u "$RUN_USER" python3 -m venv "$APP_DIR/.venv"
sudo -u "$RUN_USER" "$APP_DIR/.venv/bin/pip" install --upgrade pip
sudo -u "$RUN_USER" "$APP_DIR/.venv/bin/pip" install -r "$APP_DIR/requirements.txt"

# --- Database migrations ---------------------------------------------------
log "Running Alembic migrations..."
sudo -u "$RUN_USER" bash -c "cd '$APP_DIR' && set -a && source .env && set +a && \
    PYTHONPATH='$APP_DIR/src' '$APP_DIR/.venv/bin/alembic' upgrade head"

# --- Build the frontend ----------------------------------------------------
log "Building the React frontend..."
sudo -u "$RUN_USER" bash -c "cd '$APP_DIR/frontend' && (npm ci || npm install) && npm run build"
[ -f "$APP_DIR/frontend/dist/index.html" ] || die "Frontend build did not produce frontend/dist/index.html"

# --- Render & install systemd unit -----------------------------------------
log "Installing systemd service '$SERVICE_NAME'..."
sed -e "s#__APP_DIR__#$APP_DIR#g" -e "s#__RUN_USER__#$RUN_USER#g" \
    "$SCRIPT_DIR/ebike-api.service" > "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

# --- Render & install nginx site -------------------------------------------
log "Configuring nginx on port $LISTEN_PORT..."
if [ -d /etc/nginx/sites-available ]; then
    NGINX_SITE=/etc/nginx/sites-available/ebike
    sed -e "s#__LISTEN_PORT__#$LISTEN_PORT#g" -e "s#__APP_DIR__#$APP_DIR#g" \
        "$SCRIPT_DIR/nginx-ebike.conf" > "$NGINX_SITE"
    ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/ebike
    rm -f /etc/nginx/sites-enabled/default
else
    NGINX_SITE=/etc/nginx/conf.d/ebike.conf
    sed -e "s#__LISTEN_PORT__#$LISTEN_PORT#g" -e "s#__APP_DIR__#$APP_DIR#g" \
        "$SCRIPT_DIR/nginx-ebike.conf" > "$NGINX_SITE"
fi

# nginx (and SELinux on RHEL) must be able to read the app dir / proxy out.
chmod o+x "$APP_DIR" "$APP_DIR/frontend" 2>/dev/null || true
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" != "Disabled" ]; then
    setsebool -P httpd_can_network_connect 1 || warn "Could not set SELinux httpd_can_network_connect"
fi

nginx -t
systemctl enable nginx
systemctl restart nginx

# --- Done ------------------------------------------------------------------
SERVER_IP="$(hostname -I 2>/dev/null | awk '{print $1}')"
printf '\033[1;32m✔ Deployment complete.\033[0m\n'
cat <<EOF

  App URL:        http://${SERVER_IP:-<SERVER_IP>}:$LISTEN_PORT
  API service:    systemctl status $SERVICE_NAME
  API logs:       journalctl -u $SERVICE_NAME -f
  nginx logs:     journalctl -u nginx -f   (or /var/log/nginx/error.log)

  Open the firewall for the port if needed:
    (ufw)   sudo ufw allow $LISTEN_PORT/tcp
    (firewalld) sudo firewall-cmd --add-port=$LISTEN_PORT/tcp --permanent && sudo firewall-cmd --reload

  To redeploy after code changes:
    git pull && sudo LISTEN_PORT=$LISTEN_PORT bash deploy/deploy.sh
EOF
