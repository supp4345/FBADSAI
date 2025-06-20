const axios = require('axios');
const { User } = require('../config/database');

class ShopifyService {
  // Get all products from Shopify
  async getShopifyProducts(userId, limit = 50, page = 1) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        throw new Error('Shopify access token not found');
      }

      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/2024-01/products.json`,
        {
          params: {
            limit,
            page,
            status: 'active'
          },
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.products.map(product => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        body_html: product.body_html,
        vendor: product.vendor,
        product_type: product.product_type,
        tags: product.tags,
        status: product.status,
        images: product.images.map(img => ({
          id: img.id,
          src: img.src,
          alt: img.alt
        })),
        variants: product.variants.map(variant => ({
          id: variant.id,
          title: variant.title,
          price: variant.price,
          compare_at_price: variant.compare_at_price,
          sku: variant.sku,
          inventory_quantity: variant.inventory_quantity
        })),
        options: product.options,
        created_at: product.created_at,
        updated_at: product.updated_at
      }));
    } catch (error) {
      console.error('Shopify products fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Shopify products: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Get single product from Shopify
  async getShopifyProduct(userId, productId) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        throw new Error('Shopify access token not found');
      }

      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/2024-01/products/${productId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const product = response.data.product;
      return {
        id: product.id,
        title: product.title,
        handle: product.handle,
        body_html: product.body_html,
        vendor: product.vendor,
        product_type: product.product_type,
        tags: product.tags,
        status: product.status,
        images: product.images.map(img => ({
          id: img.id,
          src: img.src,
          alt: img.alt
        })),
        variants: product.variants.map(variant => ({
          id: variant.id,
          title: variant.title,
          price: variant.price,
          compare_at_price: variant.compare_at_price,
          sku: variant.sku,
          inventory_quantity: variant.inventory_quantity
        })),
        options: product.options,
        created_at: product.created_at,
        updated_at: product.updated_at
      };
    } catch (error) {
      console.error('Shopify product fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Shopify product: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Get orders from Shopify
  async getShopifyOrders(userId, limit = 50, status = 'any') {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        throw new Error('Shopify access token not found');
      }

      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/2024-01/orders.json`,
        {
          params: {
            limit,
            status,
            financial_status: 'paid'
          },
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.orders.map(order => ({
        id: order.id,
        order_number: order.order_number,
        email: order.email,
        total_price: order.total_price,
        subtotal_price: order.subtotal_price,
        total_tax: order.total_tax,
        currency: order.currency,
        financial_status: order.financial_status,
        fulfillment_status: order.fulfillment_status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        customer: order.customer ? {
          id: order.customer.id,
          email: order.customer.email,
          first_name: order.customer.first_name,
          last_name: order.customer.last_name
        } : null,
        line_items: order.line_items.map(item => ({
          id: item.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          total_discount: item.total_discount
        })),
        shipping_address: order.shipping_address,
        billing_address: order.billing_address
      }));
    } catch (error) {
      console.error('Shopify orders fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Shopify orders: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Get customers from Shopify
  async getShopifyCustomers(userId, limit = 50) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        throw new Error('Shopify access token not found');
      }

      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/2024-01/customers.json`,
        {
          params: { limit },
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.customers.map(customer => ({
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        phone: customer.phone,
        total_spent: customer.total_spent,
        orders_count: customer.orders_count,
        state: customer.state,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        addresses: customer.addresses,
        tags: customer.tags
      }));
    } catch (error) {
      console.error('Shopify customers fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Shopify customers: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Get shop information
  async getShopInfo(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        throw new Error('Shopify access token not found');
      }

      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const shop = response.data.shop;
      return {
        id: shop.id,
        name: shop.name,
        email: shop.email,
        domain: shop.domain,
        myshopify_domain: shop.myshopify_domain,
        currency: shop.currency,
        timezone: shop.timezone,
        country_name: shop.country_name,
        province: shop.province,
        phone: shop.phone,
        plan_name: shop.plan_name,
        created_at: shop.created_at,
        updated_at: shop.updated_at
      };
    } catch (error) {
      console.error('Shopify shop info fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch shop information: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Search products
  async searchProducts(userId, query, limit = 20) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        throw new Error('Shopify access token not found');
      }

      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/2024-01/products.json`,
        {
          params: {
            limit,
            title: query,
            status: 'active'
          },
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.products.map(product => ({
        id: product.id,
        title: product.title,
        handle: product.handle,
        product_type: product.product_type,
        vendor: product.vendor,
        tags: product.tags,
        images: product.images.slice(0, 1), // Just first image for search results
        variants: product.variants.map(variant => ({
          id: variant.id,
          title: variant.title,
          price: variant.price,
          inventory_quantity: variant.inventory_quantity
        }))
      }));
    } catch (error) {
      console.error('Shopify product search error:', error.response?.data || error.message);
      throw new Error(`Failed to search products: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Get product analytics
  async getProductAnalytics(userId, productId, days = 30) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        throw new Error('Shopify access token not found');
      }

      // Get orders containing this product
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/2024-01/orders.json`,
        {
          params: {
            limit: 250,
            status: 'any',
            financial_status: 'paid',
            created_at_min: startDate.toISOString(),
            created_at_max: endDate.toISOString()
          },
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      // Filter orders that contain the specific product
      const productOrders = response.data.orders.filter(order =>
        order.line_items.some(item => item.product_id.toString() === productId.toString())
      );

      // Calculate analytics
      const totalRevenue = productOrders.reduce((sum, order) => {
        const productItems = order.line_items.filter(item => 
          item.product_id.toString() === productId.toString()
        );
        return sum + productItems.reduce((itemSum, item) => 
          itemSum + (parseFloat(item.price) * item.quantity), 0
        );
      }, 0);

      const totalQuantitySold = productOrders.reduce((sum, order) => {
        const productItems = order.line_items.filter(item => 
          item.product_id.toString() === productId.toString()
        );
        return sum + productItems.reduce((itemSum, item) => itemSum + item.quantity, 0);
      }, 0);

      return {
        productId,
        period: { days, startDate, endDate },
        metrics: {
          totalRevenue: totalRevenue.toFixed(2),
          totalQuantitySold,
          totalOrders: productOrders.length,
          averageOrderValue: productOrders.length > 0 ? (totalRevenue / productOrders.length).toFixed(2) : '0.00'
        },
        orders: productOrders.slice(0, 10) // Return last 10 orders for reference
      };
    } catch (error) {
      console.error('Product analytics fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch product analytics: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Create webhook
  async createWebhook(userId, topic, address) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        throw new Error('Shopify access token not found');
      }

      const response = await axios.post(
        `https://${user.shopDomain}/admin/api/2024-01/webhooks.json`,
        {
          webhook: {
            topic,
            address,
            format: 'json'
          }
        },
        {
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.webhook;
    } catch (error) {
      console.error('Webhook creation error:', error.response?.data || error.message);
      throw new Error(`Failed to create webhook: ${error.response?.data?.errors || error.message}`);
    }
  }

  // Validate Shopify connection
  async validateConnection(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        return { valid: false, error: 'No access token found' };
      }

      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/2024-01/shop.json`,
        {
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        valid: true,
        shop: {
          name: response.data.shop.name,
          domain: response.data.shop.domain,
          email: response.data.shop.email
        }
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Get collection data for better targeting
  async getCollections(userId, limit = 50) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.shopifyAccessToken) {
        throw new Error('Shopify access token not found');
      }

      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/2024-01/collections.json`,
        {
          params: { limit },
          headers: {
            'X-Shopify-Access-Token': user.shopifyAccessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.collections.map(collection => ({
        id: collection.id,
        title: collection.title,
        handle: collection.handle,
        body_html: collection.body_html,
        published_at: collection.published_at,
        sort_order: collection.sort_order,
        template_suffix: collection.template_suffix,
        products_count: collection.products_count
      }));
    } catch (error) {
      console.error('Collections fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch collections: ${error.response?.data?.errors || error.message}`);
    }
  }
}

module.exports = new ShopifyService();