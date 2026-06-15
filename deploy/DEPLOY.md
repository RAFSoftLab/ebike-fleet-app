# Deployment — bare-metal server (native, no Docker)

This deploys the eBike Fleet app to a single Linux server as native services:

| Component | How it runs | Exposure |
|-----------|-------------|----------|
| Postgres  | system `postgresql` service | localhost only |
| FastAPI backend | gunicorn + uvicorn workers, `systemd` unit `ebike-api` | `127.0.0.1:8000` (internal) |
| React frontend | static build (`frontend/dist`) served by **nginx** | **one public port you choose** |

The SPA calls `/api/*`, which nginx strips to `/` and proxies to the backend — same origin, so **no CORS and no rebuild when the port changes**.

```
http://SERVER_IP:PORT  ──nginx──┬──  /        → frontend/dist (SPA)
                                └──  /api/...  → 127.0.0.1:8000  → Postgres
```

## Prerequisites
- A Linux server (Ubuntu/Debian or RHEL/Fedora) with `sudo`.
- A free TCP port for nginx (faculty server — 80/443 are likely taken).

## Steps

```bash
# 1. Clone into whatever directory you want (it becomes the app dir automatically)
git clone <repo-url> ebike_fleet_app
cd ebike_fleet_app

# 2. Create the production env file and fill in REAL secrets
cp deploy/.env.production.example .env
nano .env
#   - set a strong DB password in DATABASE_URL
#   - JWT_SECRET:  openssl rand -hex 32
#   (DATABASE_URL host should stay 127.0.0.1)

# 3. Find a free port (pick one not listed here, e.g. 8080)
ss -ltn | awk '{print $4}'

# 4. Run the installer (substitute your free port)
sudo LISTEN_PORT=8080 bash deploy/deploy.sh

# 5. If a firewall is active, open the port
sudo ufw allow 8080/tcp                 # Ubuntu/Debian (ufw)
# or
sudo firewall-cmd --add-port=8080/tcp --permanent && sudo firewall-cmd --reload   # RHEL
```

Then open `http://SERVER_IP:8080`.

## What the installer does
1. Parses `DATABASE_URL` from `.env` (single source of truth for DB creds).
2. Installs system packages: python venv toolchain, libpq, nginx, postgresql, node 20.
3. Creates the Postgres role + database (idempotent).
4. Creates the Python venv, installs `requirements.txt`.
5. Runs `alembic upgrade head` (creates the schema).
6. Obtains the built frontend: builds it locally if Node 18+ is present, otherwise
   **downloads the CI-built artifact** from the `frontend-latest` GitHub release.
7. Publishes the SPA to `/var/www/ebike` (a web root nginx can read — serving from a
   home directory fails because nginx can't traverse into `/home/<user>`).
8. Installs + starts the `ebike-api` systemd unit (gunicorn on `127.0.0.1:8000`).
9. Renders the nginx site on your chosen port and reloads nginx.

The script is **re-runnable** — run it again after `git pull` to redeploy.

## Frontend builds (CI)
The React SPA is built by GitHub Actions (`.github/workflows/frontend-build.yml`), not
on the server (which has an old Node and can't build). On every push that touches
`frontend/**`, CI builds it and publishes `frontend-dist.tar.gz` to a rolling
`frontend-latest` release. `deploy.sh` downloads that asset. The server only needs
**outbound** internet — CI never connects to the VPN-only server.

To ship a frontend change: push to `main` → wait for the **Build Frontend** action to
finish → on the server `git pull && sudo LISTEN_PORT=8080 bash deploy/deploy.sh`
(re-running re-downloads the latest artifact). Backend-only changes don't need CI.

## Operating it

```bash
# Backend status / logs
systemctl status ebike-api
journalctl -u ebike-api -f

# Restart after a config change
sudo systemctl restart ebike-api

# nginx
sudo nginx -t && sudo systemctl reload nginx
journalctl -u nginx -f

# Redeploy after code changes
git pull && sudo LISTEN_PORT=8080 bash deploy/deploy.sh
```

## Troubleshooting
- **502 Bad Gateway** → backend isn't up: `journalctl -u ebike-api -e` (usually a bad `DATABASE_URL` or missing env var).
- **Can't reach the site from outside** → firewall: open the port (see step 5); also confirm the faculty network allows that port inbound.
- **DB auth fails** → the password in `.env` must match the role; the installer runs `ALTER ROLE ... PASSWORD` each time so re-running fixes drift.
- **Frontend 404 on refresh of a sub-route** → nginx `try_files ... /index.html` handles this; make sure the site config installed (`/etc/nginx/sites-enabled/ebike` or `/etc/nginx/conf.d/ebike.conf`).
- **SELinux (RHEL) 502** → the installer sets `httpd_can_network_connect`; verify with `getsebool httpd_can_network_connect`.

## Adding a domain + HTTPS later
When you get a domain pointed at the server and port 443 is available, switch the
nginx `listen` to `443 ssl`, add a `server_name your.domain`, and run
`sudo certbot --nginx` (install `certbot python3-certbot-nginx`). The app itself
needs no changes because it uses relative `/api` URLs.
