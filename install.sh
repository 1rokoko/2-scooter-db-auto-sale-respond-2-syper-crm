#!/usr/bin/env bash
set -Eeuo pipefail

LOG_FILE="${LOG_FILE:-$(pwd)/install.log}"
: > "$LOG_FILE"

log() {
  local level="${2:-INFO}"
  local timestamp
  timestamp="$(date '+%Y-%m-%d %H:%M:%S')"
  printf '[%s] [%s] %s\n' "$timestamp" "$level" "$1" | tee -a "$LOG_FILE"
}

log_heading() {
  log "------------------------------" "INFO"
  log "$1" "INFO"
  log "------------------------------" "INFO"
}

fail() {
  log "$1" "ERROR"
  exit ${2:-1}
}

error_handler() {
  local exit_code=$?
  local line=$1
  log "Installation failed at line ${line}. Check ${LOG_FILE} for details." "ERROR"
  exit $exit_code
}

trap 'error_handler $LINENO' ERR

usage() {
  cat <<'EOF'
install.sh [options]

Options:
  --force             Recreate containers even if they already exist
  --skip-deps         Skip dependency installation checks
  --reset-env         Regenerate .env with default values
  --no-browser        Do not attempt to open the browser at the end
  --help              Show this message
EOF
}
FORCE=false
SKIP_DEPS=false
RESET_ENV=false
NO_BROWSER=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=true
      shift
      ;;
    --skip-deps)
      SKIP_DEPS=true
      shift
      ;;
    --reset-env)
      RESET_ENV=true
      shift
      ;;
    --no-browser)
      NO_BROWSER=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done
OS_FAMILY=""
PKG_MANAGER=""
SUDO=""
APT_UPDATED=false

