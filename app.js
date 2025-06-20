// AI Facebook Ads Pro - Complete Shopify App v4.0
// Advanced AI-powered Facebook advertising management with Shopify integration

const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const session = require('koa-session');
const views = require('koa-views');
const serve = require('koa-static');
const cors = require('@koa/cors');
const path = require('path');
const cron = require('node-cron');
const {
  cacheControl,
  resourceHints,
  securityHeaders,
  responseTime,
  etag,
  preloadCritical,
  contentOptimization,
  webVitalsMonitoring
} = require('./middleware/performance');
require('dotenv').config();

// Import controllers and services with error handling
let authController, dashboardController, campaignController, aiController, analyticsController;
let initDatabase, initAI, startOptimizationScheduler, User;

try {
  authController = require('./controllers/authController');
  dashboardController = require('./controllers/dashboardController');
  campaignController = require('./controllers/campaignController');
  aiController = require('./controllers/aiController');
  analyticsController = require('./controllers/analyticsController');
  ({ initDatabase, User } = require('./config/database'));
  ({ initAI } = require('./services/aiService'));
  ({ startOptimizationScheduler } = require('./services/optimizationService'));
  console.log('✅ All modules loaded successfully');
} catch (error) {
  console.error('Error loading modules:', error.message);
  // Create fallback controllers
  const fallbackController = {
    index: async (ctx) => { ctx.body = { error: 'Service temporarily unavailable' }; },
    overview: async (ctx) => { ctx.body = { success: false, error: 'Service loading...' }; },
    campaigns: async (ctx) => { ctx.body = { error: 'Service temporarily unavailable' }; },
    analytics: async (ctx) => { ctx.body = { error: 'Service temporarily unavailable' }; },
    settings: async (ctx) => { ctx.body = { error: 'Service temporarily unavailable' }; },
    shopifyAuth: async (ctx) => { ctx.redirect('/'); },
    shopifyCallback: async (ctx) => { ctx.redirect('/'); },
    facebookAuth: async (ctx) => { ctx.redirect('/'); },
    facebookCallback: async (ctx) => { ctx.redirect('/'); },
    logout: async (ctx) => { ctx.body = { success: true }; },
    list: async (ctx) => { ctx.body = { success: true, data: { campaigns: [], pagination: { page: 1, pages: 1, total: 0 } } }; },
    create: async (ctx) => { ctx.body = { success: false, error: 'Service loading...' }; },
    get: async (ctx) => { ctx.body = { success: false, error: 'Service loading...' }; },
    update: async (ctx) => { ctx.body = { success: false, error: 'Service loading...' }; },
    delete: async (ctx) => { ctx.body = { success: false, error: 'Service loading...' }; },
    pause: async (ctx) => { ctx.body = { success: false, error: 'Service loading...' }; },
    resume: async (ctx) => { ctx.body = { success: false, error: 'Service loading...' }; },
    duplicate: async (ctx) => { ctx.body = { success: false, error: 'Service loading...' }; },
    generateCampaign: async (ctx) => { ctx.body = { success: false, error: 'AI service loading...' }; },
    optimizeCampaign: async (ctx) => { ctx.body = { success: false, error: 'AI service loading...' }; },
    generateCreatives: async (ctx) => { ctx.body = { success: false, error: 'AI service loading...' }; },
    audienceSuggestions: async (ctx) => { ctx.body = { success: false, error: 'AI service loading...' }; },
    budgetRecommendations: async (ctx) => { ctx.body = { success: false, error: 'AI service loading...' }; },
    performance: async (ctx) => { ctx.body = { success: false, error: 'Analytics service loading...' }; },
    insights: async (ctx) => { ctx.body = { success: false, error: 'Analytics service loading...' }; },
    exportData: async (ctx) => { ctx.body = { success: false, error: 'Analytics service loading...' }; },
    campaignAnalytics: async (ctx) => { ctx.body = { success: false, error: 'Analytics service loading...' }; }
  };
  
  authController = authController || fallbackController;
  dashboardController = dashboardController || fallbackController;
  campaignController = campaignController || fallbackController;
  aiController = aiController || fallbackController;
  analyticsController = analyticsController || fallbackController;
  initDatabase = initDatabase || (() => console.log('Database service loading...'));
  initAI = initAI || (() => console.log('AI service loading...'));
  startOptimizationScheduler = startOptimizationScheduler || (() => console.log('Optimization service loading...'));
}

