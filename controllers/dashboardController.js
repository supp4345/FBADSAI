const { User, Campaign, Performance, Alert } = require('../config/database');
const authController = require('./authController');

class DashboardController {
  // Main dashboard
  async index(ctx) {
    await authController.requireAuth(ctx, async () => {
      const user = await User.findByPk(ctx.session.userId);
      
      await ctx.render('dashboard/index', {
        title: 'AI Facebook Ads Dashboard',
        user,
        shop: ctx.session.shop,
        currentPage: 'dashboard'
      });
    });
  }

  // Dashboard overview data
  async overview(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        
        // Get user and campaigns
        const user = await User.findByPk(userId);
        const campaigns = await Campaign.findAll({
          where: { userId },
          include: [{ model: Performance }],
          order: [['createdAt', 'DESC']]
        });

        // Calculate overview metrics
        const totalCampaigns = campaigns.length;
        const activeCampaigns = campaigns.filter(c => c.status === 'active').length;
        
        // Calculate performance metrics from last 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        let totalSpend = 0;
        let totalRevenue = 0;
        let totalClicks = 0;
        let totalImpressions = 0;
        let totalConversions = 0;

        campaigns.forEach(campaign => {
          campaign.Performances?.forEach(perf => {
            if (perf.createdAt >= thirtyDaysAgo) {
              totalSpend += parseFloat(perf.spend || 0);
              totalRevenue += parseFloat(perf.revenue || 0);
              totalClicks += parseInt(perf.clicks || 0);
              totalImpressions += parseInt(perf.impressions || 0);
              totalConversions += parseInt(perf.conversions || 0);
            }
          });
        });

        const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;
        const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
        const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

        // Get recent alerts
        const alerts = await Alert.findAll({
          where: { userId, isRead: false },
          order: [['createdAt', 'DESC']],
          limit: 5
        });

        // Top performing campaigns
        const topCampaigns = campaigns
          .map(campaign => {
            const recentPerf = campaign.Performances?.filter(p => p.createdAt >= thirtyDaysAgo) || [];
            const campaignSpend = recentPerf.reduce((sum, p) => sum + parseFloat(p.spend || 0), 0);
            const campaignRevenue = recentPerf.reduce((sum, p) => sum + parseFloat(p.revenue || 0), 0);
            const campaignRoas = campaignSpend > 0 ? campaignRevenue / campaignSpend : 0;
            
            return {
              ...campaign.toJSON(),
              spend: campaignSpend,
              revenue: campaignRevenue,
              roas: campaignRoas
            };
          })
          .sort((a, b) => b.roas - a.roas)
          .slice(0, 5);

        ctx.body = {
          success: true,
          data: {
            overview: {
              totalCampaigns,
              activeCampaigns,
              totalSpend: totalSpend.toFixed(2),
              totalRevenue: totalRevenue.toFixed(2),
              roas: roas.toFixed(2),
              ctr: ctr.toFixed(2),
              conversionRate: conversionRate.toFixed(2),
              totalConversions
            },
            topCampaigns,
            alerts: alerts.map(alert => ({
              id: alert.id,
              type: alert.type,
              title: alert.title,
              message: alert.message,
              severity: alert.severity,
              createdAt: alert.createdAt
            })),
            user: {
              id: user.id,
              shopDomain: user.shopDomain,
              subscription: user.subscription,
              trialEndsAt: user.trialEndsAt,
              hasFacebookConnection: !!user.facebookAccessToken
            }
          }
        };
      } catch (error) {
        console.error('Dashboard overview error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Campaigns page
  async campaigns(ctx) {
    await authController.requireAuth(ctx, async () => {
      const user = await User.findByPk(ctx.session.userId);
      
      await ctx.render('dashboard/campaigns', {
        title: 'Campaign Management',
        user,
        shop: ctx.session.shop,
        currentPage: 'campaigns'
      });
    });
  }

  // Analytics page
  async analytics(ctx) {
    await authController.requireAuth(ctx, async () => {
      const user = await User.findByPk(ctx.session.userId);
      
      await ctx.render('dashboard/analytics', {
        title: 'Analytics & Insights',
        user,
        shop: ctx.session.shop,
        currentPage: 'analytics'
      });
    });
  }

  // Settings page
  async settings(ctx) {
    await authController.requireAuth(ctx, async () => {
      const user = await User.findByPk(ctx.session.userId);
      
      await ctx.render('dashboard/settings', {
        title: 'Settings',
        user,
        shop: ctx.session.shop,
        currentPage: 'settings'
      });
    });
  }
}

module.exports = new DashboardController();