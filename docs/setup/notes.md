# Setup Notes

- Ensure Docker Desktop is running on macOS/Windows before executing `install.sh`.
- Update `.env` with production credentials before deploying.
- For custom domains, adjust `nginx/conf.d/default.conf` and `WP_SITE_URL`.
- Use `stop.sh` and `restart.sh` to manage the Docker stack locally.
