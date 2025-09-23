#!/bin/bash

# Code Indexing Script for Motorcycle Marketplace
# Generates tags, documentation, and architecture maps

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="$PROJECT_ROOT/docs"
INDEX_DIR="$DOCS_DIR/index"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

# Create index directory
mkdir -p "$INDEX_DIR"

log "Starting code indexing for motorcycle marketplace..."

# 1. Generate ctags for symbol navigation
if command -v ctags >/dev/null 2>&1; then
  log "Generating ctags..."
  cd "$PROJECT_ROOT"
  ctags -R \
    --exclude=node_modules \
    --exclude=.git \
    --exclude=vendor \
    --exclude=wordpress/uploads \
    --languages=JavaScript,SQL,PHP,Dockerfile \
    --fields=+iaS \
    --extra=+q \
    -f "$INDEX_DIR/tags" \
    .
  log "✓ Tags generated: $INDEX_DIR/tags"
else
  log "⚠ ctags not found, skipping symbol indexing"
fi

# 2. Generate file structure map
log "Generating project structure..."
cat > "$INDEX_DIR/structure.md" << 'EOF'
# Project Structure

## Core Services
```
webhook/          - Node.js API service
├── src/
│   ├── routes/   - Express routes
│   ├── services/ - Business logic
│   └── utils/    - Utilities
scheduler/        - Background job processor
nginx/           - Reverse proxy config
seed/sql/        - Database schema & seed data
```

## WordPress Integration
```
wordpress/
├── plugins/     - Custom WP plugins
├── themes/      - Custom themes
└── uploads/     - Media files
```

## Infrastructure
```
docker-compose.yml - Container orchestration
install.sh        - Setup automation
scripts/          - Development tools
docs/            - Documentation
```
EOF

# 3. Generate API endpoints map
log "Scanning API endpoints..."
cat > "$INDEX_DIR/api-map.md" << 'EOF'
# API Endpoints Map

## Webhook Service (Port 8090)

### Health & Status
- `GET /healthz` - Service health check
- `GET /webhook/healthz` - Webhook router health

### Messaging
- `POST /webhook/whatsapp` - WhatsApp message handler
- `POST /webhook/telegram` - Telegram message handler

### CRM & Deals
- `GET /webhook/deals/hot` - Hot deals for CRM

### Missing Endpoints (TODO)
- `GET /webhook/variants` - A/B testing copy variants (ROADMAP)

## WordPress (Port 8080)
- Standard WordPress endpoints
- Custom CRM dashboard (TODO - ROADMAP)

## Database (Port 3307)
- MySQL 8.4 with motorcycle marketplace schema
- phpMyAdmin available on port 8081
EOF

# 4. Generate database schema documentation
log "Documenting database schema..."
cat > "$INDEX_DIR/database-schema.md" << 'EOF'
# Database Schema

## Core Tables

### motorcycles
- `id` - Primary key
- `title` - Motorcycle name
- `description` - Details
- `price`, `currency` - Pricing
- `availability` - Status (available/reserved/sold)
- `location` - Geographic location
- `media` - JSON array of images

### clients
- `id` - Primary key
- `full_name`, `phone`, `email` - Contact info
- `channel` - Source (whatsapp/telegram/website/manual)
- `status` - Lead status (new/engaged/hot/won/lost)
- `metadata` - JSON for custom data

### conversations
- `id` - Primary key
- `client_id` - Foreign key to clients
- `source` - Channel (whatsapp/telegram/webhook)
- `direction` - inbound/outbound
- `message` - Message content
- `ai_confidence` - AI response confidence score

### deals
- `id` - Primary key
- `client_id` - Foreign key to clients
- `motorcycle_id` - Foreign key to motorcycles (nullable)
- `stage` - Deal stage (research/negotiation/invoice/won/lost)
- `amount`, `currency` - Deal value
- `expected_close` - Target close date
- `notes` - Deal notes

### reminders
- `id` - Primary key
- `deal_id` - Foreign key to deals
- `remind_at` - When to send reminder
- `channel` - Delivery method (whatsapp/telegram/email)
- `payload` - JSON reminder data
- `sent` - Boolean flag
EOF

# 5. Generate dependency map
log "Analyzing dependencies..."
if [ -f "$PROJECT_ROOT/webhook/package.json" ]; then
  cat > "$INDEX_DIR/dependencies.md" << 'EOF'
# Dependencies Analysis

## Webhook Service Dependencies

### Production
- `express` - Web framework
- `helmet` - Security middleware
- `mysql2` - MySQL driver
- `openai` - OpenAI API client
- `pino` - Logging
- `axios` - HTTP client
- `dotenv` - Environment variables

### Development
- `jest` - Testing framework
- `eslint` - Code linting
- `nodemon` - Development server

## Docker Services
- `mysql:8.4` - Database
- `wordpress:6.6.2-apache` - CMS
- `nginx:1.27-alpine` - Reverse proxy
- `phpmyadmin:5.2` - Database admin
- `node:20-alpine` - Scheduler runtime
EOF
fi

# 6. Generate search index for ripgrep
if command -v rg >/dev/null 2>&1; then
  log "Creating search patterns..."
  cat > "$INDEX_DIR/search-patterns.txt" << 'EOF'
# Common search patterns for ripgrep

# Find API endpoints
router\.(get|post|put|delete|patch)

# Find database queries
(SELECT|INSERT|UPDATE|DELETE).*FROM

# Find OpenAI integrations
openai|generateResponse

# Find TODO/FIXME comments
(TODO|FIXME|XXX|HACK)

# Find environment variables
process\.env\.|getenv

# Find error handling
catch|throw|Error

# Find logging
logger\.|console\.(log|error|warn)

# Find configuration
config\.|\.env

# Usage: rg -f docs/index/search-patterns.txt
EOF
  log "✓ Search patterns created"
fi

# 7. Generate quick reference
cat > "$INDEX_DIR/quick-reference.md" << 'EOF'
# Quick Reference

## Development Commands
```bash
# Start the stack
./install.sh

# Stop services
./stop.sh

# Restart services
./restart.sh

# Run webhook tests
cd webhook && npm test

# View logs
docker compose logs webhook
docker compose logs mysql
```

## Useful URLs
- WordPress: http://localhost:8080
- phpMyAdmin: http://localhost:8081
- Webhook API: http://localhost:8090/healthz
- Hot deals: http://localhost:8090/webhook/deals/hot

## Database Access
```bash
# Connect to MySQL
docker exec -it rental_mysql mysql -u motorcycle_user -p motorcycle_marketplace

# View tables
SHOW TABLES;
DESCRIBE motorcycles;
```

## Code Navigation
```bash
# Search for patterns
rg -f docs/index/search-patterns.txt

# Find symbols (if ctags installed)
# Use your editor's tag navigation (Ctrl+] in vim)
```
EOF

log "✓ Code indexing complete!"
log "Generated files:"
log "  - $INDEX_DIR/tags (ctags symbols)"
log "  - $INDEX_DIR/structure.md (project structure)"
log "  - $INDEX_DIR/api-map.md (API endpoints)"
log "  - $INDEX_DIR/database-schema.md (DB schema)"
log "  - $INDEX_DIR/dependencies.md (package analysis)"
log "  - $INDEX_DIR/search-patterns.txt (ripgrep patterns)"
log "  - $INDEX_DIR/quick-reference.md (dev guide)"
log ""
log "Usage:"
log "  - Use 'rg -f docs/index/search-patterns.txt' for pattern search"
log "  - Configure your editor to use docs/index/tags for symbol navigation"
log "  - Refer to docs/index/ for project documentation"
