const crypto = require('crypto');
const { User, Campaign, Performance } = require('../config/database');

class WebhookService {
  // Handle app uninstall webhook
  async handleAppUninstall(ctx) {
    try {
      // Verify webhook authenticity
      if (!this.verifyShopifyWebhook(ctx)) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
      }

      const shopDomain = ctx.get('X-Shopify-Shop-Domain');
      const user = await User.findOne({ where: { shopDomain } });
      
      if (user) {
        // Deactivate user and clean up data
        user.isActive = false;
        user.shopifyAccessToken = null;
        await user.save();
        console.log(`App uninstalled for shop: ${shopDomain}`);
      }
      
      ctx.status = 200;
      ctx.body = { success: true };
    } catch (error) {
      console.error('App uninstall webhook error:', error);
      ctx.status = 500;
      ctx.body = { error: 'Internal server error' };
    }
  }

  // Handle Shopify order webhooks
  async handleOrderWebhook(ctx) {
    try {
      // Verify webhook authenticity
      if (!this.verifyShopifyWebhook(ctx)) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
      }

      const order = ctx.request.body;
      
      // Find user by shop domain
      const shopDomain = ctx.get('X-Shopify-Shop-Domain');
      const user = await User.findOne({ where: { shopDomain } });
      
      if (!user) {
        ctx.status = 404;
        ctx.body = { error: 'Shop not found' };
        return;
      }

      // Process order for campaign attribution
      await this.processOrderAttribution(user, order);
      
      // Send conversion to Facebook if configured
      if (user.facebookAccessToken) {
        await this.sendFacebookConversion(user, order);
      }
      
      ctx.status = 200;
      ctx.body = { success: true };
    } catch (error) {
      console.error('Shopify webhook error:', error);
      ctx.status = 500;
      ctx.body = { error: 'Internal server error' };
    }
  }

  // Handle Facebook webhook events
  async handleFacebookWebhook(ctx) {
    try {
      const body = ctx.request.body;
      
      // Verify webhook
      if (!this.verifyFacebookWebhook(ctx)) {
        ctx.status = 401;
        ctx.body = { error: 'Unauthorized' };
        return;
      }

      // Process Facebook events
      if (body.object === 'page') {
        for (const entry of body.entry) {
          await this.processFacebookEntry(entry);
        }
      }

      ctx.status = 200;
      ctx.body = { success: true };
    } catch (error) {
      console.error('Facebook webhook error:', error);
      ctx.status = 500;
      ctx.body = { error: 'Internal server error' };
    }
  }

  // Verify Shopify webhook signature
  verifyShopifyWebhook(ctx) {
    const hmac = ctx.get('X-Shopify-Hmac-Sha256');
    const body = JSON.stringify(ctx.request.body);
    const hash = crypto
      .createHmac('sha256', process.env.SHOPIFY_API_SECRET_KEY)
      .update(body, 'utf8')
      .digest('base64');
    
    return hash === hmac;
  }

  // Verify Facebook webhook signature
  verifyFacebookWebhook(ctx) {
    const signature = ctx.get('X-Hub-Signature-256');
    const body = JSON.stringify(ctx.request.body);
    const hash = crypto
      .createHmac('sha256', process.env.FACEBOOK_APP_SECRET)
      .update(body, 'utf8')
      .digest('hex');
    
    return signature === `sha256=${hash}`;
  }

  // Process order for campaign attribution
  async processOrderAttribution(user, order) {
    try {
      // Look for UTM parameters or referrer data to attribute to campaigns
      const lineItems = order.line_items || [];
      
      for (const item of lineItems) {
        // Find campaigns for this product
        const campaigns = await Campaign.findAll({
          where: {
            userId: user.id,
            productId: item.product_id.toString(),
            status: 'active'
          }
        });

        for (const campaign of campaigns) {
          // Create performance record for conversion
          await Performance.create({
            campaignId: campaign.id,
            conversions: item.quantity,
            revenue: parseFloat(item.price) * item.quantity,
            recordedAt: new Date(),
            dateStart: new Date(),
            dateEnd: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Order attribution error:', error);
    }
  }

  // Process Facebook webhook entry
  async processFacebookEntry(entry) {
    try {
      // Handle different types of Facebook events
      if (entry.changes) {
        for (const change of entry.changes) {
          await this.processFacebookChange(change);
        }
      }
    } catch (error) {
      console.error('Facebook entry processing error:', error);
    }
  }

  // Process Facebook change event
  async processFacebookChange(change) {
    try {
      const { field, value } = change;
      
      switch (field) {
        case 'ads':
          await this.handleAdChange(value);
          break;
        case 'campaigns':
          await this.handleCampaignChange(value);
          break;
        case 'adsets':
          await this.handleAdSetChange(value);
          break;
        default:
          console.log('Unhandled Facebook change:', field);
      }
    } catch (error) {
      console.error('Facebook change processing error:', error);
    }
  }

  // Handle ad change events
  async handleAdChange(value) {
    // Implementation for handling ad changes
    console.log('Ad change event:', value);
  }

  // Handle campaign change events
  async handleCampaignChange(value) {
    // Implementation for handling campaign changes
    console.log('Campaign change event:', value);
  }

  // Handle ad set change events
  async handleAdSetChange(value) {
    // Implementation for handling ad set changes
    console.log('Ad set change event:', value);
  }

  // Send conversion event to Facebook Conversions API
  async sendFacebookConversion(user, order) {
    try {
      const axios = require('axios');
      
      // Prepare conversion data
      const eventData = {
        data: [{
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_source_url: `https://${user.shopDomain}`,
          user_data: {
            em: order.email ? crypto.createHash('sha256').update(order.email.toLowerCase()).digest('hex') : null,
            fn: order.billing_address?.first_name ? crypto.createHash('sha256').update(order.billing_address.first_name.toLowerCase()).digest('hex') : null,
            ln: order.billing_address?.last_name ? crypto.createHash('sha256').update(order.billing_address.last_name.toLowerCase()).digest('hex') : null,
            ph: order.billing_address?.phone ? crypto.createHash('sha256').update(order.billing_address.phone.replace(/\D/g, '')).digest('hex') : null
          },
          custom_data: {
            currency: order.currency,
            value: parseFloat(order.total_price),
            order_id: order.id.toString(),
            content_ids: order.line_items.map(item => item.product_id.toString()),
            content_type: 'product',
            num_items: order.line_items.reduce((sum, item) => sum + item.quantity, 0)
          }
        }]
      };

      // Remove null values
      Object.keys(eventData.data[0].user_data).forEach(key => {
        if (eventData.data[0].user_data[key] === null) {
          delete eventData.data[0].user_data[key];
        }
      });

      // Send to Facebook Conversions API (using pixel ID from user settings)
      if (user.facebookPixelId) {
        const response = await axios.post(
          `https://graph.facebook.com/v18.0/${user.facebookPixelId}/events`,
          eventData,
          {
            headers: {
              'Authorization': `Bearer ${user.facebookAccessToken}`,
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('Facebook conversion sent successfully:', response.data);
      }
    } catch (error) {
      console.error('Error sending Facebook conversion:', error);
    }
  }

  // Setup webhooks for a new user
  async setupWebhooks(user) {
    try {
      const webhooks = [
        {
          topic: 'app/uninstalled',
          address: `${process.env.HOST}/webhooks/shopify/app/uninstalled`
        },
        {
          topic: 'orders/create',
          address: `${process.env.HOST}/webhooks/shopify/orders/create`
        },
        {
          topic: 'orders/updated',
          address: `${process.env.HOST}/webhooks/shopify/orders/updated`
        }
      ];

      for (const webhook of webhooks) {
        await this.createShopifyWebhook(user, webhook);
      }
    } catch (error) {
      console.error('Webhook setup error:', error);
    }
  }

  // Create Shopify webhook
  async createShopifyWebhook(user, webhook) {
    try {
      const response = await fetch(
        `https://${user.shopDomain}/admin/api/2024-01/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ webhook })
        }
      );

      if (response.ok) {
        console.log(`Webhook created: ${webhook.topic}`);
      } else {
        console.error(`Failed to create webhook: ${webhook.topic}`);
      }
    } catch (error) {
      console.error('Shopify webhook creation error:', error);
    }
  }
}

module.exports = new WebhookService();