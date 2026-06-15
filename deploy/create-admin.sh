#!/usr/bin/env bash
# ===========================================================================
# Create a user for the eBike Fleet app (and make them admin if possible).
#
# Note: the backend automatically promotes the FIRST registered user to admin.
# So on a fresh database, just run this once and you get your admin account.
# On a database that already has an admin, this creates a normal 'driver' user
# (promote them later via the admin UI or PUT /auth/users/by-email/{email}/role).
#
# Usage (interactive — prompts for anything not given):
#     bash deploy/create-admin.sh
#
# Non-interactive:
#     bash deploy/create-admin.sh <username> <email> <password>
#   or via env:
#     ADMIN_USERNAME=admin ADMIN_EMAIL=a@b.com ADMIN_PASSWORD=secret \
#       bash deploy/create-admin.sh
#
# Target API (default talks to the local backend):
#     BASE_URL=http://127.0.0.1:8000   # default
# ===========================================================================
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:8000}"

USERNAME="${1:-${ADMIN_USERNAME:-}}"
EMAIL="${2:-${ADMIN_EMAIL:-}}"
PASSWORD="${3:-${ADMIN_PASSWORD:-}}"

command -v python3 >/dev/null 2>&1 || { echo "python3 is required (for JSON handling)." >&2; exit 1; }
command -v curl    >/dev/null 2>&1 || { echo "curl is required." >&2; exit 1; }

# Prompt for anything missing.
[ -n "$USERNAME" ] || read -rp "Username: " USERNAME
[ -n "$EMAIL" ]    || read -rp "Email: " EMAIL
if [ -z "$PASSWORD" ]; then read -rsp "Password: " PASSWORD; echo; fi
[ -n "$USERNAME" ] && [ -n "$EMAIL" ] && [ -n "$PASSWORD" ] || {
    echo "username, email, and password are all required." >&2; exit 1; }

# Build JSON safely (handles special characters in the password) and read fields.
mkjson() { python3 -c 'import json,sys; print(json.dumps(dict(a.split("=",1) for a in sys.argv[1:])))' "$@"; }
field()  { python3 -c 'import json,sys; print((json.load(sys.stdin) or {}).get(sys.argv[1],""))' "$1" 2>/dev/null || true; }

echo "==> Registering '$USERNAME' <$EMAIL> at $BASE_URL ..."
REG="$(curl -s -X POST "$BASE_URL/auth/register" -H 'Content-Type: application/json' \
        -d "$(mkjson "username=$USERNAME" "email=$EMAIL" "password=$PASSWORD")")"
if [ -n "$(printf '%s' "$REG" | field id)" ]; then
    echo "    created user id $(printf '%s' "$REG" | field id)"
else
    echo "    note: $REG  (continuing — user may already exist)"
fi

echo "==> Logging in ..."
TOKEN="$(curl -s -X POST "$BASE_URL/auth/login" -H 'Content-Type: application/json' \
          -d "$(mkjson "identifier=$USERNAME" "password=$PASSWORD")" | field access_token)"
[ -n "$TOKEN" ] || { echo "Login failed — check the password / that the API is up at $BASE_URL." >&2; exit 1; }

# Best-effort promotion (no-op if an admin already exists; first user is auto-admin anyway).
BOOT="$(curl -s -X POST "$BASE_URL/auth/bootstrap-admin" -H "Authorization: Bearer $TOKEN")"

ROLE="$(curl -s "$BASE_URL/auth/me/profile" -H "Authorization: Bearer $TOKEN" | field role)"
echo "==> Done. '$USERNAME' role: ${ROLE:-unknown}"
case "$ROLE" in
    admin) echo "    ✔ This account is an administrator." ;;
    "")    echo "    (could not read role; check $BASE_URL/auth/me/profile manually)" ;;
    *)     echo "    This account is '$ROLE'. An admin already existed, so it was not promoted."
           echo "    Promote later as an admin:  PUT $BASE_URL/auth/users/by-email/$EMAIL/role  {\"role\":\"admin\"}" ;;
esac
