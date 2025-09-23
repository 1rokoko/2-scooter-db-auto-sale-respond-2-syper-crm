import logger from '../utils/logger.js';
import { getPool } from './database.js';
import { generateResponse } from './openAiService.js';

// Notification templates
const templates = {
  welcome: {
    whatsapp: "Welcome to our motorcycle marketplace! 🏍️ I'm here to help you find your perfect ride. What type of motorcycle are you looking for?",
    telegram: "Welcome! 🏍️ I'm your AI assistant for finding the perfect motorcycle. How can I help you today?",
    email: "Welcome to our premium motorcycle marketplace. We're excited to help you find your dream bike!"
  },
  followUp: {
    whatsapp: "Hi! Just following up on your interest in our motorcycles. Do you have any questions about the {model} we discussed?",
    telegram: "Hello! Following up on our conversation about {model}. Any questions I can help with?",
    email: "Following up on your interest in {model}. We'd love to schedule a test ride for you!"
  },
  dealUpdate: {
    whatsapp: "Great news! Your deal for the {model} has been updated to {stage}. Next steps: {nextSteps}",
    telegram: "Deal update: Your {model} is now in {stage} stage. {nextSteps}",
    email: "Your motorcycle purchase is progressing! Current status: {stage}"
  },
  reminder: {
    whatsapp: "Reminder: Don't miss out on the {model}! Limited availability. Contact us to secure your bike.",
    telegram: "⏰ Reminder: The {model} you were interested in is still available. Shall we proceed?",
    email: "Reminder: Your reserved {model} is waiting for you. Please complete your purchase soon."
  },
  priceAlert: {
    whatsapp: "🔥 Price drop alert! The {model} you liked is now {price}. Limited time offer!",
    telegram: "💰 Price Alert: {model} is now {price}! Don't miss this deal.",
    email: "Price Alert: Special pricing on {model} - now {price}!"
  }
};

// Notification scheduler
class NotificationScheduler {
  constructor() {
    this.scheduledNotifications = new Map();
    this.isRunning = false;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    logger.info('Notification scheduler started');
    
    // Check for pending notifications every minute
    this.interval = setInterval(() => {
      this.processPendingNotifications();
    }, 60000);
  }

  stop() {
    if (!this.isRunning) return;
    
    clearInterval(this.interval);
    this.isRunning = false;
    logger.info('Notification scheduler stopped');
  }

  async processPendingNotifications() {
    try {
      const pool = getPool();
      
      // Get pending reminders
      const [reminders] = await pool.execute(`
        SELECT r.*, d.client_id, c.full_name, c.phone, c.channel, d.stage, m.title as motorcycle_title
        FROM reminders r
        JOIN deals d ON r.deal_id = d.id
        JOIN clients c ON d.client_id = c.id
        LEFT JOIN motorcycles m ON d.motorcycle_id = m.id
        WHERE r.sent = 0 AND r.remind_at <= NOW()
        ORDER BY r.remind_at ASC
        LIMIT 50
      `);

      for (const reminder of reminders) {
        await this.sendReminder(reminder);
      }

      // Check for automatic follow-ups
      await this.checkAutoFollowUps();
      
      // Check for deal stage updates
      await this.checkDealUpdates();

    } catch (error) {
      logger.error({ err: error }, 'Error processing notifications');
    }
  }

  async sendReminder(reminder) {
    try {
      const template = JSON.parse(reminder.payload || '{}');
      const templateType = template.template || 'reminder';
      
      const message = await this.generateMessage(templateType, reminder.channel, {
        model: reminder.motorcycle_title || 'motorcycle',
        stage: reminder.stage,
        clientName: reminder.full_name
      });

      // Send the notification
      await this.sendNotification({
        clientId: reminder.client_id,
        phone: reminder.phone,
        channel: reminder.channel,
        message,
        type: 'reminder',
        dealId: reminder.deal_id
      });

      // Mark reminder as sent
      const pool = getPool();
      await pool.execute(
        'UPDATE reminders SET sent = 1, updated_at = NOW() WHERE id = ?',
        [reminder.id]
      );

      logger.info({ 
        reminderId: reminder.id, 
        clientId: reminder.client_id,
        channel: reminder.channel 
      }, 'Reminder sent successfully');

    } catch (error) {
      logger.error({ 
        err: error, 
        reminderId: reminder.id 
      }, 'Failed to send reminder');
    }
  }

