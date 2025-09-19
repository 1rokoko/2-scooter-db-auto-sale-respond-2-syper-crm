#!/usr/bin/env bash
set -euo pipefail

COMPOSE="docker compose"
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

$COMPOSE down
$COMPOSE up -d --build
