import mysql from 'mysql2/promise';
import config from '../config.js';
import logger from '../utils/logger.js';

let pool;

export const getPool = () => {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });

    pool.on('connection', () => {
      logger.info('MySQL connection established');
    });
  }

  return pool;
};

export const healthCheck = async () => {
  const connection = await getPool().getConnection();
  try {
    await connection.ping();
    return true;
  } finally {
    connection.release();
  }
};
