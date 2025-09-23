import logger from '../utils/logger.js';

// Simple in-memory cache implementation
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timers = new Map();
  }

  set(key, value, ttlSeconds = 300) {
    // Clear existing timer if any
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }

    // Set the value
    this.cache.set(key, {
      value,
      createdAt: Date.now(),
      ttl: ttlSeconds * 1000
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttlSeconds * 1000);

    this.timers.set(key, timer);

    logger.debug({ key, ttl: ttlSeconds }, 'Cache set');
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.createdAt > item.ttl) {
      this.delete(key);
      return null;
    }

    logger.debug({ key }, 'Cache hit');
    return item.value;
  }

  delete(key) {
    // Clear timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }

    // Remove from cache
    const deleted = this.cache.delete(key);
    
    if (deleted) {
      logger.debug({ key }, 'Cache deleted');
    }
    
    return deleted;
  }

  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.timers.clear();
    this.cache.clear();
    
    logger.info('Cache cleared');
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return Array.from(this.cache.keys());
  }

  stats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now - item.createdAt > item.ttl) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      memory: process.memoryUsage()
    };
  }
}

// Create cache instance
const cache = new MemoryCache();

// Cache middleware factory
export const createCacheMiddleware = (keyGenerator, ttlSeconds = 300) => {
  return (req, res, next) => {
    const key = typeof keyGenerator === 'function' ? keyGenerator(req) : keyGenerator;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      logger.info({ key, path: req.path }, 'Serving from cache');
      return res.json(cachedResponse);
    }

    // Override res.json to cache the response
    const originalJson = res.json;
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, data, ttlSeconds);
        logger.info({ key, path: req.path }, 'Response cached');
      }
      
      return originalJson.call(this, data);
    };

    next();
  };
};

// Predefined cache middleware for common endpoints
export const cacheHotDeals = createCacheMiddleware(
  (req) => 'hot-deals',
  60 // 1 minute cache
);

export const cacheAnalytics = createCacheMiddleware(
  (req) => `analytics-${req.query.period || '30d'}-${req.query.metrics || 'all'}`,
  300 // 5 minutes cache
);

export const cacheVariants = createCacheMiddleware(
  (req) => {
    const { prompt, model, count } = req.query;
    return `variants-${Buffer.from(prompt + (model || '') + (count || '3')).toString('base64')}`;
  },
  600 // 10 minutes cache for AI responses
);

// Cache utility functions
export const cacheUtils = {
  // Get cached value
  get: (key) => cache.get(key),
  
  // Set cached value
  set: (key, value, ttlSeconds = 300) => cache.set(key, value, ttlSeconds),
  
  // Delete cached value
  delete: (key) => cache.delete(key),
  
  // Clear all cache
  clear: () => cache.clear(),
  
  // Get cache statistics
  stats: () => cache.stats(),
  
  // Cache hot deals
  setHotDeals: (deals) => cache.set('hot-deals', deals, 60),
  getHotDeals: () => cache.get('hot-deals'),
  
  // Cache analytics
  setAnalytics: (period, metrics, data) => {
    const key = `analytics-${period}-${metrics}`;
    cache.set(key, data, 300);
  },
  getAnalytics: (period, metrics) => {
    const key = `analytics-${period}-${metrics}`;
    return cache.get(key);
  },
  
  // Cache client data
  setClient: (phone, clientData) => {
    cache.set(`client-${phone}`, clientData, 1800); // 30 minutes
  },
  getClient: (phone) => cache.get(`client-${phone}`),
  
  // Cache conversation context
  setConversationContext: (clientId, context) => {
    cache.set(`context-${clientId}`, context, 3600); // 1 hour
  },
  getConversationContext: (clientId) => cache.get(`context-${clientId}`),
  
  // Invalidate related caches
  invalidateDealsCache: () => {
    cache.delete('hot-deals');
    // Invalidate analytics cache as it depends on deals
    const keys = cache.keys().filter(key => key.startsWith('analytics-'));
    keys.forEach(key => cache.delete(key));
  },
  
  invalidateAnalyticsCache: () => {
    const keys = cache.keys().filter(key => key.startsWith('analytics-'));
    keys.forEach(key => cache.delete(key));
  }
};

// Cache warming functions
export const warmCache = async () => {
  try {
    logger.info('Starting cache warming...');
    
    // Warm hot deals cache
    const { listHotDeals } = await import('./messageService.js');
    const deals = await listHotDeals();
    cacheUtils.setHotDeals(deals);
    
    // Warm analytics cache for common periods
    const { getAnalytics } = await import('./messageService.js');
    const periods = ['7d', '30d'];
    
    for (const period of periods) {
      const analytics = await getAnalytics(period, 'all');
      cacheUtils.setAnalytics(period, 'all', analytics);
    }
    
    logger.info('Cache warming completed');
  } catch (error) {
    logger.error({ err: error }, 'Cache warming failed');
  }
};

// Cache cleanup - remove expired entries
export const cleanupCache = () => {
  const stats = cache.stats();
  
  if (stats.expired > 0) {
    logger.info({ expired: stats.expired }, 'Cleaning up expired cache entries');
    
    // Force cleanup by accessing all keys
    const keys = cache.keys();
    keys.forEach(key => cache.get(key)); // This will auto-delete expired entries
  }
};

// Schedule cache cleanup every 5 minutes
setInterval(cleanupCache, 5 * 60 * 1000);

// Cache health check
export const cacheHealthCheck = () => {
  const stats = cache.stats();
  
  return {
    status: 'ok',
    ...stats,
    memoryUsage: {
      rss: Math.round(stats.memory.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(stats.memory.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(stats.memory.heapTotal / 1024 / 1024) + 'MB'
    }
  };
};

export default cache;
