const cron = require('node-cron');
const { Campaign, Performance, User, Optimization, Alert } = require('../config/database');
const { aiService } = require('./aiService');
const facebookService = require('./facebookService');
const { Op } = require('sequelize');

class OptimizationService {
  constructor() {
    this.isRunning = false;
    this.optimizationRules = {
      budget: {
        increaseThreshold: { roas: 4.0, minDays: 3 },
        decreaseThreshold: { roas: 1.5, minDays: 2 },
        maxIncrease: 0.5, // 50% max increase
        maxDecrease: 0.3  // 30% max decrease
      },
      bidding: {
        cpcThreshold: 3.0,
        ctrThreshold: 1.0,
        conversionRateThreshold: 1.0
      },
      creative: {
        performanceThreshold: 0.8, // 80% of average performance
        minImpressions: 1000
      }
    };
  }

  // Start the optimization scheduler
  startOptimizationScheduler() {
    console.log('🤖 Starting AI optimization scheduler...');

    // Run every hour
    cron.schedule('0 * * * *', async () => {
      if (this.isRunning) {
        console.log('Optimization already running, skipping...');
        return;
      }

      console.log('🔄 Running automated campaign optimization...');
      await this.runOptimizationCycle();
    });

    // Run performance sync every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
      console.log('📊 Syncing performance data...');
      await this.syncPerformanceData();
    });

    // Run daily analysis at 9 AM
    cron.schedule('0 9 * * *', async () => {
      console.log('📈 Running daily performance analysis...');
      await this.runDailyAnalysis();
    });

    console.log('✅ Optimization scheduler started');
  }

  // Main optimization cycle
  async runOptimizationCycle() {
    this.isRunning = true;
    
    try {
      // Get all active campaigns
      const campaigns = await Campaign.findAll({
        where: { 
          status: 'active',
          facebookCampaignId: { [Op.not]: null }
        },
        include: [
          { model: User },
          { 
            model: Performance, 
            limit: 7, 
            order: [['createdAt', 'DESC']] 
          }
        ]
      });

      console.log(`Found ${campaigns.length} active campaigns to optimize`);

      for (const campaign of campaigns) {
        try {
          await this.optimizeCampaign(campaign);
        } catch (error) {
          console.error(`Error optimizing campaign ${campaign.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Optimization cycle error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  // Optimize individual campaign
  async optimizeCampaign(campaign) {
    const user = campaign.User;
    const performances = campaign.Performances || [];

    if (performances.length < 2) {
      console.log(`Campaign ${campaign.id} has insufficient data for optimization`);
      return;
    }

    // Calculate current performance metrics
    const metrics = this.calculatePerformanceMetrics(performances);
    
    // Get AI analysis
    const aiAnalysis = await aiService.analyzeCampaignPerformance(campaign.id);
    
    // Apply optimization rules
    const optimizations = [];

    // Budget optimization
    const budgetOptimization = await this.optimizeBudget(campaign, metrics, aiAnalysis);
    if (budgetOptimization) optimizations.push(budgetOptimization);

    // Bidding optimization
    const biddingOptimization = await this.optimizeBidding(campaign, metrics, aiAnalysis);
    if (biddingOptimization) optimizations.push(biddingOptimization);

    // Creative optimization
    const creativeOptimization = await this.optimizeCreatives(campaign, metrics, aiAnalysis);
    if (creativeOptimization) optimizations.push(creativeOptimization);

    // Targeting optimization
    const targetingOptimization = await this.optimizeTargeting(campaign, metrics, aiAnalysis);
    if (targetingOptimization) optimizations.push(targetingOptimization);

    // Apply optimizations
    for (const optimization of optimizations) {
      await this.applyOptimization(campaign, user, optimization);
    }

    // Update last optimization timestamp
    campaign.lastOptimizedAt = new Date();
    await campaign.save();

    console.log(`Applied ${optimizations.length} optimizations to campaign ${campaign.id}`);
  }

  // Budget optimization logic
  async optimizeBudget(campaign, metrics, aiAnalysis) {
    const { roas, spend, daysRunning } = metrics;
    const currentBudget = parseFloat(campaign.budget);
    const rules = this.optimizationRules.budget;

    let newBudget = currentBudget;
    let reason = '';

    // Increase budget if performing well
    if (roas >= rules.increaseThreshold.roas && daysRunning >= rules.increaseThreshold.minDays) {
      const increasePercent = Math.min(
        (roas - rules.increaseThreshold.roas) * 0.1, // 10% per ROAS point above threshold
        rules.maxIncrease
      );
      newBudget = currentBudget * (1 + increasePercent);
      reason = `High ROAS (${roas.toFixed(2)}x) - increasing budget by ${(increasePercent * 100).toFixed(1)}%`;
    }
    // Decrease budget if underperforming
    else if (roas <= rules.decreaseThreshold.roas && daysRunning >= rules.decreaseThreshold.minDays) {
      const decreasePercent = Math.min(
        (rules.decreaseThreshold.roas - roas) * 0.1,
        rules.maxDecrease
      );
      newBudget = currentBudget * (1 - decreasePercent);
      reason = `Low ROAS (${roas.toFixed(2)}x) - decreasing budget by ${(decreasePercent * 100).toFixed(1)}%`;
    }

    // Round to 2 decimal places
    newBudget = Math.round(newBudget * 100) / 100;

    if (newBudget !== currentBudget) {
      return {
        type: 'budget',
        oldValue: { budget: currentBudget },
        newValue: { budget: newBudget },
        reason,
        aiConfidence: aiAnalysis.performance_score || 75
      };
    }

    return null;
  }

  // Bidding optimization logic
  async optimizeBidding(campaign, metrics, aiAnalysis) {
    const { cpc, ctr, conversionRate } = metrics;
    const rules = this.optimizationRules.bidding;

    let newBidStrategy = campaign.bidStrategy;
    let reason = '';

    // Switch to bid cap if CPC is too high
    if (cpc > rules.cpcThreshold && campaign.bidStrategy === 'LOWEST_COST_WITHOUT_CAP') {
      newBidStrategy = 'LOWEST_COST_WITH_BID_CAP';
      reason = `High CPC ($${cpc.toFixed(2)}) - switching to bid cap strategy`;
    }
    // Switch to target cost if conversion rate is low
    else if (conversionRate < rules.conversionRateThreshold && ctr > rules.ctrThreshold) {
      newBidStrategy = 'TARGET_COST';
      reason = `Low conversion rate (${conversionRate.toFixed(2)}%) with good CTR - switching to target cost`;
    }

    if (newBidStrategy !== campaign.bidStrategy) {
      return {
        type: 'bidding',
        oldValue: { bidStrategy: campaign.bidStrategy },
        newValue: { bidStrategy: newBidStrategy },
        reason,
        aiConfidence: aiAnalysis.performance_score || 70
      };
    }

    return null;
  }

  // Creative optimization logic
  async optimizeCreatives(campaign, metrics, aiAnalysis) {
    const { AdCreative } = require('../config/database');
    
    const creatives = await AdCreative.findAll({
      where: { campaignId: campaign.id },
      include: [{
        model: Performance,
        limit: 7,
        order: [['createdAt', 'DESC']]
      }]
    });

    if (creatives.length < 2) return null;

    // Calculate performance for each creative
    const creativePerformance = creatives.map(creative => {
      const performances = creative.Performances || [];
      const metrics = this.calculatePerformanceMetrics(performances);
      return { creative, metrics };
    });

    // Find underperforming creatives
    const avgPerformance = creativePerformance.reduce((sum, cp) => sum + cp.metrics.roas, 0) / creativePerformance.length;
    const threshold = avgPerformance * this.optimizationRules.creative.performanceThreshold;

    const underperformingCreatives = creativePerformance.filter(cp => 
      cp.metrics.roas < threshold && 
      cp.metrics.impressions > this.optimizationRules.creative.minImpressions
    );

    if (underperformingCreatives.length > 0) {
      return {
        type: 'creative',
        oldValue: { activeCreatives: creatives.length },
        newValue: { 
          pauseCreatives: underperformingCreatives.map(cp => cp.creative.id),
          generateNew: true
        },
        reason: `${underperformingCreatives.length} creatives underperforming (ROAS < ${threshold.toFixed(2)}x)`,
        aiConfidence: 80
      };
    }

    return null;
  }

  // Targeting optimization logic
  async optimizeTargeting(campaign, metrics, aiAnalysis) {
    const { ctr, conversionRate, frequency } = metrics;

    // If frequency is too high, expand targeting
    if (frequency > 3.0 && ctr < 1.5) {
      return {
        type: 'targeting',
        oldValue: { targeting: campaign.targeting },
        newValue: { 
          expandAudience: true,
          reason: 'High frequency with low CTR'
        },
        reason: `High frequency (${frequency.toFixed(2)}) with low CTR - expanding audience`,
        aiConfidence: 75
      };
    }

    // If CTR is good but conversion rate is low, narrow targeting
    if (ctr > 2.0 && conversionRate < 1.5) {
      return {
        type: 'targeting',
        oldValue: { targeting: campaign.targeting },
        newValue: { 
          narrowAudience: true,
          reason: 'Good CTR but low conversion rate'
        },
        reason: `Good CTR (${ctr.toFixed(2)}%) but low conversion rate - narrowing audience`,
        aiConfidence: 70
      };
    }

    return null;
  }

  // Apply optimization to Facebook
  async applyOptimization(campaign, user, optimization) {
    try {
      // Save optimization record
      const optimizationRecord = await Optimization.create({
        campaignId: campaign.id,
        type: optimization.type,
        oldValue: optimization.oldValue,
        newValue: optimization.newValue,
        reason: optimization.reason,
        aiConfidence: optimization.aiConfidence,
        status: 'pending'
      });

      // Apply to Facebook based on type
      switch (optimization.type) {
        case 'budget':
          await facebookService.updateCampaign(user, campaign.facebookCampaignId, {
            budget: optimization.newValue.budget
          });
          campaign.budget = optimization.newValue.budget;
          await campaign.save();
          break;

        case 'bidding':
          await facebookService.updateCampaign(user, campaign.facebookCampaignId, {
            bidStrategy: optimization.newValue.bidStrategy
          });
          campaign.bidStrategy = optimization.newValue.bidStrategy;
          await campaign.save();
          break;

        case 'creative':
          // Pause underperforming creatives and generate new ones
          if (optimization.newValue.pauseCreatives) {
            // Implementation for pausing creatives
          }
          if (optimization.newValue.generateNew) {
            // Generate new creatives with AI
            const { getShopifyProduct } = require('./shopifyService');
            const product = await getShopifyProduct(user.id, campaign.productId);
            const newCreatives = await aiService.generateAdCreatives(product, campaign);
            // Create new creatives in database and Facebook
          }
          break;

        case 'targeting':
          // Update targeting based on optimization
          let newTargeting = { ...campaign.targeting };
          if (optimization.newValue.expandAudience) {
            // Expand age range, add interests, etc.
            newTargeting.age_max = Math.min((newTargeting.age_max || 55) + 5, 65);
          }
          if (optimization.newValue.narrowAudience) {
            // Narrow targeting
            newTargeting.age_min = Math.max((newTargeting.age_min || 25) + 2, 18);
            newTargeting.age_max = Math.max((newTargeting.age_max || 55) - 2, 25);
          }
          
          campaign.targeting = newTargeting;
          await campaign.save();
          break;
      }

      // Mark optimization as applied
      optimizationRecord.status = 'applied';
      optimizationRecord.appliedAt = new Date();
      await optimizationRecord.save();

      // Create alert for user
      await Alert.create({
        userId: user.id,
        campaignId: campaign.id,
        type: 'optimization_suggestion',
        title: `Campaign Optimized: ${optimization.type}`,
        message: optimization.reason,
        severity: 'medium',
        actionRequired: false
      });

      console.log(`Applied ${optimization.type} optimization to campaign ${campaign.id}`);
    } catch (error) {
      console.error(`Error applying optimization:`, error);
      
      // Mark optimization as failed
      await Optimization.update(
        { status: 'failed' },
        { where: { campaignId: campaign.id, type: optimization.type, status: 'pending' } }
      );
    }
  }

  // Sync performance data from Facebook
  async syncPerformanceData() {
    try {
      const campaigns = await Campaign.findAll({
        where: { 
          status: 'active',
          facebookCampaignId: { [Op.not]: null }
        },
        include: [{ model: User }]
      });

      for (const campaign of campaigns) {
        try {
          const user = campaign.User;
          const performanceData = await facebookService.getCampaignPerformance(
            user, 
            campaign.facebookCampaignId,
            '1d' // Last day
          );

          if (performanceData && Object.keys(performanceData).length > 0) {
            await Performance.create({
              campaignId: campaign.id,
              impressions: parseInt(performanceData.impressions || 0),
              clicks: parseInt(performanceData.clicks || 0),
              spend: parseFloat(performanceData.spend || 0),
              ctr: parseFloat(performanceData.ctr || 0),
              cpc: parseFloat(performanceData.cpc || 0),
              cpm: parseFloat(performanceData.cpm || 0),
              reach: parseInt(performanceData.reach || 0),
              frequency: parseFloat(performanceData.frequency || 0),
              conversions: parseInt(performanceData.conversions || 0),
              recordedAt: new Date(),
              dateStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
              dateEnd: new Date()
            });
          }
        } catch (error) {
          console.error(`Error syncing performance for campaign ${campaign.id}:`, error);
        }
      }

      console.log(`Synced performance data for ${campaigns.length} campaigns`);
    } catch (error) {
      console.error('Performance sync error:', error);
    }
  }

  // Run daily analysis and alerts
  async runDailyAnalysis() {
    try {
      const users = await User.findAll({
        where: { isActive: true },
        include: [{
          model: Campaign,
          where: { status: 'active' },
          required: false,
          include: [{
            model: Performance,
            limit: 7,
            order: [['createdAt', 'DESC']]
          }]
        }]
      });

      for (const user of users) {
        const campaigns = user.Campaigns || [];
        
        if (campaigns.length === 0) continue;

        // Calculate overall account performance
        const accountMetrics = this.calculateAccountMetrics(campaigns);
        
        // Generate daily insights
        const insights = await this.generateDailyInsights(user, campaigns, accountMetrics);
        
        // Create alerts for significant changes
        await this.createPerformanceAlerts(user, campaigns, accountMetrics);
        
        console.log(`Generated daily analysis for user ${user.id}`);
      }
    } catch (error) {
      console.error('Daily analysis error:', error);
    }
  }

  // Helper methods

  calculatePerformanceMetrics(performances) {
    if (!performances || performances.length === 0) {
      return {
        spend: 0, revenue: 0, roas: 0, ctr: 0, cpc: 0, 
        conversionRate: 0, conversions: 0, impressions: 0, 
        clicks: 0, frequency: 0, daysRunning: 0
      };
    }

    const totals = performances.reduce((acc, perf) => {
      acc.spend += parseFloat(perf.spend || 0);
      acc.revenue += parseFloat(perf.revenue || 0);
      acc.clicks += parseInt(perf.clicks || 0);
      acc.impressions += parseInt(perf.impressions || 0);
      acc.conversions += parseInt(perf.conversions || 0);
      acc.frequency += parseFloat(perf.frequency || 0);
      return acc;
    }, { spend: 0, revenue: 0, clicks: 0, impressions: 0, conversions: 0, frequency: 0 });

    return {
      spend: totals.spend,
      revenue: totals.revenue,
      roas: totals.spend > 0 ? totals.revenue / totals.spend : 0,
      ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
      cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
      conversionRate: totals.clicks > 0 ? (totals.conversions / totals.clicks) * 100 : 0,
      conversions: totals.conversions,
      impressions: totals.impressions,
      clicks: totals.clicks,
      frequency: totals.frequency / performances.length,
      daysRunning: performances.length
    };
  }

  calculateAccountMetrics(campaigns) {
    const allPerformances = campaigns.flatMap(c => c.Performances || []);
    return this.calculatePerformanceMetrics(allPerformances);
  }

  async generateDailyInsights(user, campaigns, metrics) {
    // Generate AI-powered daily insights
    return [];
  }

  async createPerformanceAlerts(user, campaigns, metrics) {
    // Create alerts for performance issues
    const alerts = [];

    // High spend alert
    if (metrics.spend > user.settings?.budgetAlertThreshold || 1000) {
      alerts.push({
        userId: user.id,
        type: 'budget_exceeded',
        title: 'High Daily Spend Alert',
        message: `Your campaigns spent $${metrics.spend.toFixed(2)} today`,
        severity: 'high',
        actionRequired: true
      });
    }

    // Low ROAS alert
    if (metrics.roas < 2.0 && metrics.spend > 50) {
      alerts.push({
        userId: user.id,
        type: 'low_performance',
        title: 'Low ROAS Alert',
        message: `Your ROAS is ${metrics.roas.toFixed(2)}x, below recommended 2.0x`,
        severity: 'medium',
        actionRequired: true
      });
    }

    // Create alerts in database
    for (const alertData of alerts) {
      await Alert.create(alertData);
    }

    return alerts;
  }
}

// Export singleton instance
const optimizationService = new OptimizationService();

function startOptimizationScheduler() {
  optimizationService.startOptimizationScheduler();
}

module.exports = {
  optimizationService,
  startOptimizationScheduler
};