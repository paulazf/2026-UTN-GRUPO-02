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
    if command -v powershell.exe >/dev/null 2>&1; then
      windows_ip=$(powershell.exe -NoProfile -Command "\$configuration = Get-NetIPConfiguration | Where-Object { \$_.IPv4DefaultGateway -ne \$null -and \$_.IPv4Address -ne \$null } | Select-Object -First 1; \$configuration.IPv4Address.IPAddress" 2>/dev/null | tr -d '\r' || true)

      if [ -n "$windows_ip" ]; then
        printf '%s\n' "$windows_ip"
        return 0
      fi
    fi

    ipconfig.exe | awk '/IPv4 Address|Direcci.n IPv4/ {print $NF}' | tr -d '\r' | tail -n 1
  elif [ "$(uname -s)" = "Darwin" ]; then
    ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null
  elif command -v ip >/dev/null 2>&1; then
    ip route get 1.1.1.1 2>/dev/null | awk '{for (field = 1; field <= NF; field++) if ($field == "src") {print $(field + 1); exit}}'
  elif command -v hostname >/dev/null 2>&1; then
    hostname -I 2>/dev/null | awk '{print $1}'
  else
    return 1
  fi
}

HOST_IP=${EXPO_HOST_IP:-$(detect_host_ip)}

if [ -z "$HOST_IP" ] || [ "$HOST_IP" = "127.0.0.1" ]; then
  echo "Error: no se pudo detectar una IP LAN utilizable."
  echo "Definila manualmente y volve a ejecutar, por ejemplo:"
  echo "EXPO_HOST_IP=192.168.1.25 ./scripts/dev.sh"
  exit 1
fi

API_URL=${EXPO_PUBLIC_API_URL:-http://${HOST_IP}:8000}

cat > Frontend/.env.local <<EOF
EXPO_PUBLIC_API_URL=${API_URL}
REACT_NATIVE_PACKAGER_HOSTNAME=${HOST_IP}
EOF

echo "Expo Go usara la API: ${API_URL}"
echo "Metro se anunciara en: ${HOST_IP}"
echo "Abrir Expo Go con: exp://${HOST_IP}:8081"

docker compose up --build "$@"