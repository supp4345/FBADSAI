const axios = require('axios');
const { User, Subscription } = require('../config/database');

class BillingService {
  constructor() {
    this.shopifyApiVersion = '2024-01';
  }

  // Create Shopify recurring charge
  async createRecurringCharge(userId, plan, billingCycle = 'monthly') {
    try {
      const user = await User.findByPk(userId);
      if (!user || !user.accessToken) {
        throw new Error('User not found or not authenticated');
      }

      const planConfig = Subscription.PLANS[plan];
      if (!planConfig) {
        throw new Error('Invalid plan');
      }

      const price = billingCycle === 'yearly' ? 
        (planConfig.price * 12 * 0.8).toFixed(2) : // 20% discount for yearly
        planConfig.price.toFixed(2);

      const chargeData = {
        recurring_application_charge: {
          name: `AI Facebook Ads Pro - ${planConfig.name} Plan`,
          price: price,
          return_url: `${process.env.HOST}/billing/callback`,
          trial_days: plan === 'free' ? 0 : 14,
          test: process.env.NODE_ENV !== 'production'
        }
      };

      const response = await axios.post(
        `https://${user.shopDomain}/admin/api/${this.shopifyApiVersion}/recurring_application_charges.json`,
        chargeData,
        {
          headers: {
            'X-Shopify-Access-Token': user.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );

      const charge = response.data.recurring_application_charge;

      // Create or update subscription record
      const subscription = await Subscription.findOne({ where: { userId } });
      const subscriptionData = {
        userId,
        shopifyChargeId: charge.id.toString(),
        plan,
        status: 'pending',
        billingCycle,
        amount: parseFloat(price),
        trialEndsAt: charge.trial_ends_on ? new Date(charge.trial_ends_on) : null,
        ...this.getPlanLimits(plan)
      };

      if (subscription) {
        await subscription.update(subscriptionData);
      } else {
        await Subscription.create(subscriptionData);
      }

      return {
        success: true,
        confirmationUrl: charge.confirmation_url,
        chargeId: charge.id
      };

    } catch (error) {
      console.error('Error creating recurring charge:', error);
      throw new Error(`Failed to create subscription: ${error.message}`);
    }
  }

  // Handle billing callback from Shopify
  async handleBillingCallback(chargeId, userId) {
    try {
      const user = await User.findByPk(userId);
      const subscription = await Subscription.findOne({ 
        where: { userId, shopifyChargeId: chargeId.toString() } 
      });

      if (!user || !subscription) {
        throw new Error('User or subscription not found');
      }

      // Get charge details from Shopify
      const response = await axios.get(
        `https://${user.shopDomain}/admin/api/${this.shopifyApiVersion}/recurring_application_charges/${chargeId}.json`,
        {
          headers: {
            'X-Shopify-Access-Token': user.accessToken
          }
        }
      );

      const charge = response.data.recurring_application_charge;

      // Update subscription based on charge status
      const updateData = {
        status: charge.status === 'accepted' ? 'active' : charge.status,
        currentPeriodStart: charge.activated_on ? new Date(charge.activated_on) : null,
        currentPeriodEnd: charge.billing_on ? new Date(charge.billing_on) : null
      };

      await subscription.update(updateData);

      return {
        success: true,
        status: charge.status,
        subscription
      };

    } catch (error) {
      console.error('Error handling billing callback:', error);
      throw new Error(`Failed to process billing callback: ${error.message}`);
    }
  }

  // Cancel subscription
  async cancelSubscription(userId) {
    try {
      const user = await User.findByPk(userId);
      const subscription = await Subscription.findOne({ 
        where: { userId, status: 'active' } 
      });

      if (!user || !subscription) {
        throw new Error('Active subscription not found');
      }

      // Cancel in Shopify
      if (subscription.shopifyChargeId) {
        await axios.delete(
          `https://${user.shopDomain}/admin/api/${this.shopifyApiVersion}/recurring_application_charges/${subscription.shopifyChargeId}.json`,
          {
            headers: {
              'X-Shopify-Access-Token': user.accessToken
            }
          }
        );
      }

      // Update local subscription
      await subscription.update({
        status: 'cancelled',
        cancelledAt: new Date()
      });

      return { success: true, subscription };

    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  // Get current subscription for user
  async getCurrentSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      if (!subscription) {
        // Create free subscription if none exists
        return await Subscription.create({
          userId,
          plan: 'free',
          status: 'active',
          ...this.getPlanLimits('free')
        });
      }

      return subscription;
    } catch (error) {
      console.error('Error getting current subscription:', error);
      throw new Error(`Failed to get subscription: ${error.message}`);
    }
  }

  // Check if user can use feature
  async checkFeatureAccess(userId, feature) {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      return subscription.hasFeature(feature);
    } catch (error) {
      console.error('Error checking feature access:', error);
      return false;
    }
  }

  // Check usage limits
  async checkUsageLimit(userId, type) {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      
      if (type === 'ai') {
        return subscription.canUseAI();
      } else if (type === 'campaign') {
        return subscription.canCreateCampaign();
      }
      
      return false;
    } catch (error) {
      console.error('Error checking usage limit:', error);
      return false;
    }
  }

  // Increment usage
  async incrementUsage(userId, type) {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      return await subscription.incrementUsage(type);
    } catch (error) {
      console.error('Error incrementing usage:', error);
      throw error;
    }
  }

  // Get plan limits and features
  getPlanLimits(plan) {
    const planConfig = Subscription.PLANS[plan];
    return {
      aiGenerationsLimit: planConfig.aiGenerationsLimit,
      campaignsLimit: planConfig.campaignsLimit,
      features: planConfig.features
    };
  }

  // Get usage analytics
  async getUsageAnalytics(userId) {
    try {
      const subscription = await this.getCurrentSubscription(userId);
      const planConfig = Subscription.PLANS[subscription.plan];

      return {
        plan: subscription.plan,
        planName: planConfig.name,
        status: subscription.status,
        aiGenerations: {
          used: subscription.aiGenerationsUsed,
          limit: subscription.aiGenerationsLimit,
          percentage: subscription.aiGenerationsLimit === -1 ? 0 : 
            Math.round((subscription.aiGenerationsUsed / subscription.aiGenerationsLimit) * 100)
        },
        campaigns: {
          used: subscription.campaignsCreated,
          limit: subscription.campaignsLimit,
          percentage: subscription.campaignsLimit === -1 ? 0 : 
            Math.round((subscription.campaignsCreated / subscription.campaignsLimit) * 100)
        },
        features: subscription.features,
        trialEndsAt: subscription.trialEndsAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
        isInTrial: subscription.isInTrial(),
        isActive: subscription.isActive()
      };
    } catch (error) {
      console.error('Error getting usage analytics:', error);
      throw error;
    }
  }
}

module.exports = new BillingService();