const axios = require('axios');
const crypto = require('crypto');
const { shopify, createRestClient } = require('../config/shopify');
const { User } = require('../config/database');

const {
  SHOPIFY_API_KEY,
  SHOPIFY_API_SECRET_KEY,
  FACEBOOK_APP_ID,
  FACEBOOK_APP_SECRET,
  HOST
} = process.env;

class AuthController {
  // Shopify OAuth initiation
  async shopifyAuth(ctx) {
    try {
      const shop = ctx.query.shop;
      const embedded = ctx.query.embedded !== '0';
      
      if (!shop) {
        console.log('Missing shop parameter in OAuth request');
        ctx.status = 400;
        ctx.body = { error: 'Missing shop parameter' };
        return;
      }

      // Clean and validate shop domain
      const cleanShop = shop.toLowerCase().trim();
      if (!cleanShop.includes('.myshopify.com') || !/^[a-zA-Z0-9\-]+\.myshopify\.com$/.test(cleanShop)) {
        console.log(`Invalid shop domain: ${shop}`);
        ctx.status = 400;
        ctx.body = { error: 'Invalid shop domain' };
        return;
      }

      console.log(`Starting OAuth for shop: ${cleanShop}`);

      // Use Shopify API library for OAuth
      const authRoute = await shopify.auth.begin({
        shop: cleanShop,
        callbackPath: '/auth/shopify/callback',
        isOnline: false,
        rawRequest: ctx.req,
        rawResponse: ctx.res
      });

      console.log(`Redirecting to Shopify OAuth: ${authRoute}`);
      ctx.redirect(authRoute);
    } catch (error) {
      console.error('Error in shopifyAuth:', error);
      ctx.status = 500;
      ctx.body = { error: 'Authentication failed' };
    }
  }

  // Shopify OAuth callback
  async shopifyCallback(ctx) {
    try {
      // Complete OAuth flow using Shopify API
      const callbackResponse = await shopify.auth.callback({
        rawRequest: ctx.req,
        rawResponse: ctx.res
      });

      const { session } = callbackResponse;
      
      if (!session) {
        ctx.status = 400;
        ctx.body = { error: 'Failed to create session' };
        return;
      }

      // Get shop information using REST client
      const client = createRestClient(session);
      const shopResponse = await client.get({ path: 'shop' });
      const shopInfo = shopResponse.body.shop;

      // Store or update user in database
      const [user, created] = await User.findOrCreate({
        where: { shopDomain: session.shop },
        defaults: {
          shopifyAccessToken: session.accessToken,
          email: shopInfo.email,
          shopName: shopInfo.name,
          currency: shopInfo.currency,
          timezone: shopInfo.iana_timezone,
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
          hasCompletedOnboarding: false,
          settings: {
            autoOptimization: true,
            budgetAlerts: true,
            performanceAlerts: true,
            weeklyReports: true,
            currency: shopInfo.currency || 'USD',
            timezone: shopInfo.iana_timezone || 'UTC'
          }
        }
      });

      if (!created) {
        // Update existing user
        user.shopifyAccessToken = session.accessToken;
        user.email = shopInfo.email;
        user.shopName = shopInfo.name;
        user.currency = shopInfo.currency;
        user.timezone = shopInfo.iana_timezone;
        user.lastLoginAt = new Date();
        await user.save();
      }

      // Store session in Shopify's session storage
      await shopify.config.sessionStorage.storeSession(session);

      // Set session for our app
      ctx.session.userId = user.id;
      ctx.session.shop = session.shop;
      ctx.session.authenticated = true;
      ctx.session.sessionId = session.id;

      // Redirect to embedded app
      const redirectUrl = `${HOST}/app?shop=${session.shop}&host=${Buffer.from(`${session.shop}/admin`).toString('base64')}`;
      ctx.redirect(redirectUrl);
    } catch (error) {
      console.error('Shopify auth callback error:', error);
      ctx.status = 500;
      ctx.body = { error: 'Authentication failed' };
    }
  }

  // Facebook OAuth initiation
  async facebookAuth(ctx) {
    if (!ctx.session.userId) {
      ctx.redirect('/');
      return;
    }

    const redirectUri = `${HOST}/auth/facebook/callback`;
    const scope = 'ads_management,ads_read,business_management,pages_manage_ads,pages_read_engagement';

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=${scope}&` +
      `response_type=code&` +
      `state=${ctx.session.userId}`;

    ctx.redirect(authUrl);
  }

  // Facebook OAuth callback
  async facebookCallback(ctx) {
    const { code, state } = ctx.query;

    if (!code || !ctx.session.userId || state !== ctx.session.userId.toString()) {
      ctx.redirect('/dashboard?error=fb_auth_failed');
      return;
    }

    try {
      // Exchange code for token
      const tokenResponse = await axios.get(
        `https://graph.facebook.com/v18.0/oauth/access_token?` +
        `client_id=${FACEBOOK_APP_ID}&` +
        `client_secret=${FACEBOOK_APP_SECRET}&` +
        `code=${code}&` +
        `redirect_uri=${encodeURIComponent(`${HOST}/auth/facebook/callback`)}`
      );

      const { access_token } = tokenResponse.data;

      // Get user info and ad accounts
      const [userResponse, adAccountsResponse] = await Promise.all([
        axios.get(`https://graph.facebook.com/v18.0/me?access_token=${access_token}`),
        axios.get(`https://graph.facebook.com/v18.0/me/adaccounts?access_token=${access_token}`)
      ]);

      // Update user record
      const user = await User.findByPk(ctx.session.userId);
      user.facebookAccessToken = access_token;
      user.facebookUserId = userResponse.data.id;
      
      // Store the first ad account ID (user can change this later)
      if (adAccountsResponse.data.data && adAccountsResponse.data.data.length > 0) {
        user.facebookAdAccountId = adAccountsResponse.data.data[0].id;
      }

      await user.save();

      ctx.redirect('/dashboard?success=fb_connected');
    } catch (error) {
      console.error('Facebook auth error:', error);
      ctx.redirect('/dashboard?error=fb_auth_failed');
    }
  }

  // Logout
  async logout(ctx) {
    ctx.session = null;
    ctx.body = { success: true, message: 'Logged out successfully' };
  }

  // Helper methods
  async exchangeCodeForToken(shop, code) {
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: SHOPIFY_API_KEY,
      client_secret: SHOPIFY_API_SECRET_KEY,
      code
    });
    return response.data.access_token;
  }

  async getShopInfo(shop, accessToken) {
    const response = await axios.get(
      `https://${shop}/admin/api/2024-01/shop.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data.shop;
  }

  // Middleware to check authentication
  async requireAuth(ctx, next) {
    if (!ctx.session.userId) {
      if (ctx.accepts('json')) {
        ctx.status = 401;
        ctx.body = { error: 'Authentication required' };
      } else {
        ctx.redirect('/');
      }
      return;
    }
    await next();
  }

  // Middleware to check Facebook connection
  async requireFacebookAuth(ctx, next) {
    const user = await User.findByPk(ctx.session.userId);
    if (!user || !user.facebookAccessToken) {
      if (ctx.accepts('json')) {
        ctx.status = 403;
        ctx.body = { error: 'Facebook connection required' };
      } else {
        ctx.redirect('/dashboard?error=fb_required');
      }
      return;
    }
    ctx.state.user = user;
    await next();
  }
}

module.exports = new AuthController();