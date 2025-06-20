const { Campaign, AdCreative, Performance, User } = require('../config/database');
const { aiService } = require('../services/aiService');
const facebookService = require('../services/facebookService');
const authController = require('./authController');

class CampaignController {
  // List all campaigns
  async list(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const { page = 1, limit = 10, status, search } = ctx.query;
        
        const where = { userId };
        if (status) where.status = status;
        if (search) {
          where[Op.or] = [
            { productTitle: { [Op.iLike]: `%${search}%` } },
            { facebookCampaignId: { [Op.iLike]: `%${search}%` } }
          ];
        }

        const campaigns = await Campaign.findAndCountAll({
          where,
          include: [
            { model: AdCreative },
            { model: Performance, limit: 1, order: [['createdAt', 'DESC']] }
          ],
          order: [['createdAt', 'DESC']],
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit)
        });

        // Enhance campaigns with calculated metrics
        const enhancedCampaigns = campaigns.rows.map(campaign => {
          const latestPerf = campaign.Performances?.[0];
          return {
            ...campaign.toJSON(),
            latestPerformance: latestPerf ? {
              spend: latestPerf.spend,
              revenue: latestPerf.revenue,
              roas: latestPerf.roas,
              ctr: latestPerf.ctr,
              conversions: latestPerf.conversions
            } : null,
            creativeCount: campaign.AdCreatives?.length || 0
          };
        });

