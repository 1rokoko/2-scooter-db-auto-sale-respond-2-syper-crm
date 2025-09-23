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
