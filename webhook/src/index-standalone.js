import express from 'express';
import helmet from 'helmet';
import config from './config.js';
import logger from './utils/logger.js';
import { 
  generalRateLimit,
  securityHeaders,
  requestLogger,
  errorHandler
} from './middleware/security.js';
import { metricsMiddleware, monitoringRoutes, healthCheck } from './services/monitoring.js';

const app = express();

// Security and middleware setup
app.use(helmet());
app.use(securityHeaders);
app.use(requestLogger);
app.use(metricsMiddleware);
app.use(generalRateLimit);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Mock webhook routes for testing
app.get('/webhook/variants', (req, res) => {
  const { prompt, model, count = 3 } = req.query;
  
  if (!prompt) {
    return res.status(400).json({ 
      error: 'prompt parameter is required',
      example: '/webhook/variants?prompt=interested in motorcycle&model=Yamaha MT-07&count=3'
    });
  }

  // Mock response
  const variants = [];
  for (let i = 0; i < Math.min(parseInt(count), 5); i++) {
    variants.push({
      variant: ['professional', 'friendly', 'urgent', 'casual', 'enthusiastic'][i],
      message: `${prompt} - ${model || 'motorcycle'} variant ${i + 1}`,
      tone: ['professional', 'friendly', 'urgent', 'casual', 'enthusiastic'][i],
      confidence: 0.9
    });
  }

  res.json({
    success: true,
    prompt,
    context: { model: model || 'motorcycle' },
    variants,
    generated_at: new Date().toISOString(),
    source: 'mock'
  });
});

app.get('/webhook/deals/hot', (req, res) => {
  // Mock hot deals
  const deals = [
    {
      id: 1,
      full_name: 'John Doe',
      phone: '+1234567890',
      stage: 'negotiation',
      amount: 15000,
      currency: 'USD',
      expected_close: '2024-02-01'
    },
    {
      id: 2,
      full_name: 'Jane Smith',
      phone: '+1234567891',
      stage: 'invoice',
      amount: 22000,
      currency: 'USD',
      expected_close: '2024-01-25'
    }
  ];

  res.json({ deals });
});

app.get('/webhook/analytics', (req, res) => {
  const { period = '30d', metrics = 'all' } = req.query;
  
  // Mock analytics data
  const analytics = {
    deals: {
      total_deals: 25,
      won_deals: 8,
      lost_deals: 3,
      active_deals: 14,
      conversion_rate: '32.00',
      avg_deal_value: 18500,
      total_revenue: 148000
    },
    conversations: {
      total_conversations: 150,
      inbound_messages: 120,
      outbound_messages: 30,
      unique_clients: 45,
      avg_ai_confidence: 0.85
    },
    channels: [
      { source: 'whatsapp', message_count: 100, unique_clients: 30 },
      { source: 'telegram', message_count: 40, unique_clients: 12 },
      { source: 'website', message_count: 10, unique_clients: 3 }
    ],
    timeline: [
      { date: '2024-01-20', conversations: 15, unique_clients: 8 },
      { date: '2024-01-21', conversations: 12, unique_clients: 6 },
      { date: '2024-01-22', conversations: 18, unique_clients: 10 }
    ]
  };

  res.json({
    success: true,
    period,
    metrics,
    data: analytics,
    generated_at: new Date().toISOString()
  });
});

app.post('/webhook/whatsapp', (req, res) => {
  const { phone, message, name } = req.body;
  
  if (!phone || !message) {
    return res.status(400).json({ error: 'phone and message are required' });
  }

  // Mock AI response
  const responses = [
    "Thank you for your interest! I'd be happy to help you find the perfect motorcycle.",
    "Great question! Let me provide you with detailed information about our motorcycles.",
    "I understand you're looking for a motorcycle. What type of riding do you plan to do?"
  ];

  const reply = responses[Math.floor(Math.random() * responses.length)];

  res.json({ 
    reply,
    confidence: 0.85,
    client_id: Math.floor(Math.random() * 1000)
  });
});

app.post('/webhook/telegram', (req, res) => {
  const { chatId, text, username } = req.body;
  
  if (!chatId || !text) {
    return res.status(400).json({ error: 'chatId and text are required' });
  }

  // Mock AI response
  const responses = [
    "Hello! Welcome to our motorcycle marketplace. How can I assist you today?",
    "Thanks for reaching out! I'm here to help you find your dream motorcycle.",
    "Great to hear from you! What kind of motorcycle are you interested in?"
  ];

  const reply = responses[Math.floor(Math.random() * responses.length)];

  res.json({ 
    reply,
    confidence: 0.88,
    client_id: Math.floor(Math.random() * 1000)
  });
});

app.post('/webhook/motorcycle/sync', (req, res) => {
  const { title, wp_post_id } = req.body;
  
  if (!title || !wp_post_id) {
    return res.status(400).json({ error: 'title and wp_post_id are required' });
  }

  // Mock sync response
  res.json({
    success: true,
    motorcycle_id: Math.floor(Math.random() * 1000)
  });
});

app.put('/webhook/reminders/:id/mark-sent', (req, res) => {
  const reminderId = req.params.id;
  
  if (!reminderId) {
    return res.status(400).json({ error: 'Invalid reminder ID' });
  }

  res.json({
    success: true,
    message: 'Reminder marked as sent'
  });
});

app.post('/webhook/messages/send', (req, res) => {
  const { message, channel } = req.body;
  
  if (!message || !channel) {
    return res.status(400).json({ error: 'message and channel are required' });
  }

  res.json({
    success: true,
    message_id: `msg_${Date.now()}`
  });
});

// Monitoring routes
monitoringRoutes(app);

// Enhanced health check (without database)
app.get('/healthz', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'standalone',
    checks: {
      database: { status: 'mock', message: 'Using mock data' },
      openai: { status: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured' },
      cache: { status: 'ok', message: 'In-memory cache active' }
    }
  };

  res.json(health);
});

// Error handling
app.use(errorHandler);

const start = async () => {
  try {
    app.listen(config.port, () => {
      logger.info(`Standalone webhook server listening on port ${config.port}`);
      logger.info(`Health check available at http://localhost:${config.port}/healthz`);
      logger.info(`Metrics available at http://localhost:${config.port}/metrics`);
      logger.info('Running in standalone mode with mock data');
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

start();