if [[ $EUID -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  fi
fi
detect_os() {
  local uname_out
  uname_out="$(uname -s 2>/dev/null | tr '[:upper:]' '[:lower:]')"
  case "$uname_out" in
    linux*)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        OS_FAMILY="wsl"
      else
        OS_FAMILY="linux"
      fi
      ;;
    darwin*)
      OS_FAMILY="mac"
      ;;
    msys*|mingw*|cygwin*)
      OS_FAMILY="windows"
      ;;
    *)
      OS_FAMILY="unknown"
      ;;
  esac
  log "Detected operating system: ${OS_FAMILY}"
}
detect_package_manager() {
  if command -v apt-get >/dev/null 2>&1; then
    PKG_MANAGER="apt"
  elif command -v apt >/dev/null 2>&1; then
    PKG_MANAGER="apt"
  elif command -v dnf >/dev/null 2>&1; then
    PKG_MANAGER="dnf"
  elif command -v yum >/dev/null 2>&1; then
    PKG_MANAGER="yum"
  elif command -v pacman >/dev/null 2>&1; then
    PKG_MANAGER="pacman"
  elif command -v zypper >/dev/null 2>&1; then
    PKG_MANAGER="zypper"
  elif command -v apk >/dev/null 2>&1; then
    PKG_MANAGER="apk"
  elif command -v brew >/dev/null 2>&1; then
    PKG_MANAGER="brew"
  elif command -v choco >/dev/null 2>&1; then
    PKG_MANAGER="choco"
  else
    PKG_MANAGER=""
  fi
  if [[ -n "$PKG_MANAGER" ]]; then
    log "Using package manager: $PKG_MANAGER"
  else
    log "No supported package manager detected" "WARN"
  fi
}
install_packages() {
  local packages=($@)
  if [[ -z "$PKG_MANAGER" ]]; then
    log "Cannot install ${packages[*]} automatically. Please install them manually." "WARN"
    return 1
  fi

  case "$PKG_MANAGER" in
    apt)
      if [[ "$APT_UPDATED" == false ]]; then
        $SUDO apt-get update -y >>"$LOG_FILE" 2>&1
        APT_UPDATED=true
      fi
      $SUDO apt-get install -y "${packages[@]}" >>"$LOG_FILE" 2>&1
      ;;
    dnf)
      $SUDO dnf install -y "${packages[@]}" >>"$LOG_FILE" 2>&1
      ;;
    yum)
      $SUDO yum install -y "${packages[@]}" >>"$LOG_FILE" 2>&1
      ;;
    pacman)
      $SUDO pacman -S --noconfirm "${packages[@]}" >>"$LOG_FILE" 2>&1
      ;;
    zypper)
      $SUDO zypper install -y "${packages[@]}" >>"$LOG_FILE" 2>&1
      ;;
    apk)
      $SUDO apk add --no-cache "${packages[@]}" >>"$LOG_FILE" 2>&1
      ;;
    brew)
      brew install "${packages[@]}" >>"$LOG_FILE" 2>&1
      ;;
    choco)
      choco install ${packages[*]} -y >>"$LOG_FILE" 2>&1
      ;;
    *)
      log "Unsupported package manager: $PKG_MANAGER" "WARN"
      return 1
      ;;
  esac
}
ensure_command() {
  local cmd=$1
  local pkg=${2:-$1}
  if command -v "$cmd" >/dev/null 2>&1; then
    log "$cmd already installed"
    return 0
  fi
  log "Installing dependency: $pkg"
  install_packages "$pkg" || fail "Could not install $pkg automatically."
}
ensure_docker() {
  if command -v docker >/dev/null 2>&1; then
    log "Docker already installed"
  else
    case "$OS_FAMILY" in
      linux|wsl)
        log "Installing Docker using the official convenience script"
        curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
        $SUDO sh /tmp/get-docker.sh >>"$LOG_FILE" 2>&1
        rm -f /tmp/get-docker.sh
        if command -v systemctl >/dev/null 2>&1; then
          $SUDO systemctl enable --now docker >>"$LOG_FILE" 2>&1 || true
        fi
        if [[ -n "$SUDO" ]]; then
          $SUDO usermod -aG docker "$USER" >>"$LOG_FILE" 2>&1 || true
        fi
        ;;
      mac)
        if command -v brew >/dev/null 2>&1; then
          brew install --cask docker >>"$LOG_FILE" 2>&1 || true
          log "Docker Desktop installed. Please launch it manually if it is not running."
        else
          fail "Install Docker Desktop from https://www.docker.com/products/docker-desktop and re-run the installer."
        fi
        ;;
      windows)
        fail "Please install Docker Desktop and run this script inside WSL or a Unix-like environment."
        ;;
      *)
        fail "Unsupported OS for automatic Docker installation."
        ;;
    esac
  fi

  if ! docker info >/dev/null 2>&1; then
    if [[ -n "$SUDO" ]]; then
      $SUDO docker info >/dev/null 2>&1 && alias docker="$SUDO docker"
    fi
  fi

  if ! docker info >/dev/null 2>&1; then
    fail "Docker daemon is not running or current user lacks permissions. Start Docker and retry."
  fi
}
DOCKER_BIN=(docker)
COMPOSE_BIN=()
set_docker_bin() {
  if "${DOCKER_BIN[@]}" info >/dev/null 2>&1; then
    return
  fi
  if [[ -n "$SUDO" ]]; then
    DOCKER_BIN=("$SUDO" docker)
  fi
  "${DOCKER_BIN[@]}" info >/dev/null 2>&1 || fail "Docker daemon is not accessible after installation."
}
ensure_docker_compose() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_BIN=(docker compose)
    log "Using docker compose plugin"
    return
  fi

  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_BIN=(docker-compose)
    log "Using docker-compose binary"
    return
  fi

  log "Docker Compose not found. Installing..."
  case "$OS_FAMILY" in
    linux|wsl)
      local compose_url
      compose_url="https://github.com/docker/compose/releases/download/v2.29.2/docker-compose-$(uname -s)-$(uname -m)"
      $SUDO curl -L "$compose_url" -o /usr/local/bin/docker-compose >>"$LOG_FILE" 2>&1
      $SUDO chmod +x /usr/local/bin/docker-compose
      COMPOSE_BIN=(docker-compose)
      ;;
    mac)
      if command -v brew >/dev/null 2>&1; then
        brew install docker-compose >>"$LOG_FILE" 2>&1 || true
        COMPOSE_BIN=(docker-compose)
      fi
      ;;
    *)
      fail "Please install Docker Compose manually."
      ;;
  esac

  if [[ ${#COMPOSE_BIN[@]} -eq 0 ]]; then
    fail "Docker Compose installation failed."
  fi
}
compose() {
  if [[ ${#COMPOSE_BIN[@]} -eq 0 ]]; then
    fail "Docker Compose command not configured."
  fi
  "${COMPOSE_BIN[@]}" "$@"
}
random_string() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 8
  else
    date +%s | sha256sum | head -c 16
  fi
}

ensure_env_file() {
  if [[ -f .env && "$RESET_ENV" == false ]]; then
    log ".env file found"
    return
  fi
  log "Creating default .env file"
  cat > .env <<EOF
PROJECT_NAME=motorcycle-rental-system
MYSQL_ROOT_PASSWORD=$(random_string)
MYSQL_DATABASE=motorcycle_marketplace
MYSQL_USER=motorcycle_user
MYSQL_PASSWORD=$(random_string)
WP_SITE_URL=http://localhost:8080
WP_TITLE=AI Motorcycle Marketplace
WP_ADMIN_USER=admin
WP_ADMIN_PASSWORD=$(random_string)
WP_ADMIN_EMAIL=admin@example.com
WEBHOOK_PORT=8090
WEBHOOK_BASE_URL=http://localhost:8090
OPENAI_API_KEY=sk-your-key
WHATSAPP_BUSINESS_NUMBER=0000000000
TELEGRAM_BOT_TOKEN=telegram-bot-token
CRM_DEFAULT_MANAGER_EMAIL=manager@example.com
SCHEDULER_CRON=*/15 * * * *
NODE_ENV=development
EOF
}
random_string() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 8
  elif command -v hexdump >/dev/null 2>&1; then
    hexdump -n 8 -e '"%02X"' /dev/urandom 2>/dev/null || date +%s
  else
    date +%s | md5sum | head -c 16 2>/dev/null || date +%s
  fi
}
ensure_directories() {
  local dirs=(
    "webhook"
    "webhook/src"
    "webhook/src/routes"
    "webhook/src/services"
    "webhook/src/utils"
    "webhook/tests"
    "docs"
    "docs/api"
    "docs/setup"
    "docs/screenshots"
    "nginx/conf.d"
    "seed/sql"
    "scheduler"
    "wordpress/plugins"
    "wordpress/themes"
    "wordpress/uploads"
    "scripts"
  )
  for dir in "${dirs[@]}"; do
    if [[ ! -d "$dir" ]]; then
      mkdir -p "$dir"
      log "Created directory $dir"
    fi
  done
}
ensure_healthcheck_script() {
  local script_path="scripts/system_healthcheck.sh"
  if [[ -f "$script_path" && "$FORCE" == false ]]; then
    return
  fi
  log "Writing healthcheck script to $script_path"
  cat > "$script_path" <<'EOS'
#!/usr/bin/env bash
set -euo pipefail

COMPOSE_CMD="docker compose"
if command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
fi

echo "[healthcheck] Checking WordPress availability..."
for attempt in {1..30}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/wp-json/)
  if [ "$status" = "200" ]; then
    echo "[healthcheck] WordPress API reachable"
    break
  fi
  if [ "$attempt" -eq 30 ]; then
    echo "[healthcheck] WordPress API did not respond with 200"
    exit 1
  fi
  sleep 5
done

echo "[healthcheck] Checking webhook health endpoint..."
status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8090/healthz)
if [ "$status" != "200" ]; then
  echo "[healthcheck] Webhook health endpoint returned $status"
  exit 1
fi

echo "[healthcheck] Checking database connectivity inside container..."
$COMPOSE_CMD exec -T mysql mysql -u"${MYSQL_USER:-motorcycle_user}" -p"${MYSQL_PASSWORD:-motorcycle_pass}" -e "USE ${MYSQL_DATABASE:-motorcycle_marketplace}; SHOW TABLES;" >/dev/null

echo "[healthcheck] All health checks passed"
EOS
  chmod +x "$script_path"
}
assert_required_assets() {
  local files=(
    "docker-compose.yml"
    "nginx/conf.d/default.conf"
    "webhook/Dockerfile"
    "webhook/package.json"
    "webhook/src/index.js"
    "webhook/src/routes/webhookRouter.js"
    "webhook/src/services/messageService.js"
    "webhook/src/services/openAiService.js"
    "webhook/src/services/database.js"
    "webhook/src/utils/logger.js"
    "seed/sql/01_init_tables.sql"
    "README.md"
  )
  for file in "${files[@]}"; do
    if [[ ! -f "$file" ]]; then
      fail "Required asset $file is missing. Make sure you are running the installer from the project root."
    fi
  done
}
bring_up_stack() {
  log_heading "Starting Docker stack"
  if [[ "$FORCE" == true ]]; then
    compose down --remove-orphans --volumes >/dev/null 2>&1 || true
  fi
  compose pull >>"$LOG_FILE" 2>&1 || true
  compose build webhook >>"$LOG_FILE" 2>&1
  compose up -d >>"$LOG_FILE" 2>&1
}
wait_for_url() {
  local url=$1
  local expected=${2:-200}
  local name=${3:-$url}
  for attempt in {1..60}; do
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$url" || true)
    if [[ "$status" == "$expected" ]]; then
      log "$name is reachable"
      return
    fi
    log "Waiting for $name (attempt $attempt, status $status)"
    sleep 5
  done
  fail "$name did not become ready in time"
}
wp_cli() {
  compose run --rm wpcli "$@" >>"$LOG_FILE" 2>&1
}
load_env() {
  if [[ -f .env ]]; then
    set -a
    # shellcheck disable=SC1091
    source .env
    set +a
  fi
}
ensure_wp_post() {
  local slug="$1"
  local title="$2"
  local content="$3"
  local existing
  existing=$(compose run --rm wpcli post list --name="$slug" --field=ID 2>/dev/null | tr -d '\r')
  if [[ -z "$existing" ]]; then
    log "Creating WordPress post: $title"
    wp_cli post create --post_type=post --post_status=publish --post_name="$slug" --post_title="$title" --post_content="$content"
  else
    log "WordPress post $title already exists"
  fi
}
bootstrap_wordpress() {
  log_heading "Configuring WordPress"
  if wp_cli core is-installed >/dev/null 2>&1; then
    log "WordPress already installed"
  else
    log "Installing WordPress core"
    wp_cli core install \
      --url="${WP_SITE_URL}" \
      --title="${WP_TITLE:-AI Motorcycle Marketplace}" \
      --admin_user="${WP_ADMIN_USER}" \
      --admin_password="${WP_ADMIN_PASSWORD}" \
      --admin_email="${WP_ADMIN_EMAIL}"
    wp_cli option update blogdescription "Premium AI-assisted motorcycle marketplace"
    wp_cli rewrite structure '/%postname%/' --hard
  fi

  wp_cli user get manager >/dev/null 2>&1 || wp_cli user create manager manager@example.com --role=editor --user_pass="$(random_string)"

  ensure_wp_post "yamaha-mt-07" "Yamaha MT-07 2024" "The Yamaha MT-07 2024 pairs agile handling with AI-assisted servicing and instant financing via the sales bot."

  ensure_wp_post "bmw-r1250gs" "BMW R1250GS Adventure" "Adventure flagship with adaptive suspension, panniers, and concierge support guided by AI workflows."

  ensure_wp_post "zero-srf" "Zero SR/F Premium" "Electric performance bike with rapid charging, telemetry dashboards, and proactive AI followups."
}
seed_mysql() {
  log_heading "Ensuring database schema"
  local mysql_cmd=(mysql -u"${MYSQL_USER}" -p"${MYSQL_PASSWORD}" "${MYSQL_DATABASE}")
  cat seed/sql/01_init_tables.sql | compose exec -T mysql "${mysql_cmd[@]}" >>"$LOG_FILE" 2>&1
  cat seed/sql/02_seed_data.sql | compose exec -T mysql "${mysql_cmd[@]}" >>"$LOG_FILE" 2>&1 || true
}
run_health_checks() {
  ensure_healthcheck_script
  bash scripts/system_healthcheck.sh
}
open_browser() {
  local url="${WP_SITE_URL:-http://localhost:8080}"
  if [[ "$NO_BROWSER" == true ]]; then
    log "Skipping browser launch (--no-browser)"
    return
  fi
  case "$OS_FAMILY" in
    mac)
      open "$url" >/dev/null 2>&1 || true
      ;;
    linux|wsl)
      if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" >/dev/null 2>&1 || true
      fi
      ;;
    windows)
      powershell.exe Start-Process "$url" >/dev/null 2>&1 || true
      ;;
    *)
      log "Open $url in your browser to verify the installation"
      ;;
  esac
}
main() {
  log_heading "AI Motorcycle Marketplace Auto Installer"
  detect_os
  detect_package_manager

  if [[ "$SKIP_DEPS" == false ]]; then
    ensure_command curl
    ensure_command git
    ensure_docker
    set_docker_bin
    ensure_docker_compose
  else
    log "Skipping dependency installation"
    ensure_docker_compose
  fi

  set_docker_bin
  ensure_env_file
  load_env
  ensure_directories
  assert_required_assets

  bring_up_stack

  wait_for_url "http://localhost:8080/wp-login.php" 200 "WordPress"
  wait_for_url "http://localhost:8090/healthz" 200 "Webhook"

  bootstrap_wordpress
  seed_mysql
  run_health_checks
  open_browser

  log_heading "Installation complete"
  log "WordPress admin: ${WP_SITE_URL:-http://localhost:8080}/wp-admin"
  log "phpMyAdmin: http://localhost:8081"
  log "Webhook API health: http://localhost:8090/healthz"
  log "Log file: $LOG_FILE"
}

main "$@"

