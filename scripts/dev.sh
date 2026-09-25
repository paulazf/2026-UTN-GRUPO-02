#!/bin/sh

set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)
cd "$ROOT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "Error: Docker no esta instalado o no esta en PATH."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Error: Docker Desktop no esta disponible."
  exit 1
fi

detect_host_ip() {
  if command -v ipconfig.exe >/dev/null 2>&1; then
    ipconfig.exe | awk '/IPv4 Address|Direcci.n IPv4/ {print $NF}' | tr -d '\r' | tail -n 1
  else
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1"
  fi
}

HOST_IP=${EXPO_HOST_IP:-$(detect_host_ip)}
API_URL=${EXPO_PUBLIC_API_URL:-http://${HOST_IP}:8000}

cat > Frontend/.env.local <<EOF
EXPO_PUBLIC_API_URL=${API_URL}
REACT_NATIVE_PACKAGER_HOSTNAME=${HOST_IP}
EOF

echo "Expo Go usara la API: ${API_URL}"
echo "Metro se anunciara en: ${HOST_IP}"
echo "Abrir Expo Go con: exp://${HOST_IP}:8081"

docker compose up --build "$@"