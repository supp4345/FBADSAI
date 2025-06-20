const { Campaign, Performance, AdCreative, User } = require('../config/database');
const { Op } = require('sequelize');
const authController = require('./authController');

class AnalyticsController {
  // Overview analytics
  async overview(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const { 
          dateRange = '30', // days
          compareWith = 'previous'
        } = ctx.query;

        const days = parseInt(dateRange);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
        
        // Get current period data
        const currentPeriodData = await this.getPeriodData(userId, startDate, endDate);
        
        // Get comparison period data
        let comparisonData = null;
        if (compareWith === 'previous') {
          const comparisonEndDate = new Date(startDate.getTime() - 1);
          const comparisonStartDate = new Date(comparisonEndDate.getTime() - days * 24 * 60 * 60 * 1000);
          comparisonData = await this.getPeriodData(userId, comparisonStartDate, comparisonEndDate);
        }

        // Calculate trends
        const trends = this.calculateTrends(currentPeriodData, comparisonData);

        // Get top performing campaigns
        const topCampaigns = await this.getTopCampaigns(userId, startDate, endDate);

        // Get performance by day for charts
        const dailyPerformance = await this.getDailyPerformance(userId, startDate, endDate);

        ctx.body = {
          success: true,
          data: {
            overview: currentPeriodData,
            trends,
            topCampaigns,
            dailyPerformance,
            dateRange: {
              start: startDate,
              end: endDate,
              days
            }
          }
        };
      } catch (error) {
        console.error('Analytics overview error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Campaign-specific analytics
  async campaignAnalytics(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const { id } = ctx.params;
        const userId = ctx.session.userId;
        const { dateRange = '30' } = ctx.query;

        const campaign = await Campaign.findOne({
          where: { id, userId }
        });

        if (!campaign) {
          ctx.status = 404;
          ctx.body = { success: false, error: 'Campaign not found' };
          return;
        }

        const days = parseInt(dateRange);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        // Get campaign performance data
        const performances = await Performance.findAll({
          where: {
            campaignId: id,
            createdAt: {
              [Op.between]: [startDate, endDate]
            }
          },
          order: [['createdAt', 'ASC']]
        });

        // Get creative performance
        const creativePerformance = await this.getCreativePerformance(id, startDate, endDate);

        // Calculate metrics
        const metrics = this.calculateCampaignMetrics(performances);

        // Get hourly performance for detailed analysis
        const hourlyPerformance = await this.getHourlyPerformance(id, startDate, endDate);

        // Get audience insights
        const audienceInsights = await this.getAudienceInsights(id, startDate, endDate);

        ctx.body = {
          success: true,
          data: {
            campaign: {
              id: campaign.id,
              productTitle: campaign.productTitle,
              status: campaign.status,
              objective: campaign.objective,
              budget: campaign.budget
            },
            metrics,
            performances,
            creativePerformance,
            hourlyPerformance,
            audienceInsights,
            dateRange: {
              start: startDate,
              end: endDate,
              days
            }
          }
        };
      } catch (error) {
        console.error('Campaign analytics error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Performance insights
  async performance(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const { 
          metric = 'roas',
          groupBy = 'campaign',
          dateRange = '30'
        } = ctx.query;

        const days = parseInt(dateRange);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        let performanceData;

        switch (groupBy) {
          case 'campaign':
            performanceData = await this.getPerformanceByCampaign(userId, startDate, endDate, metric);
            break;
          case 'creative':
            performanceData = await this.getPerformanceByCreative(userId, startDate, endDate, metric);
            break;
          case 'day':
            performanceData = await this.getPerformanceByDay(userId, startDate, endDate, metric);
            break;
          case 'hour':
            performanceData = await this.getPerformanceByHour(userId, startDate, endDate, metric);
            break;
          default:
            performanceData = await this.getPerformanceByCampaign(userId, startDate, endDate, metric);
        }

        // Get benchmarks for comparison
        const benchmarks = this.getIndustryBenchmarks(metric);

        ctx.body = {
          success: true,
          data: {
            performance: performanceData,
            benchmarks,
            metric,
            groupBy,
            dateRange: {
              start: startDate,
              end: endDate,
              days
            }
          }
        };
      } catch (error) {
        console.error('Performance analytics error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // AI-powered insights
  async insights(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const { dateRange = '30' } = ctx.query;

        const days = parseInt(dateRange);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        // Get comprehensive data for AI analysis
        const campaigns = await Campaign.findAll({
          where: { userId },
          include: [
            {
              model: Performance,
              where: {
                createdAt: {
                  [Op.between]: [startDate, endDate]
                }
              },
              required: false
            },
            { model: AdCreative }
          ]
        });

        // Generate insights
        const insights = await this.generateInsights(campaigns, startDate, endDate);

        // Get optimization opportunities
        const opportunities = await this.getOptimizationOpportunities(campaigns);

        // Get alerts and recommendations
        const alerts = await this.getPerformanceAlerts(userId, campaigns);

        ctx.body = {
          success: true,
          data: {
            insights,
            opportunities,
            alerts,
            summary: {
              totalCampaigns: campaigns.length,
              activeCampaigns: campaigns.filter(c => c.status === 'active').length,
              analysisDate: new Date()
            }
          }
        };
      } catch (error) {
        console.error('Insights analytics error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Export analytics data
  async exportData(ctx) {
    await authController.requireAuth(ctx, async () => {
      try {
        const userId = ctx.session.userId;
        const {
          format = 'csv',
          dateRange = '30',
          includeCreatives = true,
          includePerformance = true
        } = ctx.request.body;

        const days = parseInt(dateRange);
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        // Get export data
        const exportData = await this.prepareExportData(
          userId, 
          startDate, 
          endDate, 
          includeCreatives, 
          includePerformance
        );

        // Format data based on requested format
        let formattedData;
        let contentType;
        let filename;

        switch (format) {
          case 'csv':
            formattedData = this.formatAsCSV(exportData);
            contentType = 'text/csv';
            filename = `facebook-ads-analytics-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.csv`;
            break;
          case 'json':
            formattedData = JSON.stringify(exportData, null, 2);
            contentType = 'application/json';
            filename = `facebook-ads-analytics-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.json`;
            break;
          default:
            throw new Error('Unsupported export format');
        }

        ctx.set('Content-Type', contentType);
        ctx.set('Content-Disposition', `attachment; filename="${filename}"`);
        ctx.body = formattedData;
      } catch (error) {
        console.error('Export analytics error:', error);
        ctx.status = 500;
        ctx.body = { success: false, error: error.message };
      }
    });
  }

  // Helper methods

  async getPeriodData(userId, startDate, endDate) {
    const performances = await Performance.findAll({
      include: [{
        model: Campaign,
        where: { userId },
        required: true
      }],
      where: {
        createdAt: {
          [Op.between]: [startDate, endDate]
        }
      }
    });

    return this.calculateMetrics(performances);
  }

  calculateMetrics(performances) {
    const totals = performances.reduce((acc, perf) => {
      acc.spend += parseFloat(perf.spend || 0);
      acc.revenue += parseFloat(perf.revenue || 0);
      acc.clicks += parseInt(perf.clicks || 0);
      acc.impressions += parseInt(perf.impressions || 0);
      acc.conversions += parseInt(perf.conversions || 0);
      return acc;
    }, { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0 });

    return {
      spend: totals.spend.toFixed(2),
      revenue: totals.revenue.toFixed(2),
      roas: totals.spend > 0 ? (totals.revenue / totals.spend).toFixed(2) : '0.00',
      ctr: totals.impressions > 0 ? ((totals.clicks / totals.impressions) * 100).toFixed(2) : '0.00',
      cpc: totals.clicks > 0 ? (totals.spend / totals.clicks).toFixed(2) : '0.00',
      conversionRate: totals.clicks > 0 ? ((totals.conversions / totals.clicks) * 100).toFixed(2) : '0.00',
      conversions: totals.conversions,
      clicks: totals.clicks,
      impressions: totals.impressions
    };
  }

  calculateTrends(current, previous) {
    if (!previous) return null;

    const calculateChange = (curr, prev) => {
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev * 100).toFixed(1);
    };

    return {
      spend: calculateChange(parseFloat(current.spend), parseFloat(previous.spend)),
      revenue: calculateChange(parseFloat(current.revenue), parseFloat(previous.revenue)),
      roas: calculateChange(parseFloat(current.roas), parseFloat(previous.roas)),
      ctr: calculateChange(parseFloat(current.ctr), parseFloat(previous.ctr)),
      conversions: calculateChange(current.conversions, previous.conversions)
    };
  }

  async getTopCampaigns(userId, startDate, endDate, limit = 5) {
    const campaigns = await Campaign.findAll({
      where: { userId },
      include: [{
        model: Performance,
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        required: false
      }],
      order: [['createdAt', 'DESC']]
    });

    return campaigns.map(campaign => {
      const metrics = this.calculateMetrics(campaign.Performances || []);
      return {
        id: campaign.id,
        productTitle: campaign.productTitle,
        status: campaign.status,
        ...metrics
      };
    }).sort((a, b) => parseFloat(b.roas) - parseFloat(a.roas)).slice(0, limit);
  }

  async getDailyPerformance(userId, startDate, endDate) {
    // Implementation for daily performance aggregation
    // This would group performance data by day
    return [];
  }

  calculateCampaignMetrics(performances) {
    return this.calculateMetrics(performances);
  }

  async getCreativePerformance(campaignId, startDate, endDate) {
    const creatives = await AdCreative.findAll({
      where: { campaignId },
      include: [{
        model: Performance,
        where: {
          createdAt: {
            [Op.between]: [startDate, endDate]
          }
        },
        required: false
      }]
    });

    return creatives.map(creative => ({
      id: creative.id,
      headline: creative.headline,
      primaryText: creative.primaryText,
      metrics: this.calculateMetrics(creative.Performances || [])
    }));
  }

  async getHourlyPerformance(campaignId, startDate, endDate) {
    // Implementation for hourly performance breakdown
    return [];
  }

  async getAudienceInsights(campaignId, startDate, endDate) {
    // Implementation for audience performance insights
    return {
      demographics: {},
      interests: {},
      behaviors: {}
    };
  }

  async getPerformanceByCampaign(userId, startDate, endDate, metric) {
    // Implementation for campaign performance grouping
    return [];
  }

  async getPerformanceByCreative(userId, startDate, endDate, metric) {
    // Implementation for creative performance grouping
    return [];
  }

  async getPerformanceByDay(userId, startDate, endDate, metric) {
    // Implementation for daily performance grouping
    return [];
  }

  async getPerformanceByHour(userId, startDate, endDate, metric) {
    // Implementation for hourly performance grouping
    return [];
  }

  getIndustryBenchmarks(metric) {
    const benchmarks = {
      roas: { good: 4.0, average: 2.5, poor: 1.5 },
      ctr: { good: 2.0, average: 1.2, poor: 0.8 },
      cpc: { good: 1.0, average: 2.0, poor: 3.5 },
      conversionRate: { good: 4.0, average: 2.0, poor: 1.0 }
    };

    return benchmarks[metric] || benchmarks.roas;
  }

  async generateInsights(campaigns, startDate, endDate) {
    // AI-powered insights generation
    return [
      {
        type: 'performance',
        title: 'Campaign Performance Trend',
        description: 'Your campaigns are showing positive growth',
        impact: 'positive',
        confidence: 85
      }
    ];
  }

  async getOptimizationOpportunities(campaigns) {
    return [
      {
        type: 'budget',
        title: 'Budget Reallocation Opportunity',
        description: 'Consider moving budget from low-performing to high-performing campaigns',
        potentialImpact: '15-25% ROAS improvement',
        difficulty: 'easy'
      }
    ];
  }

  async getPerformanceAlerts(userId, campaigns) {
    return [
      {
        type: 'warning',
        title: 'High CPC Alert',
        description: 'Campaign XYZ has unusually high cost per click',
        actionRequired: true
      }
    ];
  }

  async prepareExportData(userId, startDate, endDate, includeCreatives, includePerformance) {
    const campaigns = await Campaign.findAll({
      where: { userId },
      include: [
        ...(includeCreatives ? [{ model: AdCreative }] : []),
        ...(includePerformance ? [{
          model: Performance,
          where: {
            createdAt: {
              [Op.between]: [startDate, endDate]
            }
          },
          required: false
        }] : [])
      ]
    });

    return campaigns.map(campaign => ({
      campaignId: campaign.id,
      productTitle: campaign.productTitle,
      status: campaign.status,
      objective: campaign.objective,
      budget: campaign.budget,
      createdAt: campaign.createdAt,
      ...(includeCreatives && { creatives: campaign.AdCreatives }),
      ...(includePerformance && { performances: campaign.Performances })
    }));
  }

  formatAsCSV(data) {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object') return JSON.stringify(value);
          return `"${value}"`;
        }).join(',')
      )
    ].join('\n');

    return csvContent;
  }
}

module.exports = new AnalyticsController();