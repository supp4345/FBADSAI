// Performance optimization middleware for Core Web Vitals compliance

// Cache control middleware
const cacheControl = (maxAge = 3600) => {
  return async (ctx, next) => {
    await next();
    
    // Set cache headers for static assets
    if (ctx.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      ctx.set('Cache-Control', `public, max-age=${maxAge * 24}`); // 24 hours for assets
      ctx.set('Expires', new Date(Date.now() + maxAge * 24 * 1000).toUTCString());
    } else if (ctx.path.startsWith('/api/')) {
      // Short cache for API responses
      ctx.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    } else {
      // Default cache for pages
      ctx.set('Cache-Control', `public, max-age=${maxAge}`); // 1 hour
    }
  };
};

// Resource hints middleware for better loading performance
const resourceHints = async (ctx, next) => {
  await next();
  
  if (ctx.type && ctx.type.includes('html')) {
    // Add preconnect headers for external resources
    ctx.set('Link', [
      '<https://fonts.googleapis.com>; rel=preconnect',
      '<https://fonts.gstatic.com>; rel=preconnect; crossorigin',
      '<https://unpkg.com>; rel=preconnect',
      '<https://graph.facebook.com>; rel=preconnect',
      '<https://connect.facebook.net>; rel=preconnect'
    ].join(', '));
  }
};

// Security headers for better performance and security
const securityHeaders = async (ctx, next) => {
  await next();
  
  // Security headers
  ctx.set('X-Content-Type-Options', 'nosniff');
  ctx.set('X-XSS-Protection', '1; mode=block');
  ctx.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Performance headers
  ctx.set('X-DNS-Prefetch-Control', 'on');
  
  // Remove server header for security
  ctx.remove('X-Powered-By');
};

// Response time tracking for monitoring
const responseTime = async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  
  ctx.set('X-Response-Time', `${ms}ms`);
  
  // Log slow responses
  if (ms > 1000) {
    console.warn(`Slow response: ${ctx.method} ${ctx.path} - ${ms}ms`);
  }
};

// ETags for better caching
const etag = async (ctx, next) => {
  await next();
  
  if (ctx.body && ctx.status === 200) {
    const crypto = require('crypto');
    const hash = crypto.createHash('md5').update(JSON.stringify(ctx.body)).digest('hex');
    ctx.set('ETag', `"${hash}"`);
    
    // Check if client has the same version
    if (ctx.get('If-None-Match') === `"${hash}"`) {
      ctx.status = 304;
      ctx.body = null;
    }
  }
};

// Preload critical resources
const preloadCritical = async (ctx, next) => {
  await next();
  
  if (ctx.type && ctx.type.includes('html')) {
    const preloadLinks = [
      '</css/app.css>; rel=preload; as=style',
      '</js/app.js>; rel=preload; as=script',
      '<https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap>; rel=preload; as=style'
    ];
    
    const existingLink = ctx.get('Link');
    const newLinks = existingLink ? `${existingLink}, ${preloadLinks.join(', ')}` : preloadLinks.join(', ');
    ctx.set('Link', newLinks);
  }
};

// Content optimization for faster loading
const contentOptimization = async (ctx, next) => {
  await next();
  
  // Minify HTML responses in production
  if (process.env.NODE_ENV === 'production' && ctx.type && ctx.type.includes('html') && ctx.body) {
    ctx.body = ctx.body
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/>\s+</g, '><') // Remove spaces between tags
      .trim();
  }
};

// Core Web Vitals monitoring
const webVitalsMonitoring = async (ctx, next) => {
  const startTime = process.hrtime.bigint();
  
  await next();
  
  const endTime = process.hrtime.bigint();
  const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
  
  // Add timing headers for monitoring
  ctx.set('Server-Timing', `total;dur=${duration.toFixed(2)}`);
  
  // Log performance metrics
  if (ctx.path.startsWith('/app') || ctx.path === '/') {
    console.log(`Performance: ${ctx.method} ${ctx.path} - ${duration.toFixed(2)}ms`);
    
    // Alert on slow page loads (potential LCP issues)
    if (duration > 2500) {
      console.warn(`Potential LCP issue: ${ctx.path} took ${duration.toFixed(2)}ms`);
    }
  }
};

module.exports = {
  cacheControl,
  resourceHints,
  securityHeaders,
  responseTime,
  etag,
  preloadCritical,
  contentOptimization,
  webVitalsMonitoring
};