const axios = require('axios');
const { createRestClient } = require('../config/shopify');
const { User } = require('../config/database');

class ProductSyncService {
  // Sync products from Shopify to Facebook catalog
  async syncProductsToFacebook(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.facebookAccessToken || !user.shopifyAccessToken) {
        throw new Error('Missing required authentication tokens');
      }

      // Get Shopify products
      const shopifyProducts = await this.getShopifyProducts(user);
      
      // Create or update Facebook catalog
      const catalogId = await this.ensureFacebookCatalog(user);
      
      // Sync products to Facebook
      const syncResults = await this.syncProductsToCatalog(user, shopifyProducts, catalogId);
      
      // Update user onboarding status
      user.hasCompletedOnboarding = true;
      user.facebookCatalogId = catalogId;
      await user.save();
      
      return {
        success: true,
        catalogId,
        syncedProducts: syncResults.length,
        results: syncResults
      };
    } catch (error) {
      console.error('Product sync error:', error);
      throw error;
    }
  }

  // Get products from Shopify
  async getShopifyProducts(user) {
    try {
      // Create session object for REST client
      const session = {
        shop: user.shopDomain,
        accessToken: user.shopifyAccessToken,
        id: `offline_${user.shopDomain}`,
        isOnline: false
      };

      const client = createRestClient(session);
      
      // Get products with images and variants
      const response = await client.get({
        path: 'products',
        query: {
          limit: 250,
          fields: 'id,title,body_html,vendor,product_type,tags,handle,images,variants,status'
        }
      });

      return response.body.products.filter(product => product.status === 'active');
    } catch (error) {
      console.error('Error fetching Shopify products:', error);
      throw new Error('Failed to fetch products from Shopify');
    }
  }

  // Ensure Facebook catalog exists
  async ensureFacebookCatalog(user) {
    try {
      // Check if user already has a catalog
      if (user.facebookCatalogId) {
        return user.facebookCatalogId;
      }

      // Create new catalog
      const catalogResponse = await axios.post(
        `https://graph.facebook.com/v18.0/${user.facebookAdAccountId}/product_catalogs`,
        {
          name: `${user.shopName || user.shopDomain} - Product Catalog`,
          vertical: 'ecommerce'
        },
        {
          headers: {
            'Authorization': `Bearer ${user.facebookAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return catalogResponse.data.id;
    } catch (error) {
      console.error('Error creating Facebook catalog:', error);
      throw new Error('Failed to create Facebook catalog');
    }
  }

  // Sync products to Facebook catalog
  async syncProductsToCatalog(user, products, catalogId) {
    const results = [];
    const batchSize = 50; // Facebook API batch limit

    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      const batchResults = await this.syncProductBatch(user, batch, catalogId);
      results.push(...batchResults);
    }

    return results;
  }

  // Sync a batch of products
  async syncProductBatch(user, products, catalogId) {
    try {
      const productData = products.map(product => this.formatProductForFacebook(product, user));
      
      const response = await axios.post(
        `https://graph.facebook.com/v18.0/${catalogId}/batch`,
        {
          requests: productData.map(product => ({
            method: 'POST',
            relative_url: 'products',
            body: product
          }))
        },
        {
          headers: {
            'Authorization': `Bearer ${user.facebookAccessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.map((result, index) => ({
        shopifyId: products[index].id,
        facebookId: result.body?.id,
        success: result.code === 200,
        error: result.body?.error?.message
      }));
    } catch (error) {
      console.error('Error syncing product batch:', error);
      return products.map(product => ({
        shopifyId: product.id,
        success: false,
        error: error.message
      }));
    }
  }

  // Format Shopify product for Facebook
  formatProductForFacebook(product, user) {
    const baseUrl = `https://${user.shopDomain}`;
    const mainVariant = product.variants[0];
    const mainImage = product.images[0];

    return {
      id: `shopify_${product.id}`,
      name: product.title,
      description: this.stripHtml(product.body_html || product.title),
      availability: mainVariant?.inventory_quantity > 0 ? 'in stock' : 'out of stock',
      condition: 'new',
      price: `${mainVariant?.price || '0'} ${user.currency || 'USD'}`,
      link: `${baseUrl}/products/${product.handle}`,
      image_link: mainImage?.src || '',
      brand: product.vendor || user.shopName || user.shopDomain,
      google_product_category: this.mapProductType(product.product_type),
      custom_label_0: product.product_type || 'General',
      custom_label_1: product.tags?.split(',')[0]?.trim() || '',
      inventory: mainVariant?.inventory_quantity || 0
    };
  }

  // Strip HTML tags from description
  stripHtml(html) {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').trim().substring(0, 5000);
  }

  // Map Shopify product type to Google product category
  mapProductType(productType) {
    const categoryMap = {
      'clothing': 'Apparel & Accessories',
      'shoes': 'Apparel & Accessories > Shoes',
      'electronics': 'Electronics',
      'home': 'Home & Garden',
      'beauty': 'Health & Beauty',
      'jewelry': 'Apparel & Accessories > Jewelry',
      'sports': 'Sporting Goods',
      'toys': 'Toys & Games',
      'books': 'Media > Books',
      'food': 'Food, Beverages & Tobacco'
    };

    const type = productType?.toLowerCase() || '';
    for (const [key, category] of Object.entries(categoryMap)) {
      if (type.includes(key)) {
        return category;
      }
    }
    
    return 'General';
  }

  // Get sync status for a user
  async getSyncStatus(userId) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        hasShopifyConnection: !!user.shopifyAccessToken,
        hasFacebookConnection: !!user.facebookAccessToken,
        hasCompletedOnboarding: !!user.hasCompletedOnboarding,
        catalogId: user.facebookCatalogId,
        lastSyncAt: user.lastProductSyncAt
      };
    } catch (error) {
      console.error('Error getting sync status:', error);
      throw error;
    }
  }
}

module.exports = new ProductSyncService();