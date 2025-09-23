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

### A/B Testing
- `GET /webhook/variants` - A/B testing copy variants ✅ IMPLEMENTED

## WordPress (Port 8080)
- Standard WordPress endpoints
- Custom motorcycle post type ✅ IMPLEMENTED
- CRM dashboard ✅ IMPLEMENTED
- AI-powered content generation ✅ IMPLEMENTED

## Database (Port 3307)
- MySQL 8.4 with motorcycle marketplace schema
- phpMyAdmin available on port 8081
