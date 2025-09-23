import express from 'express';
import helmet from 'helmet';
import { 
  generalRateLimit,
  securityHeaders,
  requestLogger,
  errorHandler,
  validateWhatsAppMessage,
  validateTelegramMessage,
  validateVariantsRequest,
  validateMotorcycleSync,
  validateReminderUpdate,
  validateManualMessage,
  validateAnalyticsRequest
} from './middleware/security.js';
import { generateVariants } from './services/openAiService.js';

const app = express();

// Security and middleware setup
app.use(helmet());
app.use(securityHeaders);
app.use(requestLogger);
app.use(generalRateLimit);

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// A/B Testing endpoint
app.get('/webhook/variants', validateVariantsRequest, async (req, res) => {
  try {
    const { prompt, model, count } = req.query;
    
    const variantCount = Math.min(parseInt(count) || 3, 5);
    const context = {
      model: model || 'motorcycle',
      timestamp: new Date().toISOString()
    };

    const result = await generateVariants({ 
      prompt, 
      context, 
      variantCount 
    });

    res.json({
      success: true,
      prompt,
      context,
      ...result
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate variants' });
  }
});

// Hot deals endpoint (mock data for Vercel)
app.get('/webhook/deals/hot', (req, res) => {
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
    },
    {
      id: 3,
      full_name: 'Mike Johnson',
      phone: '+1234567892',
      stage: 'negotiation',
      amount: 18500,
      currency: 'USD',
      expected_close: '2024-02-05'
    }
  ];

  res.json({ deals });
});

// Analytics endpoint (mock data for Vercel)
app.get('/webhook/analytics', validateAnalyticsRequest, (req, res) => {
  const { period = '30d', metrics = 'all' } = req.query;
  
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
    timeline: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      conversations: Math.floor(Math.random() * 20) + 5,
      unique_clients: Math.floor(Math.random() * 10) + 2
    })).reverse()
  };

  res.json({
    success: true,
    period,
    metrics,
    data: analytics,
    generated_at: new Date().toISOString()
  });
});

// WhatsApp webhook
app.post('/webhook/whatsapp', validateWhatsAppMessage, async (req, res) => {
  try {
    const { phone, message, name } = req.body;

    // Use AI if available, otherwise use templates
    let reply;
    let confidence = 0.85;

    try {
      const aiResult = await generateVariants({
        prompt: `Respond to this WhatsApp message about motorcycles: "${message}"`,
        context: { channel: 'whatsapp', name },
        variantCount: 1
      });
      
      reply = aiResult.variants[0]?.message || getTemplateResponse(message);
    } catch (error) {
      reply = getTemplateResponse(message);
      confidence = 0.9;
    }

    res.json({ 
      reply,
      confidence,
      client_id: Math.floor(Math.random() * 1000)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process WhatsApp message' });
  }
});

// Telegram webhook
app.post('/webhook/telegram', validateTelegramMessage, async (req, res) => {
  try {
    const { chatId, text, username } = req.body;

    let reply;
    let confidence = 0.85;

    try {
      const aiResult = await generateVariants({
        prompt: `Respond to this Telegram message about motorcycles: "${text}"`,
        context: { channel: 'telegram', username },
        variantCount: 1
      });
      
      reply = aiResult.variants[0]?.message || getTemplateResponse(text);
    } catch (error) {
      reply = getTemplateResponse(text);
      confidence = 0.9;
    }

    res.json({ 
      reply,
      confidence,
      client_id: Math.floor(Math.random() * 1000)
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to process Telegram message' });
  }
});

// Motorcycle sync endpoint
app.post('/webhook/motorcycle/sync', validateMotorcycleSync, (req, res) => {
  const { title, wp_post_id } = req.body;
  
  // Mock sync response for Vercel
  res.json({
    success: true,
    motorcycle_id: Math.floor(Math.random() * 1000),
    synced_at: new Date().toISOString()
  });
});

// Mark reminder as sent
app.put('/webhook/reminders/:id/mark-sent', validateReminderUpdate, (req, res) => {
  const reminderId = req.params.id;
  
  res.json({
    success: true,
    message: 'Reminder marked as sent',
    reminder_id: reminderId,
    updated_at: new Date().toISOString()
  });
});

// Send manual message
app.post('/webhook/messages/send', validateManualMessage, (req, res) => {
  const { message, channel, dealId } = req.body;
  
  res.json({
    success: true,
    message_id: `msg_${Date.now()}`,
    channel,
    sent_at: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = {
    uptime: {
      seconds: Math.floor(process.uptime()),
      formatted: formatUptime(Math.floor(process.uptime()))
    },
    requests: {
      total: 0,
      success: 0,
      errors: 0,
      successRate: "100%",
      avgResponseTime: 50
    },
    memory: process.memoryUsage(),
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    },
    environment: 'vercel'
  };

  res.json(metrics);
});

// Welcome page for nano-crm
app.get('/', (req, res) => {
  res.json({
    name: 'Nano CRM',
    description: 'AI-powered motorcycle marketplace with CRM and automated responses',
    version: '1.0.0',
    status: 'operational',
    endpoints: {
      health: '/healthz',
      metrics: '/metrics',
      variants: '/webhook/variants',
      deals: '/webhook/deals/hot',
      analytics: '/webhook/analytics',
      whatsapp: '/webhook/whatsapp',
      telegram: '/webhook/telegram'
    },
    documentation: 'https://github.com/1rokoko/2-scooter-db-auto-sale-respond-2-syper-crm',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'vercel',
    service: 'nano-crm'
  });
});

app.get('/health', (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'vercel',
    checks: {
      openai: { 
        status: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        message: process.env.OPENAI_API_KEY ? 'OpenAI API key configured' : 'OpenAI API key not configured'
      },
      memory: {
        status: 'ok',
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      }
    }
  };

  res.json(health);
});

// Helper functions
function getTemplateResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('price') || lowerMessage.includes('cost')) {
    return "Our motorcycles range from $5,000 to $25,000 depending on the model and year. Would you like specific pricing for a particular motorcycle?";
  }
  
  if (lowerMessage.includes('test ride') || lowerMessage.includes('try')) {
    return "Absolutely! We offer test rides for all our motorcycles. When would be a good time for you to visit our showroom?";
  }
  
  if (lowerMessage.includes('financing') || lowerMessage.includes('payment')) {
    return "We offer flexible financing options with competitive rates. Our finance team can help you find the best payment plan for your budget.";
  }
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! Welcome to our motorcycle marketplace. I'm here to help you find your perfect ride. What type of motorcycle are you looking for?";
  }
  
  return "Thank you for your interest! I'd be happy to help you find the perfect motorcycle. What specific information can I provide for you?";
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

// Error handling
app.use(errorHandler);

// For local testing
if (process.env.NODE_ENV !== 'production') {
  const port = process.env.PORT || 8090;
  app.listen(port, () => {
    console.log(`Vercel-compatible server running on port ${port}`);
  });
}

// Export for Vercel
export default app;
