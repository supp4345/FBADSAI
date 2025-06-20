const { aiService } = require('../services/aiService');
const { Campaign, AdGeneration, User } = require('../config/database');
const authController = require('./authController');

class AIController {
  // Generate complete campaign with AI
  async generateCampaign(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const {
          productId,
          budget = 50,
          objective = 'CONVERSIONS',
          audience = 'auto',
          location = 'United States'
        } = ctx.request.body;

        if (!productId) {
          ctx.status = 400;
          ctx.body = { success: false, error: 'Product ID is required' };
          return;
        }

        // Get product details from Shopify
        const { getShopifyProduct } = require('../services/shopifyService');
        const product = await getShopifyProduct(userId, productId);

        if (!product) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Product not found' };
          return;
        }

        // Generate AI campaign strategy
        const userPreferences = {
          budget,
          objective,
          audience,
          location
        };

        const campaignStrategy = await aiService.generateCampaignStrategy(product, userPreferences);

        // Save generation to database for tracking
        await AdGeneration.create({
          userId,
          productId,
          prompt: `Generate campaign for ${product.title} with budget $${budget}`,
          generatedContent: campaignStrategy,
          aiModel: 'gemini-pro'
        });

        ctx.body = {
          success: true,
          data: {
            product: {
              id: product.id,
              title: product.title,
              price: product.variants[0]?.price,
              image: product.images[0]?.src
            },
            strategy: campaignStrategy,
            userPreferences
          },
          message: 'AI campaign strategy generated successfully'
        };
      } catch (error) {
        console.error('AI campaign generation error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Optimize existing campaign with AI
  async optimizeCampaign(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const { campaignId } = ctx.request.body;
        const userId = ctx.session.userId;

        if (!campaignId) {
          ctx.status = 400;
          ctx.body = { success: false, error: 'Campaign ID is required' };
          return;
        }

        // Verify campaign ownership
        const campaign = await Campaign.findOne({
          where: { id: campaignId, userId }
        });

        if (!campaign) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Campaign not found' };
          return;
        }

        // Analyze campaign performance and get optimization suggestions
        const analysis = await aiService.analyzeCampaignPerformance(campaignId);

        // Update campaign with AI optimizations
        const currentOptimizations = campaign.aiOptimizations || [];
        currentOptimizations.push({
          type: 'performance_analysis',
          timestamp: new Date(),
          analysis,
          applied: false
        });

        await campaign.update({
          aiOptimizations: currentOptimizations,
          lastOptimizedAt: new Date()
        });

        ctx.body = {
          success: true,
          data: {
            campaignId,
            analysis,
            optimizationId: currentOptimizations.length - 1
          },
          message: 'Campaign optimization analysis completed'
        };
      } catch (error) {
        console.error('AI campaign optimization error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Generate new ad creatives
  async generateCreatives(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const {
          productId,
          campaignId,
          count = 5,
          angle,
          excludeExisting = true
        } = ctx.request.body;

        if (!productId) {
          ctx.status = 400;
          ctx.body = { success: false, error: 'Product ID is required' };
          return;
        }

        // Get product details
        const { getShopifyProduct } = require('../services/shopifyService');
        const product = await getShopifyProduct(userId, productId);

        if (!product) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Product not found' };
          return;
        }

        // Get existing creatives if excluding them
        let existingCreatives = [];
        if (excludeExisting && campaignId) {
          const { AdCreative } = require('../config/database');
          existingCreatives = await AdCreative.findAll({
            where: { campaignId }
          });
        }

        // Get campaign data if provided
        let campaignData = {};
        if (campaignId) {
          const campaign = await Campaign.findOne({
            where: { id: campaignId, userId }
          });
          if (campaign) {
            campaignData = {
              objective: campaign.objective,
              audience: campaign.targeting?.audience || 'general'
            };
          }
        }

        // Generate creatives with AI
        const creatives = await aiService.generateAdCreatives(
          product,
          campaignData,
          existingCreatives
        );

        // Save generation to database
        await AdGeneration.create({
          userId,
          productId,
          prompt: `Generate ${count} creatives for ${product.title}${angle ? ` with ${angle} angle` : ''}`,
          generatedContent: { creatives },
          aiModel: 'gemini-pro'
        });

        ctx.body = {
          success: true,
          data: {
            product: {
              id: product.id,
              title: product.title,
              price: product.variants[0]?.price
            },
            creatives: creatives.slice(0, count),
            excludedCount: existingCreatives.length
          },
          message: `${creatives.length} ad creatives generated successfully`
        };
      } catch (error) {
        console.error('AI creative generation error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Generate audience suggestions
  async audienceSuggestions(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const {
          productId,
          objective = 'CONVERSIONS',
          budget,
          location = 'United States'
        } = ctx.request.body;

        if (!productId) {
          ctx.status = 400;
          ctx.body = { success: false, error: 'Product ID is required' };
          return;
        }

        // Get product details
        const { getShopifyProduct } = require('../services/shopifyService');
        const product = await getShopifyProduct(userId, productId);

        if (!product) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Product not found' };
          return;
        }

        // Generate audience suggestions with AI
        const audienceSuggestions = await aiService.generateAudienceSuggestions(product, objective);

        // Save generation to database
        await AdGeneration.create({
          userId,
          productId,
          prompt: `Generate audience suggestions for ${product.title} with ${objective} objective`,
          generatedContent: audienceSuggestions,
          aiModel: 'gemini-pro'
        });

        ctx.body = {
          success: true,
          data: {
            product: {
              id: product.id,
              title: product.title,
              category: product.product_type
            },
            audiences: audienceSuggestions.audiences,
            objective,
            location
          },
          message: 'Audience suggestions generated successfully'
        };
      } catch (error) {
        console.error('AI audience generation error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Generate budget recommendations
  async budgetRecommendations(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const {
          campaignId,
          currentBudget,
          targetRoas = 3.0,
          objective = 'CONVERSIONS'
        } = ctx.request.body;

        let campaignData = {
          budget: currentBudget,
          objective,
          targetRoas,
          runningDays: 7
        };

        let performanceData = {
          roas: 0,
          dailySpend: 0,
          conversionRate: 0,
          cpc: 0,
          ctr: 0
        };

        // If campaign ID provided, get actual performance data
        if (campaignId) {
          const campaign = await Campaign.findOne({
            where: { id: campaignId, userId },
            include: [{ model: require('../config/database').Performance, limit: 7, order: [['createdAt', 'DESC']] }]
          });

          if (campaign) {
            campaignData.budget = campaign.budget;
            campaignData.objective = campaign.objective;
            campaignData.runningDays = Math.ceil((new Date() - campaign.createdAt) / (1000 * 60 * 60 * 24));

            // Calculate performance metrics from recent data
            const performances = campaign.Performances || [];
            if (performances.length > 0) {
              const totalSpend = performances.reduce((sum, p) => sum + parseFloat(p.spend || 0), 0);
              const totalRevenue = performances.reduce((sum, p) => sum + parseFloat(p.revenue || 0), 0);
              const totalClicks = performances.reduce((sum, p) => sum + parseInt(p.clicks || 0), 0);
              const totalImpressions = performances.reduce((sum, p) => sum + parseInt(p.impressions || 0), 0);
              const totalConversions = performances.reduce((sum, p) => sum + parseInt(p.conversions || 0), 0);

              performanceData = {
                roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
                dailySpend: totalSpend / performances.length,
                conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
                cpc: totalClicks > 0 ? totalSpend / totalClicks : 0,
                ctr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
              };
            }
          }
        }

        // Generate budget recommendations with AI
        const recommendations = await aiService.generateBudgetRecommendations(campaignData, performanceData);

        ctx.body = {
          success: true,
          data: {
            currentCampaign: campaignData,
            currentPerformance: performanceData,
            recommendations
          },
          message: 'Budget recommendations generated successfully'
        };
      } catch (error) {
        console.error('AI budget recommendation error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Get AI generation history
  async getGenerationHistory(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const { page = 1, limit = 20, type } = ctx.query;

        const where = { userId };
        
        const generations = await AdGeneration.findAndCountAll({
          where,
          order: [['createdAt', 'DESC']],
          limit: parseInt(limit),
          offset: (parseInt(page) - 1) * parseInt(limit)
        });

        ctx.body = {
          success: true,
          data: {
            generations: generations.rows.map(gen => ({
              id: gen.id,
              productId: gen.productId,
              prompt: gen.prompt,
              aiModel: gen.aiModel,
              used: gen.used,
              rating: gen.rating,
              createdAt: gen.createdAt,
              contentPreview: this.getContentPreview(gen.generatedContent)
            })),
            pagination: {
              page: parseInt(page),
              limit: parseInt(limit),
              total: generations.count,
              pages: Math.ceil(generations.count / parseInt(limit))
            }
          }
        };
      } catch (error) {
        console.error('AI generation history error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Rate AI generation
  async rateGeneration(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const { id } = ctx.params;
        const { rating, feedback } = ctx.request.body;
        const userId = ctx.session.userId;

        if (!rating || rating < 1 || rating > 5) {
          ctx.status = 400;
          ctx.body = { success: false, error: 'Rating must be between 1 and 5' };
          return;
        }

        const generation = await AdGeneration.findOne({
          where: { id, userId }
        });

        if (!generation) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Generation not found' };
          return;
        }

        await generation.update({
          rating: parseInt(rating),
          feedback: feedback || null
        });

        ctx.body = {
          success: true,
          message: 'Rating saved successfully'
        };
      } catch (error) {
        console.error('AI generation rating error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Helper method to create content preview
  getContentPreview(content) {
    if (!content) return 'No content';
    
    if (content.creatives && content.creatives.length > 0) {
      return `${content.creatives.length} ad creatives`;
    }
    
    if (content.audiences && content.audiences.length > 0) {
      return `${content.audiences.length} audience suggestions`;
    }
    
    if (content.campaign) {
      return 'Campaign strategy';
    }
    
    return 'AI generated content';
  }
}

module.exports = new AIController();