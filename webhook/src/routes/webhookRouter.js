import { Router } from 'express';
import { generateResponse } from '../services/openAiService.js';
import { recordConversation, upsertClient, listHotDeals } from '../services/messageService.js';
import logger from '../utils/logger.js';

const router = Router();

router.get('/healthz', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/deals/hot', async (req, res, next) => {
  try {
    const deals = await listHotDeals();
    res.json({ deals });
  } catch (error) {
    next(error);
  }
});

router.post('/whatsapp', async (req, res, next) => {
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

router.post('/telegram', async (req, res, next) => {
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

export default router;
