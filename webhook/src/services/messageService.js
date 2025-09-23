import { getPool } from './database.js';

export const recordConversation = async ({ clientId, source, direction, message, aiConfidence }) => {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO conversations (client_id, source, direction, message, ai_confidence)
     VALUES (?, ?, ?, ?, ?)`,
    [clientId, source, direction, message, aiConfidence ?? null]
  );
};

export const upsertClient = async ({ fullName, phone, email, channel, status = 'new', metadata = {} }) => {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT id FROM clients WHERE phone = ? LIMIT 1`,
    [phone]
  );

  if (rows.length > 0) {
    const clientId = rows[0].id;
    await pool.execute(
      `UPDATE clients SET full_name = ?, email = ?, channel = ?, status = ?, metadata = JSON_MERGE_PATCH(IFNULL(metadata, JSON_OBJECT()), CAST(? AS JSON)), updated_at = NOW()
       WHERE id = ?`,
      [fullName, email, channel, status, JSON.stringify(metadata), clientId]
    );
    return clientId;
  }

  const [result] = await pool.execute(
    `INSERT INTO clients (full_name, phone, email, channel, status, metadata)
     VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))`,
    [fullName, phone, email, channel, status, JSON.stringify(metadata)]
  );

  return result.insertId;
};

export const createReminder = async ({ dealId, remindAt, channel, payload }) => {
  const pool = getPool();
  await pool.execute(
    `INSERT INTO reminders (deal_id, remind_at, channel, payload)
     VALUES (?, ?, ?, CAST(? AS JSON))`,
    [dealId, remindAt, channel, JSON.stringify(payload)]
  );
};

export const listHotDeals = async () => {
  const pool = getPool();
  const [rows] = await pool.execute(
    `SELECT deals.id, clients.full_name, clients.phone, deals.stage, deals.amount, deals.currency, deals.expected_close
     FROM deals
     INNER JOIN clients ON deals.client_id = clients.id
     WHERE deals.stage IN ('negotiation', 'invoice')`
  );
  return rows;
};

export const syncMotorcycleData = async (motorcycleData) => {
  const pool = getPool();

  // Check if motorcycle already exists
  const [existing] = await pool.execute(
    `SELECT id FROM motorcycles WHERE title = ? AND location = ?`,
    [motorcycleData.title, motorcycleData.location]
  );

  const mediaJson = motorcycleData.featured_image ?
    JSON.stringify([motorcycleData.featured_image]) :
    JSON.stringify([]);

  if (existing.length > 0) {
    // Update existing motorcycle
    await pool.execute(
      `UPDATE motorcycles
       SET description = ?, price = ?, currency = ?, availability = ?,
           location = ?, media = CAST(? AS JSON), updated_at = NOW()
       WHERE id = ?`,
      [
        motorcycleData.description || '',
        motorcycleData.price || 0,
        motorcycleData.currency || 'USD',
        motorcycleData.availability || 'available',
        motorcycleData.location || '',
        mediaJson,
        existing[0].id
      ]
    );
    return { insertId: existing[0].id };
  } else {
    // Insert new motorcycle
    const [result] = await pool.execute(
      `INSERT INTO motorcycles (title, description, price, currency, availability, location, media)
       VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON))`,
      [
        motorcycleData.title,
        motorcycleData.description || '',
        motorcycleData.price || 0,
        motorcycleData.currency || 'USD',
        motorcycleData.availability || 'available',
        motorcycleData.location || '',
        mediaJson
      ]
    );
    return result;
  }
};

export const markReminderSent = async (reminderId) => {
  const pool = getPool();
  await pool.execute(
    `UPDATE reminders SET sent = 1, updated_at = NOW() WHERE id = ?`,
    [reminderId]
  );
};

