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

## GET /webhook/variants
Generate A/B testing copy variants for sales messages.

### Query Parameters
- `prompt` (string, required) - The base message or context for variant generation
- `model` (string, optional) - Motorcycle model for context
- `budget` (string, optional) - Customer budget for context
- `count` (integer, optional) - Number of variants to generate (1-5, default: 3)

### Example Request
```
GET /webhook/variants?prompt=interested%20in%20motorcycle&model=Yamaha%20MT-07&count=3
```

### Example Response
```json
{
  "success": true,
  "prompt": "interested in motorcycle",
  "context": {
    "model": "Yamaha MT-07",
    "budget": "not specified",
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "variants": [
    {
      "variant": "professional",
      "message": "Thank you for your interest! Our Yamaha MT-07 offers exceptional value...",
      "tone": "professional",
      "confidence": 0.9
    },
    {
      "variant": "friendly",
      "message": "Hey there! 🏍️ Excited about our Yamaha MT-07? Let's get you on the road!",
      "tone": "friendly",
      "confidence": 0.9
    },
    {
      "variant": "urgent",
      "message": "Limited time offer on our Yamaha MT-07! Don't miss out...",
      "tone": "urgent",
      "confidence": 0.9
    }
  ],
  "generated_at": "2024-01-15T10:30:00.000Z",
  "source": "template"
}
```

### Error Response
```json
{
  "error": "prompt parameter is required",
  "example": "/webhook/variants?prompt=interested in motorcycle&model=Yamaha MT-07&count=3"
}
```

## POST /webhook/motorcycle/sync
Sync motorcycle data from WordPress to the database.

### Request Body
```json
{
  "title": "Yamaha MT-07",
  "wp_post_id": 123,
  "description": "Great bike for beginners",
  "price": 7500,
  "currency": "USD",
  "availability": "available",
  "location": "San Francisco, CA",
  "featured_image": "https://example.com/image.jpg"
}
```

### Response
```json
{
  "success": true,
  "motorcycle_id": 456
}
```

## PUT /webhook/reminders/:id/mark-sent
Mark a reminder as sent.

### Response
```json
{
  "success": true,
  "message": "Reminder marked as sent"
}
```

## POST /webhook/messages/send
Send a manual message to a client.

### Request Body
```json
{
  "dealId": 123,
  "message": "Hello! How can I help you today?",
  "channel": "whatsapp",
  "clientPhone": "+1234567890"
}
```

### Response
```json
{
  "success": true,
  "message_id": "msg_1234567890"
}
```

## GET /webhook/analytics
Get analytics data for the specified period.

### Query Parameters
- `period` (string, optional) - Time period: 7d, 30d, 90d (default: 30d)
- `metrics` (string, optional) - Metrics to include: all, deals, conversations, channels, timeline (default: all)

### Example Response
```json
{
  "success": true,
  "period": "30d",
  "data": {
    "deals": {
      "total_deals": 25,
      "won_deals": 8,
      "conversion_rate": "32.00"
    },
    "conversations": {
      "total_conversations": 150,
      "unique_clients": 45
    },
    "channels": [
      {
        "source": "whatsapp",
        "message_count": 100,
        "unique_clients": 30
      }
    ]
  }
}
```

## GET /metrics
Get detailed service metrics and performance data.

### Response
```json
{
  "uptime": {
    "seconds": 3600,
    "formatted": "0d 1h 0m 0s"
  },
  "requests": {
    "total": 1250,
    "success": 1200,
    "errors": 50,
    "successRate": "96.00%",
    "avgResponseTime": 145.5
  },
  "ai": {
    "requests": 200,
    "successes": 190,
    "avgConfidence": 0.85,
    "successRate": "95.00%"
  },
  "cache": {
    "hits": 500,
    "misses": 100,
    "hitRate": "83.33%"
  }
}
```

## GET /health
Comprehensive health check with detailed status of all services.

### Response
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "checks": {
    "database": {
      "status": "ok",
      "message": "Connected"
    },
    "openai": {
      "status": "ok",
      "message": "Configured"
    },
    "cache": {
      "status": "ok",
      "total": 25,
      "active": 20
    }
  },
  "metrics": {
    "requests": { "total": 1250 },
    "memory": { "heapUsed": "45MB" }
  }
}
```

## GET /healthz
Simple health probe for the webhook service.
