import rateLimit from 'express-rate-limit';
import { body, query, param, validationResult } from 'express-validator';
import logger from '../utils/logger.js';

// Rate limiting configurations
export const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100, message = 'Too many requests') => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn({ 
        ip: req.ip, 
        path: req.path,
        method: req.method 
      }, 'Rate limit exceeded');
      
      res.status(429).json({ 
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// Different rate limits for different endpoints
export const generalRateLimit = createRateLimit(15 * 60 * 1000, 100, 'Too many requests, please try again later');
export const aiRateLimit = createRateLimit(5 * 60 * 1000, 20, 'Too many AI requests, please slow down');
export const authRateLimit = createRateLimit(15 * 60 * 1000, 5, 'Too many authentication attempts');

// API Key validation middleware
export const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
  
  // Skip validation for health checks and public endpoints
  const publicPaths = ['/healthz', '/webhook/healthz'];
  if (publicPaths.includes(req.path)) {
    return next();
  }
  
  // For development, allow requests without API key
  if (process.env.NODE_ENV === 'development' && validApiKeys.length === 0) {
    return next();
  }
  
  if (!apiKey || !validApiKeys.includes(apiKey)) {
    logger.warn({ 
      ip: req.ip, 
      path: req.path,
      providedKey: apiKey ? 'provided' : 'missing'
    }, 'Invalid or missing API key');
    
    return res.status(401).json({ 
      error: 'Invalid or missing API key',
      hint: 'Include X-API-Key header or api_key query parameter'
    });
  }
  
  next();
};

// Request validation middleware
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    logger.warn({ 
      ip: req.ip, 
      path: req.path,
      errors: errors.array()
    }, 'Validation errors');
    
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  
  next();
};

// Validation rules for different endpoints
export const validateWhatsAppMessage = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format'),
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message must be between 1 and 4000 characters'),
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Name must be less than 100 characters'),
  handleValidationErrors
];

export const validateTelegramMessage = [
  body('chatId')
    .notEmpty()
    .withMessage('Chat ID is required')
    .isNumeric()
    .withMessage('Chat ID must be numeric'),
  body('text')
    .notEmpty()
    .withMessage('Text is required')
    .isLength({ min: 1, max: 4000 })
    .withMessage('Text must be between 1 and 4000 characters'),
  body('username')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Username must be less than 50 characters'),
  handleValidationErrors
];

export const validateVariantsRequest = [
  query('prompt')
    .notEmpty()
    .withMessage('Prompt is required')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Prompt must be between 1 and 1000 characters'),
  query('count')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Count must be between 1 and 5'),
  query('model')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Model name must be less than 100 characters'),
  handleValidationErrors
];

export const validateMotorcycleSync = [
  body('title')
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 1, max: 180 })
    .withMessage('Title must be between 1 and 180 characters'),
  body('wp_post_id')
    .notEmpty()
    .withMessage('WordPress post ID is required')
    .isInt({ min: 1 })
    .withMessage('WordPress post ID must be a positive integer'),
  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD'])
    .withMessage('Invalid currency code'),
  body('availability')
    .optional()
    .isIn(['available', 'reserved', 'sold'])
    .withMessage('Invalid availability status'),
  handleValidationErrors
];

export const validateReminderUpdate = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Reminder ID must be a positive integer'),
  handleValidationErrors
];

export const validateManualMessage = [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message must be between 1 and 4000 characters'),
  body('channel')
    .notEmpty()
    .withMessage('Channel is required')
    .isIn(['whatsapp', 'telegram', 'email'])
    .withMessage('Invalid channel'),
  body('dealId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Deal ID must be a positive integer'),
  body('clientPhone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Invalid phone number format'),
  handleValidationErrors
];

export const validateAnalyticsRequest = [
  query('period')
    .optional()
    .isIn(['7d', '30d', '90d'])
    .withMessage('Period must be 7d, 30d, or 90d'),
  query('metrics')
    .optional()
    .custom((value) => {
      if (value === 'all') return true;
      const validMetrics = ['deals', 'conversations', 'channels', 'timeline'];
      const requestedMetrics = value.split(',');
      return requestedMetrics.every(metric => validMetrics.includes(metric.trim()));
    })
    .withMessage('Invalid metrics requested'),
  handleValidationErrors
];

// Security headers middleware
export const securityHeaders = (req, res, next) => {
  // Remove server information
  res.removeHeader('X-Powered-By');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CORS headers for API
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  
  next();
};

// Request logging middleware
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request
  logger.info({
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentLength: req.get('Content-Length')
  }, 'Incoming request');
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    }, 'Request completed');
  });
  
  next();
};

// Error handling middleware
export const errorHandler = (err, req, res, next) => {
  logger.error({
    err,
    method: req.method,
    path: req.path,
    ip: req.ip
  }, 'Unhandled error');
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
};

// Health check with detailed status
export const healthCheck = async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
  
  try {
    // Check database connection
    const { healthCheck: dbHealth } = await import('../services/database.js');
    await dbHealth();
    health.database = 'connected';
  } catch (error) {
    health.database = 'disconnected';
    health.status = 'degraded';
    logger.error({ err: error }, 'Database health check failed');
  }
  
  // Check OpenAI service
  try {
    const openAiKey = process.env.OPENAI_API_KEY;
    health.openai = openAiKey ? 'configured' : 'not_configured';
  } catch (error) {
    health.openai = 'error';
  }
  
  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
};
