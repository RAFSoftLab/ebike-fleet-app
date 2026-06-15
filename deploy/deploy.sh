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
    # Tolerate pre-existing broken third-party repos on shared hosts (e.g. a
    # dead RabbitMQ/cloudsmith source). The official Ubuntu repos we need still
    # refresh, and apt-get install works off whatever lists are available.
    apt-get update -y || warn "apt-get update had errors (likely unrelated third-party repos) — continuing."
    apt-get install -y python3 python3-venv python3-dev build-essential libpq-dev \
        nginx postgresql postgresql-contrib curl ca-certificates
    # Node 18+ is needed to BUILD the frontend. If a prebuilt frontend/dist is
    # already committed, we don't need Node at all — skip the install entirely
    # (useful on locked-down hosts with broken repos / no recent Node).
    NODE_OK=0
    if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
        NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
        [ "${NODE_MAJOR:-0}" -ge 18 ] && NODE_OK=1 && log "Reusing existing Node $(node -v)."
    fi
    if [ "$NODE_OK" -ne 1 ] && [ ! -f "$APP_DIR/frontend/dist/index.html" ]; then
        log "Installing Node.js 20 via NodeSource..."
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash - || warn "NodeSource setup reported errors."
        apt-get install -y nodejs || warn "Could not install nodejs from NodeSource."
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
# --retries/--timeout make pip resilient on slow or flaky connections.
PIP_NET="--retries 10 --timeout 120"
sudo -u "$RUN_USER" "$APP_DIR/.venv/bin/pip" install $PIP_NET --upgrade pip
sudo -u "$RUN_USER" "$APP_DIR/.venv/bin/pip" install $PIP_NET -r "$APP_DIR/requirements.txt"

# --- Database migrations ---------------------------------------------------
log "Running Alembic migrations..."
sudo -u "$RUN_USER" bash -c "cd '$APP_DIR' && set -a && source .env && set +a && \
    PYTHONPATH='$APP_DIR/src' '$APP_DIR/.venv/bin/alembic' upgrade head"

# --- Build the frontend (or use a committed prebuilt dist) ------------------
# Prefer building from source when a usable Node 18+/npm is present. Otherwise
# fall back to a prebuilt frontend/dist shipped in the repo (built elsewhere).
CAN_BUILD=0
if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
    NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    [ "${NODE_MAJOR:-0}" -ge 18 ] && CAN_BUILD=1
fi
if [ "$CAN_BUILD" -eq 1 ]; then
    log "Building the React frontend with $(node -v)..."
    sudo -u "$RUN_USER" bash -c "cd '$APP_DIR/frontend' && (npm ci || npm install) && npm run build"
elif [ -f "$APP_DIR/frontend/dist/index.html" ]; then
    log "No Node 18+/npm on this host — using the prebuilt frontend/dist from the repo."
else
    die "Cannot build the frontend: no Node 18+/npm available and no prebuilt frontend/dist found.
   Either install Node 18+ and re-run, or build 'frontend/dist' on another machine,
   copy it to $APP_DIR/frontend/dist, and re-run."
fi
[ -f "$APP_DIR/frontend/dist/index.html" ] || die "frontend/dist/index.html is missing after the build step."

# --- Publish the SPA to a system web root ----------------------------------
# nginx (www-data) cannot traverse into /home/<user>, so serving the build
# straight from the repo fails with "Permission denied". Copy it to a
# root-owned, world-readable web root instead.
WEBROOT=/var/www/ebike
log "Publishing frontend to $WEBROOT ..."
rm -rf "$WEBROOT"
mkdir -p "$WEBROOT"
cp -r "$APP_DIR/frontend/dist/." "$WEBROOT/"
chmod -R a+rX "$WEBROOT"

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
    sed -e "s#__LISTEN_PORT__#$LISTEN_PORT#g" -e "s#__WEBROOT__#$WEBROOT#g" \
        "$SCRIPT_DIR/nginx-ebike.conf" > "$NGINX_SITE"
    ln -sf "$NGINX_SITE" /etc/nginx/sites-enabled/ebike
    # Disable nginx's stock default site: it binds :80, which is often already
    # taken (e.g. by Apache) and would stop nginx from starting. This only
    # removes the symlink; the file stays in sites-available (reversible).
    rm -f /etc/nginx/sites-enabled/default
else
    NGINX_SITE=/etc/nginx/conf.d/ebike.conf
    sed -e "s#__LISTEN_PORT__#$LISTEN_PORT#g" -e "s#__WEBROOT__#$WEBROOT#g" \
        "$SCRIPT_DIR/nginx-ebike.conf" > "$NGINX_SITE"
fi

# On RHEL/SELinux, allow nginx to reverse-proxy to the backend.
if command -v getenforce >/dev/null 2>&1 && [ "$(getenforce)" != "Disabled" ]; then
    setsebool -P httpd_can_network_connect 1 || warn "Could not set SELinux httpd_can_network_connect"
fi

# Validate config, then start gently. A hard `restart` is avoided so we don't
# disrupt any other web server already running on this shared host.
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
if systemctl is-active --quiet nginx; then
    log "nginx already running — reloading to pick up the new site."
    systemctl reload nginx
else
    log "Starting nginx..."
    systemctl start nginx
fi

# Confirm our port actually came up (catches a port clash or a bind failure).
sleep 1
if ss -ltn | awk '{print $4}' | grep -qE "[:.]${LISTEN_PORT}\$"; then
    log "nginx is listening on port $LISTEN_PORT."
else
    warn "nginx does NOT appear to be listening on $LISTEN_PORT. Check: journalctl -u nginx -e"
fi

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
