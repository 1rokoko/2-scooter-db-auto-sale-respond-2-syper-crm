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
