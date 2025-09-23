import { Router } from 'express';
import { generateResponse, generateVariants } from '../services/openAiService.js';
import {
  recordConversation,
  upsertClient,
  listHotDeals,
  syncMotorcycleData,
  markReminderSent,
  sendManualMessage,
  getAnalytics
} from '../services/messageService.js';
import logger from '../utils/logger.js';
import {
  aiRateLimit,
  validateWhatsAppMessage,
  validateTelegramMessage,
  validateVariantsRequest,
  validateMotorcycleSync,
  validateReminderUpdate,
  validateManualMessage,
  validateAnalyticsRequest
} from '../middleware/security.js';
import {
  cacheHotDeals,
  cacheAnalytics,
  cacheVariants,
  cacheUtils
} from '../services/cache.js';

const router = Router();

router.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/deals/hot', cacheHotDeals, async (req, res, next) => {
  try {
    const deals = await listHotDeals();
    res.json({ deals });
  } catch (error) {
    next(error);
  }
});

router.get('/variants', aiRateLimit, validateVariantsRequest, cacheVariants, async (req, res, next) => {
  try {
    const { prompt, model, budget, count } = req.query;

    if (!prompt) {
      return res.status(400).json({
        error: 'prompt parameter is required',
        example: '/webhook/variants?prompt=interested in motorcycle&model=Yamaha MT-07&count=3'
      });
    }

    const variantCount = Math.min(parseInt(count) || 3, 5); // Max 5 variants
    const context = {
      model: model || 'motorcycle',
      budget: budget || 'not specified',
      timestamp: new Date().toISOString()
    };

    logger.info({ prompt, context, variantCount }, 'Generating A/B test variants');

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
    logger.error({ err: error }, 'Failed to generate variants');
    next(error);
  }
});

router.post('/whatsapp', validateWhatsAppMessage, async (req, res, next) => {
  try {
    const { phone, message, name } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'phone and message are required' });
    }

    const clientId = await upsertClient({
      fullName: name || 'WhatsApp lead',
      phone,
      channel: 'whatsapp',
      metadata: { source: 'whatsapp' }
    });

    const aiResult = await generateResponse({ prompt: message, context: { phone, name } });

    await recordConversation({
      clientId,
      source: 'whatsapp',
      direction: 'inbound',
      message,
      aiConfidence: aiResult.confidence
    });

    res.json({ reply: aiResult.message, confidence: aiResult.confidence });
  } catch (error) {
    logger.error({ err: error }, 'Failed to handle WhatsApp webhook');
    next(error);
  }
});

router.post('/telegram', validateTelegramMessage, async (req, res, next) => {
  try {
    const { username, text, chatId } = req.body;
    if (!chatId || !text) {
      return res.status(400).json({ error: 'chatId and text are required' });
    }

    const clientId = await upsertClient({
      fullName: username || 'Telegram lead',
      phone: `telegram:${chatId}`,
      channel: 'telegram',
      metadata: { source: 'telegram' }
    });

    const aiResult = await generateResponse({ prompt: text, context: { chatId, username } });

    await recordConversation({
      clientId,
      source: 'telegram',
      direction: 'inbound',
      message: text,
      aiConfidence: aiResult.confidence
    });

    res.json({ reply: aiResult.message, confidence: aiResult.confidence });
  } catch (error) {
    logger.error({ err: error }, 'Failed to handle Telegram webhook');
    next(error);
  }
});

// Motorcycle sync endpoint for WordPress integration
router.post('/motorcycle/sync', validateMotorcycleSync, async (req, res, next) => {
  try {
    const motorcycleData = req.body;

    if (!motorcycleData.title || !motorcycleData.wp_post_id) {
      return res.status(400).json({ error: 'title and wp_post_id are required' });
    }

    const result = await syncMotorcycleData(motorcycleData);

    logger.info({ wp_post_id: motorcycleData.wp_post_id }, 'Motorcycle data synced');
    res.json({ success: true, motorcycle_id: result.insertId });
  } catch (error) {
    logger.error({ err: error }, 'Failed to sync motorcycle data');
    next(error);
  }
});

// Mark reminder as sent
router.put('/reminders/:id/mark-sent', async (req, res, next) => {
  try {
    const reminderId = parseInt(req.params.id);

    if (!reminderId) {
      return res.status(400).json({ error: 'Invalid reminder ID' });
    }

    await markReminderSent(reminderId);

    logger.info({ reminder_id: reminderId }, 'Reminder marked as sent');
    res.json({ success: true, message: 'Reminder marked as sent' });
  } catch (error) {
    logger.error({ err: error, reminder_id: req.params.id }, 'Failed to mark reminder as sent');
    next(error);
  }
});

// Send manual message
router.post('/messages/send', async (req, res, next) => {
  try {
    const { dealId, message, channel, clientPhone } = req.body;

    if (!message || !channel) {
      return res.status(400).json({ error: 'message and channel are required' });
    }

    const result = await sendManualMessage({ dealId, message, channel, clientPhone });

    logger.info({ deal_id: dealId, channel }, 'Manual message sent');
    res.json({ success: true, message_id: result.messageId });
  } catch (error) {
    logger.error({ err: error }, 'Failed to send manual message');
    next(error);
  }
});

// Analytics endpoint
router.get('/analytics', validateAnalyticsRequest, cacheAnalytics, async (req, res, next) => {
  try {
    const { period = '30d', metrics = 'all' } = req.query;

    const analytics = await getAnalytics(period, metrics);

    res.json({
      success: true,
      period,
      metrics,
      data: analytics,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to get analytics');
    next(error);
  }
});

export default router;
