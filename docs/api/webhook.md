# Webhook API

## POST /webhook/whatsapp
Handle inbound WhatsApp messages and returns an AI-generated response.

### Payload
- `phone` (string, required)
- `message` (string, required)
- `name` (string, optional)

## POST /webhook/telegram
Handle inbound Telegram updates.

### Payload
- `chatId` (string, required)
- `text` (string, required)
- `username` (string, optional)

## GET /webhook/deals/hot
Returns deals that are in negotiation or invoice stage.

## GET /healthz
Health probe for the webhook service.
