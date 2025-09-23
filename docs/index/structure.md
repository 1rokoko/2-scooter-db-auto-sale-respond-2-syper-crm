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
