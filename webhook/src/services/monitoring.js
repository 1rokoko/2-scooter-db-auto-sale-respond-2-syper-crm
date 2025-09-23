import logger from '../utils/logger.js';
import { cacheUtils, cacheHealthCheck } from './cache.js';

// Metrics collection
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        responseTime: []
      },
      ai: {
        requests: 0,
        successes: 0,
        failures: 0,
        avgConfidence: 0,
        totalConfidence: 0
      },
      database: {
        queries: 0,
        errors: 0,
        avgResponseTime: 0,
        totalResponseTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
      },
      business: {
        newClients: 0,
        conversations: 0,
        deals: 0,
        reminders: 0
      }
    };
    
    this.startTime = Date.now();
  }

  // Request metrics
  recordRequest(method, path, statusCode, responseTime) {
    this.metrics.requests.total++;
    
    if (statusCode >= 200 && statusCode < 400) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.errors++;
    }
    
    // Track by endpoint
    const endpoint = `${method} ${path}`;
    const endpointStats = this.metrics.requests.byEndpoint.get(endpoint) || { count: 0, errors: 0 };
    endpointStats.count++;
    if (statusCode >= 400) endpointStats.errors++;
    this.metrics.requests.byEndpoint.set(endpoint, endpointStats);
    
    // Track by method
    const methodStats = this.metrics.requests.byMethod.get(method) || { count: 0, errors: 0 };
    methodStats.count++;
    if (statusCode >= 400) methodStats.errors++;
    this.metrics.requests.byMethod.set(method, methodStats);
    
    // Response time tracking (keep last 100 measurements)
    this.metrics.requests.responseTime.push(responseTime);
    if (this.metrics.requests.responseTime.length > 100) {
      this.metrics.requests.responseTime.shift();
    }
  }

  // AI metrics
  recordAiRequest(success, confidence = null) {
    this.metrics.ai.requests++;
    
    if (success) {
      this.metrics.ai.successes++;
      if (confidence !== null) {
        this.metrics.ai.totalConfidence += confidence;
        this.metrics.ai.avgConfidence = this.metrics.ai.totalConfidence / this.metrics.ai.successes;
      }
    } else {
      this.metrics.ai.failures++;
    }
  }

  // Database metrics
  recordDatabaseQuery(responseTime, error = false) {
    this.metrics.database.queries++;
    
    if (error) {
      this.metrics.database.errors++;
    } else {
      this.metrics.database.totalResponseTime += responseTime;
      this.metrics.database.avgResponseTime = this.metrics.database.totalResponseTime / 
        (this.metrics.database.queries - this.metrics.database.errors);
    }
  }

  // Cache metrics
  recordCacheHit() {
    this.metrics.cache.hits++;
  }

  recordCacheMiss() {
    this.metrics.cache.misses++;
  }

  recordCacheSet() {
    this.metrics.cache.sets++;
  }

  recordCacheDelete() {
    this.metrics.cache.deletes++;
  }

  // Business metrics
  recordNewClient() {
    this.metrics.business.newClients++;
  }

  recordConversation() {
    this.metrics.business.conversations++;
  }

  recordDeal() {
    this.metrics.business.deals++;
  }

  recordReminder() {
    this.metrics.business.reminders++;
  }

  // Get all metrics
  getMetrics() {
    const uptime = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptime / 1000);
    
    return {
      uptime: {
        milliseconds: uptime,
        seconds: uptimeSeconds,
        formatted: this.formatUptime(uptimeSeconds)
      },
      requests: {
        ...this.metrics.requests,
        byEndpoint: Object.fromEntries(this.metrics.requests.byEndpoint),
        byMethod: Object.fromEntries(this.metrics.requests.byMethod),
        avgResponseTime: this.metrics.requests.responseTime.length > 0 ?
          this.metrics.requests.responseTime.reduce((a, b) => a + b, 0) / this.metrics.requests.responseTime.length : 0,
        successRate: this.metrics.requests.total > 0 ?
          (this.metrics.requests.success / this.metrics.requests.total * 100).toFixed(2) + '%' : '0%'
      },
      ai: {
        ...this.metrics.ai,
        successRate: this.metrics.ai.requests > 0 ?
          (this.metrics.ai.successes / this.metrics.ai.requests * 100).toFixed(2) + '%' : '0%'
      },
      database: {
        ...this.metrics.database,
        errorRate: this.metrics.database.queries > 0 ?
          (this.metrics.database.errors / this.metrics.database.queries * 100).toFixed(2) + '%' : '0%'
      },
      cache: {
        ...this.metrics.cache,
        hitRate: (this.metrics.cache.hits + this.metrics.cache.misses) > 0 ?
          (this.metrics.cache.hits / (this.metrics.cache.hits + this.metrics.cache.misses) * 100).toFixed(2) + '%' : '0%'
      },
      business: this.metrics.business,
      memory: process.memoryUsage(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid
      }
    };
  }

  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byEndpoint: new Map(),
        byMethod: new Map(),
        responseTime: []
      },
      ai: {
        requests: 0,
        successes: 0,
        failures: 0,
        avgConfidence: 0,
        totalConfidence: 0
      },
      database: {
        queries: 0,
        errors: 0,
        avgResponseTime: 0,
        totalResponseTime: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        sets: 0,
        deletes: 0
      },
      business: {
        newClients: 0,
        conversations: 0,
        deals: 0,
        reminders: 0
      }
    };
    
    this.startTime = Date.now();
  }
}

