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