  async checkAutoFollowUps() {
    try {
      const pool = getPool();
      
      // Find conversations that need follow-up (no response in 24 hours)
      const [conversations] = await pool.execute(`
        SELECT DISTINCT c.id as client_id, c.full_name, c.phone, c.channel,
               MAX(conv.created_at) as last_message,
               d.id as deal_id, m.title as motorcycle_title
        FROM clients c
        JOIN conversations conv ON c.id = conv.client_id
        LEFT JOIN deals d ON c.id = d.client_id AND d.stage IN ('research', 'negotiation')
        LEFT JOIN motorcycles m ON d.motorcycle_id = m.id
        WHERE conv.direction = 'inbound'
          AND conv.created_at >= DATE_SUB(NOW(), INTERVAL 48 HOUR)
          AND conv.created_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
          AND NOT EXISTS (
            SELECT 1 FROM conversations conv2 
            WHERE conv2.client_id = c.id 
              AND conv2.created_at > conv.created_at
          )
          AND NOT EXISTS (
            SELECT 1 FROM reminders r
            JOIN deals d2 ON r.deal_id = d2.id
            WHERE d2.client_id = c.id
              AND r.sent = 1
              AND r.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
          )
        GROUP BY c.id
        LIMIT 20
      `);

      for (const conv of conversations) {
        await this.scheduleFollowUp(conv);
      }

    } catch (error) {
      logger.error({ err: error }, 'Error checking auto follow-ups');
    }
  }

  async scheduleFollowUp(conversation) {
    try {
      const message = await this.generateMessage('followUp', conversation.channel, {
        model: conversation.motorcycle_title || 'our motorcycles',
        clientName: conversation.full_name
      });

      await this.sendNotification({
        clientId: conversation.client_id,
        phone: conversation.phone,
        channel: conversation.channel,
        message,
        type: 'follow_up',
        dealId: conversation.deal_id
      });

      logger.info({ 
        clientId: conversation.client_id,
        channel: conversation.channel 
      }, 'Auto follow-up sent');

    } catch (error) {
      logger.error({ 
        err: error, 
        clientId: conversation.client_id 
      }, 'Failed to send auto follow-up');
    }
  }

  async checkDealUpdates() {
    try {
      const pool = getPool();
      
      // Find deals that have been updated but client hasn't been notified
      const [deals] = await pool.execute(`
        SELECT d.*, c.full_name, c.phone, c.channel, m.title as motorcycle_title
        FROM deals d
        JOIN clients c ON d.client_id = c.id
        LEFT JOIN motorcycles m ON d.motorcycle_id = m.id
        WHERE d.updated_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
          AND d.stage IN ('negotiation', 'invoice', 'won')
          AND NOT EXISTS (
            SELECT 1 FROM conversations conv
            WHERE conv.client_id = c.id
              AND conv.direction = 'outbound'
              AND conv.created_at >= d.updated_at
              AND conv.message LIKE '%stage%'
          )
        LIMIT 10
      `);

      for (const deal of deals) {
        await this.sendDealUpdate(deal);
      }

    } catch (error) {
      logger.error({ err: error }, 'Error checking deal updates');
    }
  }

  async sendDealUpdate(deal) {
    try {
      const nextSteps = this.getNextSteps(deal.stage);
      
      const message = await this.generateMessage('dealUpdate', deal.channel, {
        model: deal.motorcycle_title || 'motorcycle',
        stage: deal.stage,
        nextSteps,
        clientName: deal.full_name
      });

      await this.sendNotification({
        clientId: deal.client_id,
        phone: deal.phone,
        channel: deal.channel,
        message,
        type: 'deal_update',
        dealId: deal.id
      });

      logger.info({ 
        dealId: deal.id,
        stage: deal.stage,
        clientId: deal.client_id 
      }, 'Deal update notification sent');

    } catch (error) {
      logger.error({ 
        err: error, 
        dealId: deal.id 
      }, 'Failed to send deal update');
    }
  }