// Global metrics instance
const metrics = new MetricsCollector();

// Middleware to track request metrics
export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - start;
    metrics.recordRequest(req.method, req.path, res.statusCode, responseTime);
  });
  
  next();
};

// Health check with comprehensive status
export const healthCheck = async () => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  };

  const checks = {};

  // Database check
  try {
    const { healthCheck: dbHealth } = await import('./database.js');
    await dbHealth();
    checks.database = { status: 'ok', message: 'Connected' };
  } catch (error) {
    checks.database = { status: 'error', message: error.message };
    health.status = 'degraded';
  }

  // OpenAI check
  try {
    const openAiKey = process.env.OPENAI_API_KEY;
    checks.openai = { 
      status: openAiKey ? 'ok' : 'warning', 
      message: openAiKey ? 'Configured' : 'Not configured' 
    };
  } catch (error) {
    checks.openai = { status: 'error', message: error.message };
  }

  // Cache check
  try {
    const cacheHealth = cacheHealthCheck();
    checks.cache = { status: 'ok', ...cacheHealth };
  } catch (error) {
    checks.cache = { status: 'error', message: error.message };
  }

  // Memory check
  const memUsage = process.memoryUsage();
  const memUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  checks.memory = {
    status: memUsageMB > 500 ? 'warning' : 'ok',
    heapUsed: `${memUsageMB}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
  };

  health.checks = checks;
  health.metrics = metrics.getMetrics();

  return health;
};

// Monitoring endpoints
export const monitoringRoutes = (router) => {
  // Metrics endpoint
  router.get('/metrics', (req, res) => {
    res.json(metrics.getMetrics());
  });

  // Health endpoint with detailed checks
  router.get('/health', async (req, res) => {
    try {
      const health = await healthCheck();
      const statusCode = health.status === 'ok' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error) {
      logger.error({ err: error }, 'Health check failed');
      res.status(500).json({
        status: 'error',
        message: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Reset metrics (for testing/debugging)
  router.post('/metrics/reset', (req, res) => {
    metrics.reset();
    res.json({ message: 'Metrics reset successfully' });
  });
};

// Alert system
class AlertManager {
  constructor() {
    this.alerts = [];
    this.thresholds = {
      errorRate: 10, // 10% error rate
      responseTime: 5000, // 5 seconds
      memoryUsage: 500, // 500MB
      cacheHitRate: 50 // 50% cache hit rate
    };
  }

  checkAlerts() {
    const currentMetrics = metrics.getMetrics();
    const alerts = [];

    // Check error rate
    const errorRate = parseFloat(currentMetrics.requests.successRate.replace('%', ''));
    if (100 - errorRate > this.thresholds.errorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `High error rate: ${100 - errorRate}%`,
        threshold: this.thresholds.errorRate
      });
    }

    // Check response time
    if (currentMetrics.requests.avgResponseTime > this.thresholds.responseTime) {
      alerts.push({
        type: 'response_time',
        severity: 'medium',
        message: `High response time: ${currentMetrics.requests.avgResponseTime}ms`,
        threshold: this.thresholds.responseTime
      });
    }

    // Check memory usage
    const memUsageMB = Math.round(currentMetrics.memory.heapUsed / 1024 / 1024);
    if (memUsageMB > this.thresholds.memoryUsage) {
      alerts.push({
        type: 'memory_usage',
        severity: 'medium',
        message: `High memory usage: ${memUsageMB}MB`,
        threshold: this.thresholds.memoryUsage
      });
    }

    // Check cache hit rate
    const cacheHitRate = parseFloat(currentMetrics.cache.hitRate.replace('%', ''));
    if (cacheHitRate < this.thresholds.cacheHitRate && currentMetrics.cache.hits + currentMetrics.cache.misses > 10) {
      alerts.push({
        type: 'cache_hit_rate',
        severity: 'low',
        message: `Low cache hit rate: ${cacheHitRate}%`,
        threshold: this.thresholds.cacheHitRate
      });
    }

    // Log new alerts
    alerts.forEach(alert => {
      if (!this.alerts.find(a => a.type === alert.type)) {
        logger.warn(alert, 'Alert triggered');
      }
    });

    this.alerts = alerts;
    return alerts;
  }

  getAlerts() {
    return this.alerts;
  }
}

const alertManager = new AlertManager();

// Check alerts every minute
setInterval(() => {
  alertManager.checkAlerts();
}, 60000);

export { metrics, alertManager };
export default metrics;