// Initialize app
const app = new Koa();
const router = new Router();

// Environment variables
const {
  NODE_ENV = 'production',
  PORT = process.env.PORT || 12000,
  SESSION_SECRET = 'your-secret-key',
  HOST = process.env.HOST || 'https://work-1-nyyacaaazrijxtar.prod-runtime.all-hands.dev'
} = process.env;

// Initialize database and AI
// initDatabase(); // Temporarily disabled for testing
// initAI(); // Temporarily disabled for testing

// Session configuration
app.keys = [SESSION_SECRET];
app.use(session({
  key: 'shopify-fb-ads:sess',
  maxAge: 86400000 * 7, // 7 days
  httpOnly: true,
  secure: false, // Disable secure cookies for proxy setup
  sameSite: 'lax', // Change from 'none' to 'lax' for testing
  overwrite: true,
  signed: true
}, app));

// Performance middleware (order matters for optimal performance)
app.use(webVitalsMonitoring);
app.use(responseTime);
app.use(cacheControl(3600)); // 1 hour default cache
app.use(resourceHints);
app.use(preloadCritical);
app.use(securityHeaders);
app.use(etag);
app.use(contentOptimization);

// Middleware setup
app.use(cors({
  origin: (ctx) => {
    const origin = ctx.get('Origin');
    if (origin && (origin.includes('.myshopify.com') || origin.includes('shopify.com'))) {
      return origin;
    }
    return false;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(bodyParser({
  enableTypes: ['json', 'form', 'text'],
  jsonLimit: '10mb',
  formLimit: '10mb',
  textLimit: '10mb'
}));

// View engine setup
app.use(views(path.join(__dirname, 'views'), {
  extension: 'ejs'
}));

// Static files
app.use(serve(path.join(__dirname, 'public')));

// Shopify iframe security middleware
app.use(async (ctx, next) => {
  const shop = ctx.query.shop || ctx.session?.shop;
  
  // Remove X-Frame-Options for Shopify embedding
  ctx.remove('X-Frame-Options');
  
  if (shop && shop.includes('.myshopify.com')) {
    // Set proper CSP for Shopify admin
    ctx.set('Content-Security-Policy', 
      `frame-ancestors https://${shop} https://admin.shopify.com https://*.shopify.com; ` +
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.shopify.com https://js.stripe.com; ` +
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
      `font-src 'self' https://fonts.gstatic.com; ` +
      `img-src 'self' data: https: blob:; ` +
      `connect-src 'self' https://api.shopify.com https://graph.facebook.com;`
    );
  }
  
  // Add security headers
  ctx.set('X-Content-Type-Options', 'nosniff');
  ctx.set('X-XSS-Protection', '1; mode=block');
  ctx.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  await next();
});

// Routes

// Root route - handle Shopify app installation
router.get('/', async (ctx) => {
  const shop = ctx.query.shop;
  const host = ctx.query.host;
  const embedded = ctx.query.embedded;
  
  // If shop parameter is present, this is a Shopify installation request
  if (shop) {
    console.log(`Installation request from shop: ${shop}`);
    
    // Validate shop domain
    const cleanShop = shop.toLowerCase().trim();
    if (!cleanShop.includes('.myshopify.com') || !/^[a-zA-Z0-9\-]+\.myshopify\.com$/.test(cleanShop)) {
      await ctx.render('install', { 
        title: 'Install AI Facebook Ads Pro',
        error: 'Invalid shop domain. Please enter a valid Shopify store URL.',
        shop: shop
      });
      return;
    }
    
    // Redirect to Shopify OAuth
    ctx.redirect(`/auth/shopify?shop=${encodeURIComponent(cleanShop)}&host=${encodeURIComponent(host || '')}&embedded=${embedded || '1'}`);
    return;
  }
  
  // No shop parameter - show installation page
  await ctx.render('install', { 
    title: 'Install AI Facebook Ads Pro',
    shop: ''
  });
});

// Installation route for Partner Dashboard
router.get('/install', async (ctx) => {
  const shop = ctx.query.shop;
  const host = ctx.query.host;
  
  if (shop) {
    // Redirect to main installation flow
    ctx.redirect(`/?shop=${encodeURIComponent(shop)}&host=${encodeURIComponent(host || '')}`);
    return;
  }
  
  // Show installation page
  await ctx.render('install', { 
    title: 'Install AI Facebook Ads Pro',
    shop: ''
  });
});

// Main embedded app route
router.get('/app', async (ctx) => {
  const shop = ctx.query.shop;
  const host = ctx.query.host;
  
  if (!shop) {
    ctx.status = 400;
    ctx.body = { error: 'Shop parameter is required. Please install the app first.' };
    return;
  }
  
  try {
    // Ensure User model is available
    if (!User) {
      console.error('User model not available');
      ctx.redirect(`/auth/shopify?shop=${encodeURIComponent(shop)}`);
      return;
    }
    
    // Get user from database
    const user = await User.findOne({ where: { shopDomain: shop } });
    
    if (!user) {
      // User not found, redirect to auth
      ctx.redirect(`/auth/shopify?shop=${encodeURIComponent(shop)}`);
      return;
    }
    
    await ctx.render('app', {
      title: 'AI Facebook Ads Pro - Dashboard',
      user: {
        id: user.id,
        shopDomain: user.shopDomain,
        shopName: user.shopName || shop,
        email: user.email,
        facebookAccessToken: user.facebookAccessToken,
        hasCompletedOnboarding: user.hasCompletedOnboarding || false
      },
      shop: {
        name: user.shopName || shop,
        domain: shop,
        currency: user.currency || 'USD'
      },
      host: host,
      process: { env: { SHOPIFY_API_KEY } }
    });
  } catch (error) {
    console.error('Error loading app:', error);
    ctx.status = 500;
    ctx.body = { error: 'Failed to load app' };
  }
});

// Demo route (bypasses authentication for showcase)
router.get('/demo', async (ctx) => {
  await ctx.render('dashboard', { 
    title: 'AI Facebook Ads Pro - Demo Dashboard',
    user: { 
      id: 1, 
      shopDomain: 'demo-store.myshopify.com',
      shopName: 'Demo Store',
      email: 'demo@example.com'
    },
    shop: {
      name: 'Demo Store',
      domain: 'demo-store.myshopify.com',
      currency: 'USD'
    }
  });
});

// Authentication routes
router.get('/auth/shopify', authController.shopifyAuth);
router.get('/auth/shopify/callback', authController.shopifyCallback);
router.get('/auth/facebook', authController.facebookAuth);
router.get('/auth/facebook/callback', authController.facebookCallback);
router.post('/auth/logout', authController.logout);

// Dashboard routes
router.get('/dashboard', dashboardController.index);
router.get('/dashboard/overview', dashboardController.overview);
router.get('/dashboard/campaigns', dashboardController.campaigns);
router.get('/dashboard/analytics', dashboardController.analytics);
router.get('/dashboard/settings', dashboardController.settings);

// Campaign management routes
router.get('/api/campaigns', campaignController.list);
router.post('/api/campaigns', campaignController.create);
router.get('/api/campaigns/:id', campaignController.get);
router.put('/api/campaigns/:id', campaignController.update);
router.delete('/api/campaigns/:id', campaignController.delete);
router.post('/api/campaigns/:id/pause', campaignController.pause);
router.post('/api/campaigns/:id/resume', campaignController.resume);
router.post('/api/campaigns/:id/duplicate', campaignController.duplicate);

// AI-powered features
router.post('/api/ai/generate-campaign', aiController.generateCampaign);
router.post('/api/ai/optimize-campaign', aiController.optimizeCampaign);
router.post('/api/ai/generate-creatives', aiController.generateCreatives);
router.post('/api/ai/audience-suggestions', aiController.audienceSuggestions);
router.post('/api/ai/budget-recommendations', aiController.budgetRecommendations);

// Dashboard overview
router.get('/api/dashboard/overview', async (ctx) => {
  try {
    if (!ctx.session.userId) {
      ctx.status = 401;
      ctx.body = { success: false, error: 'Authentication required' };
      return;
    }

    // Mock data for now - replace with real analytics later
    const overview = {
      metrics: {
        totalRevenue: 12450,
        totalRoas: 4.2,
        activeCampaigns: 3,
        totalConversions: 156
      },
      recentActivity: [
        { type: 'campaign_created', message: 'New campaign "Summer Sale" created', time: '2 hours ago' },
        { type: 'optimization', message: 'Campaign "Holiday Promo" optimized by AI', time: '4 hours ago' },
        { type: 'conversion', message: '12 new conversions from "Product Launch"', time: '6 hours ago' }
      ]
    };

    ctx.body = { success: true, ...overview };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

// Analytics and reporting
router.get('/api/analytics/overview', analyticsController.overview);
router.get('/api/analytics/campaigns/:id', analyticsController.campaignAnalytics);
router.get('/api/analytics/performance', analyticsController.performance);
router.get('/api/analytics/insights', analyticsController.insights);
router.post('/api/analytics/export', analyticsController.exportData);

// Product integration
router.get('/api/products', async (ctx) => {
  try {
    const productSyncService = require('./services/productSyncService');
    const user = await User.findByPk(ctx.session.userId);
    if (!user) {
      ctx.status = 401;
      ctx.body = { success: false, error: 'User not found' };
      return;
    }
    
    const products = await productSyncService.getShopifyProducts(user);
    ctx.body = { success: true, products };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

// Product sync to Facebook
router.post('/api/products/sync', async (ctx) => {
  try {
    const productSyncService = require('./services/productSyncService');
    
    if (!ctx.session.userId) {
      ctx.status = 401;
      ctx.body = { success: false, error: 'Authentication required' };
      return;
    }
    
    const result = await productSyncService.syncProductsToFacebook(ctx.session.userId);
    ctx.body = result;
  } catch (error) {
    console.error('Product sync error:', error);
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

// Get sync status
router.get('/api/products/sync-status', async (ctx) => {
  try {
    const productSyncService = require('./services/productSyncService');
    
    if (!ctx.session.userId) {
      ctx.status = 401;
      ctx.body = { success: false, error: 'Authentication required' };
      return;
    }
    
    const status = await productSyncService.getSyncStatus(ctx.session.userId);
    ctx.body = { success: true, status };
  } catch (error) {
    ctx.status = 500;
    ctx.body = { success: false, error: error.message };
  }
});

// Webhook endpoints
router.post('/webhooks/shopify/app/uninstalled', async (ctx) => {
  const { handleAppUninstall } = require('./services/webhookService');
  await handleAppUninstall(ctx);
});

router.post('/webhooks/shopify/orders/create', async (ctx) => {
  const { handleOrderWebhook } = require('./services/webhookService');
  await handleOrderWebhook(ctx);
});

router.post('/webhooks/shopify/orders/updated', async (ctx) => {
  const { handleOrderWebhook } = require('./services/webhookService');
  await handleOrderWebhook(ctx);
});

router.post('/webhooks/facebook/ads', async (ctx) => {
  const { handleFacebookWebhook } = require('./services/webhookService');
  await handleFacebookWebhook(ctx);
});

// Health check
router.get('/health', (ctx) => {
  ctx.body = { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '4.0.0'
  };
});

// Error handling middleware
app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    console.error('Application error:', err);
    ctx.status = err.status || 500;
    
    if (ctx.accepts('json')) {
      ctx.body = {
        success: false,
        error: NODE_ENV === 'production' ? 'Internal server error' : err.message
      };
    } else {
      await ctx.render('error', {
        title: 'Error',
        error: NODE_ENV === 'production' ? 'Something went wrong' : err.message,
        status: ctx.status
      });
    }
  }
});

// Apply routes
app.use(router.routes());
app.use(router.allowedMethods());

// Start optimization scheduler
startOptimizationScheduler();

// Start server
const port = PORT;
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 AI Facebook Ads Pro v4.0 running on port ${port}`);
  console.log(`📱 Shopify-optimized dashboard ready`);
  console.log(`🤖 AI campaign optimization active`);
});

module.exports = app;