        ctx.body = {
          success: true,
          data: {
            campaigns: enhancedCampaigns,
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: campaigns.count,
              pages: Math.ceil(campaigns.count / parseInt(limit))
            }
          }
        };
      } catch (error) {
        console.error('Campaign list error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Get single campaign
  async get(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const { id } = ctx.params;
        const userId = ctx.session.userId;

        const campaign = await Campaign.findOne({
          where: { id, userId },
          include: [
            { model: AdCreative },
            { model: Performance, order: [['createdAt', 'DESC']], limit: 30 }
          ]
        });

        if (!campaign) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Campaign not found' };
          return;
        }

        // Calculate performance metrics
        const performances = campaign.Performances || [];
        const totalSpend = performances.reduce((sum, p) => sum + parseFloat(p.spend || 0), 0);
        const totalRevenue = performances.reduce((sum, p) => sum + parseFloat(p.revenue || 0), 0);
        const totalConversions = performances.reduce((sum, p) => sum + parseInt(p.conversions || 0), 0);

        ctx.body = {
          success: true,
          data: {
            ...campaign.toJSON(),
            metrics: {
              totalSpend: totalSpend.toFixed(2),
              totalRevenue: totalRevenue.toFixed(2),
              totalConversions,
              roas: totalSpend > 0 ? (totalRevenue / totalSpend).toFixed(2) : '0.00'
            }
          }
        };
      } catch (error) {
        console.error('Campaign get error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Create new campaign
  async create(ctx) {
    await authController.requireFacebookAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const user = ctx.state.user;
        const {
          productId,
          productTitle,
          productHandle,
          objective = 'CONVERSIONS',
          budget,
          budgetType = 'daily',
          targeting,
          useAI = true,
          adContent
        } = ctx.request.body;

        // Validate required fields
        if (!productId || !productTitle || !budget) {
          ctx.status = 400;
          ctx.body = { success: false, error: 'Missing required fields' };
          return;
        }

        // Get product details from Shopify
        const { getShopifyProduct } = require('../services/shopifyService');
        const product = await getShopifyProduct(userId, productId);

        let campaignData = {
          userId,
          productId,
          productTitle,
          productHandle,
          objective,
          budget: parseFloat(budget),
          budgetType,
          targeting: targeting || {},
          status: 'draft'
        };

        // Use AI to generate campaign strategy if requested
        if (useAI) {
          console.log('Generating AI campaign strategy...');
          const aiStrategy = await aiService.generateCampaignStrategy(product, {
            budget,
            objective,
            audience: targeting?.audience
          });

          campaignData.adContent = aiStrategy.creatives || [];
          campaignData.targeting = aiStrategy.audiences?.[0]?.targeting || targeting || {};
          campaignData.aiOptimizations = [
            {
              type: 'initial_generation',
              timestamp: new Date(),
              strategy: aiStrategy
            }
          ];
          campaignData.createdBy = 'ai';
        } else {
          campaignData.adContent = adContent || [];
          campaignData.createdBy = 'user';
        }

        // Create campaign in database
        const campaign = await Campaign.create(campaignData);

        // Create ad creatives if provided
        if (campaignData.adContent && campaignData.adContent.length > 0) {
          const creatives = campaignData.adContent.map(creative => ({
            campaignId: campaign.id,
            headline: creative.headline,
            primaryText: creative.primary_text || creative.primaryText,
            description: creative.description,
            callToAction: creative.cta || creative.callToAction,
            generatedByAI: useAI
          }));

          await AdCreative.bulkCreate(creatives);
        }

        // If user wants to publish immediately, create Facebook campaign
        if (ctx.request.body.publish) {
          try {
            const facebookCampaign = await facebookService.createCampaign(user, campaign);
            campaign.facebookCampaignId = facebookCampaign.id;
            campaign.status = 'active';
            await campaign.save();
          } catch (fbError) {
            console.error('Facebook campaign creation error:', fbError);
            // Campaign is created in DB but not on Facebook
            campaign.status = 'failed';
            await campaign.save();
          }
        }

        // Fetch the complete campaign with creatives
        const completeCampaign = await Campaign.findByPk(campaign.id, {
          include: [{ model: AdCreative }]
        });

        ctx.body = {
          success: true,
          data: completeCampaign,
          message: 'Campaign created successfully'
        };
      } catch (error) {
        console.error('Campaign creation error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Update campaign
  async update(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const { id } = ctx.params;
        const userId = ctx.session.userId;
        const updates = ctx.request.body;

        const campaign = await Campaign.findOne({
          where: { id, userId }
        });

        if (!campaign) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Campaign not found' };
          return;
        }

        // Update allowed fields
        const allowedFields = ['productTitle', 'budget', 'budgetType', 'targeting', 'adContent'];
        const updateData = {};
        
        allowedFields.forEach(field => {
          if (updates[field] !== undefined) {
            updateData[field] = updates[field];
          }
        });

        await campaign.update(updateData);

        // If campaign is active on Facebook, update it there too
        if (campaign.facebookCampaignId && campaign.status === 'active') {
          try {
            const user = await User.findByPk(userId);
            await facebookService.updateCampaign(user, campaign.facebookCampaignId, updateData);
          } catch (fbError) {
            console.error('Facebook campaign update error:', fbError);
          }
        }

        ctx.body = {
          success: true,
          data: campaign,
          message: 'Campaign updated successfully'
        };
      } catch (error) {
        console.error('Campaign update error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Delete campaign
  async delete(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const { id } = ctx.params;
        const userId = ctx.session.userId;

        const campaign = await Campaign.findOne({
          where: { id, userId }
        });

        if (!campaign) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Campaign not found' };
          return;
        }

        // If campaign is active on Facebook, delete it there first
        if (campaign.facebookCampaignId && campaign.status === 'active') {
          try {
            const user = await User.findByPk(userId);
            await facebookService.deleteCampaign(user, campaign.facebookCampaignId);
          } catch (fbError) {
            console.error('Facebook campaign deletion error:', fbError);
          }
        }

        // Delete from database (this will cascade to related records)
        await campaign.destroy();

        ctx.body = {
          success: true,
          message: 'Campaign deleted successfully'
        };
      } catch (error) {
        console.error('Campaign deletion error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Pause campaign
  async pause(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const { id } = ctx.params;
        const userId = ctx.session.userId;

        const campaign = await Campaign.findOne({
          where: { id, userId }
        });

        if (!campaign) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Campaign not found' };
          return;
        }

        // Pause on Facebook first
        if (campaign.facebookCampaignId) {
          try {
            const user = await User.findByPk(userId);
            await facebookService.pauseCampaign(user, campaign.facebookCampaignId);
          } catch (fbError) {
            console.error('Facebook campaign pause error:', fbError);
          }
        }

        // Update status in database
        campaign.status = 'paused';
        await campaign.save();

        ctx.body = {
          success: true,
          data: campaign,
          message: 'Campaign paused successfully'
        };
      } catch (error) {
        console.error('Campaign pause error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Resume campaign
  async resume(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const { id } = ctx.params;
        const userId = ctx.session.userId;

        const campaign = await Campaign.findOne({
          where: { id, userId }
        });

        if (!campaign) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Campaign not found' };
          return;
        }

        // Resume on Facebook first
        if (campaign.facebookCampaignId) {
          try {
            const user = await User.findByPk(userId);
            await facebookService.resumeCampaign(user, campaign.facebookCampaignId);
          } catch (fbError) {
            console.error('Facebook campaign resume error:', fbError);
          }
        }

        // Update status in database
        campaign.status = 'active';
        await campaign.save();

        ctx.body = {
          success: true,
          data: campaign,
          message: 'Campaign resumed successfully'
        };
      } catch (error) {
        console.error('Campaign resume error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Duplicate campaign
  async duplicate(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const { id } = ctx.params;
        const userId = ctx.session.userId;

        const originalCampaign = await Campaign.findOne({
          where: { id, userId },
          include: [{ model: AdCreative }]
        });

        if (!originalCampaign) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Campaign not found' };
          return;
        }

        // Create duplicate campaign
        const duplicateData = {
          ...originalCampaign.toJSON(),
          id: undefined,
          facebookCampaignId: null,
          facebookAdSetId: null,
          facebookAdId: null,
          status: 'draft',
          productTitle: `${originalCampaign.productTitle} (Copy)`,
          createdAt: undefined,
          updatedAt: undefined
        };

        const duplicateCampaign = await Campaign.create(duplicateData);

        // Duplicate ad creatives
        if (originalCampaign.AdCreatives && originalCampaign.AdCreatives.length > 0) {
          const duplicateCreatives = originalCampaign.AdCreatives.map(creative => ({
            ...creative.toJSON(),
            id: undefined,
            campaignId: duplicateCampaign.id,
            facebookCreativeId: null,
            createdAt: undefined,
            updatedAt: undefined
          }));

          await AdCreative.bulkCreate(duplicateCreatives);
        }

        // Fetch complete duplicate campaign
        const completeDuplicate = await Campaign.findByPk(duplicateCampaign.id, {
          include: [{ model: AdCreative }]
        });

        ctx.body = {
          success: true,
          data: completeDuplicate,
          message: 'Campaign duplicated successfully'
        };
      } catch (error) {
        console.error('Campaign duplication error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }
}

module.exports = new CampaignController();