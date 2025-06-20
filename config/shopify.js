const { shopifyApi, LATEST_API_VERSION } = require('@shopify/shopify-api');
const { MemorySessionStorage } = require('@shopify/shopify-app-session-storage-memory');

require('dotenv').config();

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET_KEY,
  HOST,
  NODE_ENV = 'production'
} = process.env;

if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET_KEY) {
  throw new Error('Missing required Shopify API credentials');
}

// Initialize Shopify API
const shopify = shopifyApi({
  apiKey: SHOPIFY_API_KEY,
  apiSecretKey: SHOPIFY_API_SECRET_KEY,
  scopes: ['read_products', 'write_products', 'read_orders', 'write_orders', 'read_customers', 'read_customer_events'],
  hostName: HOST.replace(/https?:\/\//, ''),
  hostScheme: 'https',
  apiVersion: LATEST_API_VERSION,
  isEmbeddedApp: true,
  sessionStorage: new MemorySessionStorage(),
  logger: {
    level: NODE_ENV === 'development' ? 'debug' : 'info',
    httpRequests: NODE_ENV === 'development',
    timestamps: true
  }
});

// Middleware to verify session tokens
const verifySessionToken = async (ctx, next) => {
  try {
    const authHeader = ctx.get('Authorization');
    const sessionToken = authHeader?.replace('Bearer ', '') || ctx.query.session;
    
    if (!sessionToken) {
      ctx.status = 401;
      ctx.body = { error: 'Missing session token' };
      return;
    }

    // Verify the session token
    const payload = shopify.session.decodeSessionToken(sessionToken);
    
    // Get session from storage
    const session = await shopify.config.sessionStorage.loadSession(payload.sid);
    
    if (!session) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid session' };
      return;
    }

    // Add session to context
    ctx.state.shopify = {
      session,
      shop: session.shop,
      accessToken: session.accessToken
    };

    await next();
  } catch (error) {
    console.error('Session verification error:', error);
    ctx.status = 401;
    ctx.body = { error: 'Invalid session token' };
  }
};

// Middleware to verify webhook requests
const verifyWebhook = (ctx, next) => {
  try {
    const hmac = ctx.get('X-Shopify-Hmac-Sha256');
    const body = ctx.request.rawBody;
    
    if (!hmac || !body) {
      ctx.status = 401;
      ctx.body = { error: 'Missing webhook verification data' };
      return;
    }

    const isValid = shopify.webhooks.verify({
      rawBody: body,
      signature: hmac
    });

    if (!isValid) {
      ctx.status = 401;
      ctx.body = { error: 'Invalid webhook signature' };
      return;
    }

    return next();
  } catch (error) {
    console.error('Webhook verification error:', error);
    ctx.status = 401;
    ctx.body = { error: 'Webhook verification failed' };
  }
};

// Helper to create GraphQL client
const createGraphQLClient = (session) => {
  return new shopify.clients.Graphql({
    session,
    apiVersion: LATEST_API_VERSION
  });
};

// Helper to create REST client
const createRestClient = (session) => {
  return new shopify.clients.Rest({
    session,
    apiVersion: LATEST_API_VERSION
  });
};

module.exports = {
  shopify,
  verifySessionToken,
  verifyWebhook,
  createGraphQLClient,
  createRestClient,
  LATEST_API_VERSION
};