  getNextSteps(stage) {
    const steps = {
      research: 'We\'ll send you detailed specifications and pricing.',
      negotiation: 'Please review our latest offer and let us know your thoughts.',
      invoice: 'Your invoice is ready! Please complete payment to finalize your purchase.',
      won: 'Congratulations! We\'ll contact you to arrange delivery.'
    };
    
    return steps[stage] || 'We\'ll be in touch with next steps.';
  }

  async generateMessage(templateType, channel, context) {
    const template = templates[templateType]?.[channel] || templates[templateType]?.whatsapp;
    
    if (!template) {
      return 'Thank you for your interest! We\'ll be in touch soon.';
    }

    // Replace placeholders
    let message = template;
    Object.keys(context).forEach(key => {
      message = message.replace(new RegExp(`{${key}}`, 'g'), context[key]);
    });

    // Use AI to personalize if available
    try {
      if (process.env.OPENAI_API_KEY && templateType !== 'welcome') {
        const aiResult = await generateResponse({
          prompt: `Personalize this message: "${message}"`,
          context: { 
            channel,
            ...context,
            instruction: 'Make it more personal and engaging while keeping the same meaning'
          }
        });
        
        if (aiResult.confidence > 0.7) {
          return aiResult.message;
        }
      }
    } catch (error) {
      logger.warn({ err: error }, 'AI personalization failed, using template');
    }

    return message;
  }

  async sendNotification({ clientId, phone, channel, message, type, dealId }) {
    try {
      const pool = getPool();
      
      // Record the outbound message
      await pool.execute(`
        INSERT INTO conversations (client_id, source, direction, message, ai_confidence)
        VALUES (?, ?, 'outbound', ?, NULL)
      `, [clientId, channel, message]);

      // Here you would integrate with actual messaging services
      // For now, we'll just log the notification
      logger.info({
        clientId,
        phone,
        channel,
        type,
        dealId,
        messageLength: message.length
      }, 'Notification sent');

      // In a real implementation, you would call:
      // - WhatsApp Business API
      // - Telegram Bot API  
      // - Email service (SendGrid, etc.)
      
      return { success: true, messageId: `msg_${Date.now()}` };

    } catch (error) {
      logger.error({ err: error, clientId, channel }, 'Failed to send notification');
      throw error;
    }
  }

  // Manual notification methods
  async sendWelcomeMessage(clientId, channel) {
    try {
      const pool = getPool();
      const [clients] = await pool.execute(
        'SELECT * FROM clients WHERE id = ?',
        [clientId]
      );

      if (clients.length === 0) {
        throw new Error('Client not found');
      }

      const client = clients[0];
      const message = await this.generateMessage('welcome', channel, {
        clientName: client.full_name
      });

      return await this.sendNotification({
        clientId,
        phone: client.phone,
        channel,
        message,
        type: 'welcome'
      });

    } catch (error) {
      logger.error({ err: error, clientId }, 'Failed to send welcome message');
      throw error;
    }
  }

  async sendPriceAlert(clientId, motorcycleId, newPrice) {
    try {
      const pool = getPool();
      const [results] = await pool.execute(`
        SELECT c.*, m.title, m.currency
        FROM clients c, motorcycles m
        WHERE c.id = ? AND m.id = ?
      `, [clientId, motorcycleId]);

      if (results.length === 0) {
        throw new Error('Client or motorcycle not found');
      }

      const { full_name, phone, channel, title, currency } = results[0];
      const formattedPrice = `${currency} ${newPrice.toLocaleString()}`;

      const message = await this.generateMessage('priceAlert', channel, {
        clientName: full_name,
        model: title,
        price: formattedPrice
      });

      return await this.sendNotification({
        clientId,
        phone,
        channel,
        message,
        type: 'price_alert'
      });

    } catch (error) {
      logger.error({ err: error, clientId, motorcycleId }, 'Failed to send price alert');
      throw error;
    }
  }
}

// Global notification scheduler instance
const notificationScheduler = new NotificationScheduler();

// Auto-start scheduler
notificationScheduler.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  notificationScheduler.stop();
});

process.on('SIGINT', () => {
  notificationScheduler.stop();
});

export { notificationScheduler, templates };
export default notificationScheduler;