export const sendManualMessage = async ({ dealId, message, channel, clientPhone }) => {
  const pool = getPool();

  // Get client info if dealId provided
  let clientId = null;
  if (dealId) {
    const [dealRows] = await pool.execute(
      `SELECT client_id FROM deals WHERE id = ?`,
      [dealId]
    );
    if (dealRows.length > 0) {
      clientId = dealRows[0].client_id;
    }
  }

  // If no clientId from deal, try to find by phone
  if (!clientId && clientPhone) {
    const [clientRows] = await pool.execute(
      `SELECT id FROM clients WHERE phone = ?`,
      [clientPhone]
    );
    if (clientRows.length > 0) {
      clientId = clientRows[0].id;
    }
  }

  if (!clientId) {
    throw new Error('Client not found');
  }

  // Record the outbound message
  await pool.execute(
    `INSERT INTO conversations (client_id, source, direction, message, ai_confidence)
     VALUES (?, ?, 'outbound', ?, NULL)`,
    [clientId, channel, message]
  );

  // Here you would integrate with actual messaging services
  // For now, we'll just return a mock message ID
  return { messageId: `msg_${Date.now()}` };
};

export const getAnalytics = async (period = '30d', metrics = 'all') => {
  const pool = getPool();

  // Calculate date range
  const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - daysBack);

  const analytics = {};

  if (metrics === 'all' || metrics.includes('deals')) {
    // Deal statistics
    const [dealStats] = await pool.execute(
      `SELECT
         COUNT(*) as total_deals,
         COUNT(CASE WHEN stage = 'won' THEN 1 END) as won_deals,
         COUNT(CASE WHEN stage = 'lost' THEN 1 END) as lost_deals,
         COUNT(CASE WHEN stage IN ('negotiation', 'invoice') THEN 1 END) as active_deals,
         AVG(CASE WHEN stage = 'won' THEN amount END) as avg_deal_value,
         SUM(CASE WHEN stage = 'won' THEN amount ELSE 0 END) as total_revenue
       FROM deals
       WHERE created_at >= ?`,
      [startDate.toISOString().split('T')[0]]
    );

    analytics.deals = dealStats[0];

    // Calculate conversion rate
    const totalLeads = dealStats[0].total_deals;
    const wonDeals = dealStats[0].won_deals;
    analytics.deals.conversion_rate = totalLeads > 0 ? (wonDeals / totalLeads * 100).toFixed(2) : 0;
  }

  if (metrics === 'all' || metrics.includes('conversations')) {
    // Conversation statistics
    const [convStats] = await pool.execute(
      `SELECT
         COUNT(*) as total_conversations,
         COUNT(CASE WHEN direction = 'inbound' THEN 1 END) as inbound_messages,
         COUNT(CASE WHEN direction = 'outbound' THEN 1 END) as outbound_messages,
         AVG(ai_confidence) as avg_ai_confidence,
         COUNT(DISTINCT client_id) as unique_clients
       FROM conversations
       WHERE created_at >= ?`,
      [startDate.toISOString().split('T')[0]]
    );

    analytics.conversations = convStats[0];
  }

  if (metrics === 'all' || metrics.includes('channels')) {
    // Channel performance
    const [channelStats] = await pool.execute(
      `SELECT
         source,
         COUNT(*) as message_count,
         COUNT(DISTINCT client_id) as unique_clients
       FROM conversations
       WHERE created_at >= ?
       GROUP BY source`,
      [startDate.toISOString().split('T')[0]]
    );

    analytics.channels = channelStats;
  }

  if (metrics === 'all' || metrics.includes('timeline')) {
    // Daily timeline
    const [timeline] = await pool.execute(
      `SELECT
         DATE(created_at) as date,
         COUNT(*) as conversations,
         COUNT(DISTINCT client_id) as unique_clients
       FROM conversations
       WHERE created_at >= ?
       GROUP BY DATE(created_at)
       ORDER BY date`,
      [startDate.toISOString().split('T')[0]]
    );

    analytics.timeline = timeline;
  }

  return analytics;
};
