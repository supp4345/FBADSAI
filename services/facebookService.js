const axios = require('axios');

class FacebookService {
  constructor() {
    this.baseURL = 'https://graph.facebook.com/v18.0';
  }

  // Create Facebook campaign
  async createCampaign(user, campaign) {
    try {
      const accessToken = user.facebookAccessToken;
      const adAccountId = user.facebookAdAccountId;

      if (!accessToken || !adAccountId) {
        throw new Error('Facebook access token or ad account ID not found');
      }

      // Create campaign
      const campaignResponse = await axios.post(
        `${this.baseURL}/act_${adAccountId}/campaigns`,
        {
          name: campaign.productTitle,
          objective: campaign.objective,
          status: 'PAUSED', // Start paused for safety
          special_ad_categories: []
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const facebookCampaignId = campaignResponse.data.id;

      // Create ad set
      const adSetResponse = await axios.post(
        `${this.baseURL}/act_${adAccountId}/adsets`,
        {
          name: `${campaign.productTitle} - Ad Set`,
          campaign_id: facebookCampaignId,
          daily_budget: Math.round(parseFloat(campaign.budget) * 100), // Convert to cents
          billing_event: 'IMPRESSIONS',
          optimization_goal: this.getOptimizationGoal(campaign.objective),
          bid_strategy: campaign.bidStrategy || 'LOWEST_COST_WITHOUT_CAP',
          targeting: this.formatTargeting(campaign.targeting),
          status: 'PAUSED'
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const facebookAdSetId = adSetResponse.data.id;

      // Create ad creative if we have ad content
      let facebookAdId = null;
      if (campaign.adContent && campaign.adContent.length > 0) {
        const creative = campaign.adContent[0]; // Use first creative
        
        const creativeResponse = await axios.post(
          `${this.baseURL}/act_${adAccountId}/adcreatives`,
          {
            name: `${campaign.productTitle} - Creative`,
            object_story_spec: {
              page_id: await this.getPageId(user),
              link_data: {
                link: this.getProductUrl(user.shopDomain, campaign.productHandle),
                message: creative.primary_text || creative.primaryText,
                name: creative.headline,
                description: creative.description,
                call_to_action: {
                  type: creative.cta || 'SHOP_NOW'
                }
              }
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        const facebookCreativeId = creativeResponse.data.id;

        // Create ad
        const adResponse = await axios.post(
          `${this.baseURL}/act_${adAccountId}/ads`,
          {
            name: `${campaign.productTitle} - Ad`,
            adset_id: facebookAdSetId,
            creative: { creative_id: facebookCreativeId },
            status: 'PAUSED'
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );

        facebookAdId = adResponse.data.id;
      }

      return {
        id: facebookCampaignId,
        adSetId: facebookAdSetId,
        adId: facebookAdId
      };
    } catch (error) {
      console.error('Facebook campaign creation error:', error.response?.data || error.message);
      throw new Error(`Failed to create Facebook campaign: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Update Facebook campaign
  async updateCampaign(user, facebookCampaignId, updates) {
    try {
      const accessToken = user.facebookAccessToken;

      const updateData = {};
      if (updates.productTitle) updateData.name = updates.productTitle;
      if (updates.budget) updateData.daily_budget = Math.round(parseFloat(updates.budget) * 100);

      if (Object.keys(updateData).length > 0) {
        await axios.post(
          `${this.baseURL}/${facebookCampaignId}`,
          updateData,
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        );
      }

      return true;
    } catch (error) {
      console.error('Facebook campaign update error:', error.response?.data || error.message);
      throw new Error(`Failed to update Facebook campaign: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Delete Facebook campaign
  async deleteCampaign(user, facebookCampaignId) {
    try {
      const accessToken = user.facebookAccessToken;

      await axios.delete(
        `${this.baseURL}/${facebookCampaignId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      return true;
    } catch (error) {
      console.error('Facebook campaign deletion error:', error.response?.data || error.message);
      throw new Error(`Failed to delete Facebook campaign: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Pause Facebook campaign
  async pauseCampaign(user, facebookCampaignId) {
    try {
      const accessToken = user.facebookAccessToken;

      await axios.post(
        `${this.baseURL}/${facebookCampaignId}`,
        { status: 'PAUSED' },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      return true;
    } catch (error) {
      console.error('Facebook campaign pause error:', error.response?.data || error.message);
      throw new Error(`Failed to pause Facebook campaign: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Resume Facebook campaign
  async resumeCampaign(user, facebookCampaignId) {
    try {
      const accessToken = user.facebookAccessToken;

      await axios.post(
        `${this.baseURL}/${facebookCampaignId}`,
        { status: 'ACTIVE' },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      return true;
    } catch (error) {
      console.error('Facebook campaign resume error:', error.response?.data || error.message);
      throw new Error(`Failed to resume Facebook campaign: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get campaign performance data
  async getCampaignPerformance(user, facebookCampaignId, dateRange = '7d') {
    try {
      const accessToken = user.facebookAccessToken;

      const response = await axios.get(
        `${this.baseURL}/${facebookCampaignId}/insights`,
        {
          params: {
            fields: 'impressions,clicks,spend,conversions,ctr,cpc,cpm,reach,frequency',
            date_preset: dateRange,
            access_token: accessToken
          }
        }
      );

      return response.data.data[0] || {};
    } catch (error) {
      console.error('Facebook performance fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch campaign performance: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get ad account information
  async getAdAccount(user) {
    try {
      const accessToken = user.facebookAccessToken;

      const response = await axios.get(
        `${this.baseURL}/me/adaccounts`,
        {
          params: {
            fields: 'id,name,account_status,currency,timezone_name',
            access_token: accessToken
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Facebook ad account fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch ad accounts: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get Facebook pages
  async getPages(user) {
    try {
      const accessToken = user.facebookAccessToken;

      const response = await axios.get(
        `${this.baseURL}/me/accounts`,
        {
          params: {
            fields: 'id,name,access_token',
            access_token: accessToken
          }
        }
      );

      return response.data.data;
    } catch (error) {
      console.error('Facebook pages fetch error:', error.response?.data || error.message);
      throw new Error(`Failed to fetch Facebook pages: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Helper methods

  getOptimizationGoal(objective) {
    const goalMap = {
      'CONVERSIONS': 'OFFSITE_CONVERSIONS',
      'TRAFFIC': 'LINK_CLICKS',
      'REACH': 'REACH',
      'BRAND_AWARENESS': 'BRAND_AWARENESS',
      'VIDEO_VIEWS': 'VIDEO_VIEWS'
    };
    return goalMap[objective] || 'OFFSITE_CONVERSIONS';
  }

  formatTargeting(targeting) {
    const formatted = {
      geo_locations: {
        countries: targeting.countries || ['US']
      },
      age_min: targeting.age_min || 18,
      age_max: targeting.age_max || 65
    };

    if (targeting.genders && targeting.genders.length > 0 && !targeting.genders.includes('all')) {
      formatted.genders = targeting.genders.map(g => g === 'male' ? 1 : 2);
    }

    if (targeting.interests && targeting.interests.length > 0) {
      formatted.interests = targeting.interests.map(interest => ({
        name: interest
      }));
    }

    if (targeting.behaviors && targeting.behaviors.length > 0) {
      formatted.behaviors = targeting.behaviors.map(behavior => ({
        name: behavior
      }));
    }

    return formatted;
  }

  async getPageId(user) {
    // Get the first available page ID
    // In a real implementation, you'd want to let users select their page
    try {
      const pages = await this.getPages(user);
      return pages[0]?.id || null;
    } catch (error) {
      console.error('Error getting page ID:', error);
      return null;
    }
  }

  getProductUrl(shopDomain, productHandle) {
    return `https://${shopDomain}/products/${productHandle}`;
  }

  // Sync performance data
  async syncPerformanceData(user, campaigns) {
    const results = [];

    for (const campaign of campaigns) {
      if (!campaign.facebookCampaignId) continue;

      try {
        const performance = await this.getCampaignPerformance(user, campaign.facebookCampaignId);
        
        // Convert Facebook data to our format
        const formattedPerformance = {
          campaignId: campaign.id,
          impressions: parseInt(performance.impressions || 0),
          clicks: parseInt(performance.clicks || 0),
          spend: parseFloat(performance.spend || 0),
          ctr: parseFloat(performance.ctr || 0),
          cpc: parseFloat(performance.cpc || 0),
          cpm: parseFloat(performance.cpm || 0),
          reach: parseInt(performance.reach || 0),
          frequency: parseFloat(performance.frequency || 0),
          conversions: parseInt(performance.conversions || 0),
          recordedAt: new Date()
        };

        results.push(formattedPerformance);
      } catch (error) {
        console.error(`Error syncing performance for campaign ${campaign.id}:`, error);
      }
    }

    return results;
  }

  // Validate Facebook connection
  async validateConnection(user) {
    try {
      const accessToken = user.facebookAccessToken;
      
      const response = await axios.get(
        `${this.baseURL}/me`,
        {
          params: {
            fields: 'id,name',
            access_token: accessToken
          }
        }
      );

      return {
        valid: true,
        user: response.data
      };
    } catch (error) {
      return {
        valid: false,
        error: error.response?.data?.error?.message || error.message
      };
    }
  }
}

module.exports = new FacebookService();