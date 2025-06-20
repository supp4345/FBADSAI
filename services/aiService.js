const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Campaign, AdCreative, Performance, User } = require('../config/database');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIzaSyCknRdgn-7SvnD7Q3dJqmRiEna8cYsQfPA');
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

class AIService {
  constructor() {
    this.initialized = false;
  }

  async init() {
    try {
      // Test AI connection
      const result = await model.generateContent("Test connection");
      console.log('✅ AI service initialized successfully');
      this.initialized = true;
    } catch (error) {
      console.error('❌ AI service initialization failed:', error);
    }
  }

  // Generate comprehensive campaign strategy
  async generateCampaignStrategy(product, userPreferences = {}) {
    const prompt = `
    As an expert Facebook Ads strategist, create a comprehensive campaign strategy for this Shopify product:

    PRODUCT DETAILS:
    - Title: ${product.title}
    - Description: ${product.body_html?.replace(/<[^>]*>/g, '') || 'No description'}
    - Price: $${product.variants[0]?.price || 'N/A'}
    - Product Type: ${product.product_type || 'General'}
    - Vendor: ${product.vendor || 'Unknown'}
    - Tags: ${product.tags || 'None'}
    - Images: ${product.images?.length || 0} available

    USER PREFERENCES:
    - Budget: $${userPreferences.budget || '50'}/day
    - Target Audience: ${userPreferences.audience || 'Auto-detect'}
    - Campaign Objective: ${userPreferences.objective || 'Conversions'}
    - Geographic Focus: ${userPreferences.location || 'United States'}

    Generate a complete strategy including:

    1. CAMPAIGN STRUCTURE:
       - Campaign objective and reasoning
       - Ad set strategy (how many, why)
       - Budget allocation recommendations
       - Bidding strategy

    2. AUDIENCE TARGETING (3 different audiences):
       - Primary audience (broad)
       - Secondary audience (interest-based)
       - Lookalike audience strategy
       - For each: demographics, interests, behaviors, exclusions

    3. AD CREATIVES (5 variations):
       - Headlines (max 40 chars each)
       - Primary text (max 125 chars each)
       - Descriptions (max 30 chars each)
       - Call-to-action buttons
       - Creative angles (emotional, logical, social proof, urgency, benefit-focused)

    4. OPTIMIZATION STRATEGY:
       - Key metrics to monitor
       - Optimization schedule
       - Scaling strategy
       - A/B testing plan

    5. PERFORMANCE PREDICTIONS:
       - Expected CTR range
       - Estimated CPC
       - Conversion rate estimate
       - ROAS projection
       - Timeline to profitability

    Format as valid JSON with this structure:
    {
      "campaign": {
        "objective": "",
        "reasoning": "",
        "budget_strategy": "",
        "bidding_strategy": ""
      },
      "audiences": [
        {
          "name": "",
          "type": "",
          "demographics": {},
          "interests": [],
          "behaviors": [],
          "exclusions": []
        }
      ],
      "creatives": [
        {
          "headline": "",
          "primary_text": "",
          "description": "",
          "cta": "",
          "angle": "",
          "reasoning": ""
        }
      ],
      "optimization": {
        "key_metrics": [],
        "schedule": "",
        "scaling_plan": "",
        "testing_plan": []
      },
      "predictions": {
        "ctr_range": "",
        "estimated_cpc": "",
        "conversion_rate": "",
        "roas_projection": "",
        "timeline": ""
      }
    }`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('AI campaign generation error:', error);
      return this.getFallbackCampaignStrategy(product, userPreferences);
    }
  }

  // Generate optimized ad creatives
  async generateAdCreatives(product, campaignData, existingCreatives = []) {
    const existingAngles = existingCreatives.map(c => c.angle || '').join(', ');
    
    const prompt = `
    Create 5 high-converting Facebook ad creatives for this product, avoiding these existing angles: ${existingAngles}

    PRODUCT: ${product.title}
    DESCRIPTION: ${product.body_html?.replace(/<[^>]*>/g, '') || 'No description'}
    PRICE: $${product.variants[0]?.price || 'N/A'}
    CAMPAIGN OBJECTIVE: ${campaignData.objective || 'CONVERSIONS'}
    TARGET AUDIENCE: ${campaignData.audience || 'General'}

    For each creative, use different psychological triggers:
    1. Problem/Solution
    2. Social Proof
    3. Scarcity/Urgency
    4. Benefit-focused
    5. Emotional Appeal

    Requirements:
    - Headlines: Max 40 characters, compelling and clear
    - Primary Text: Max 125 characters, engaging hook + benefit
    - Description: Max 30 characters, strong CTA or benefit
    - Use power words and emotional triggers
    - Include specific benefits, not just features
    - Make each creative distinctly different

    Format as JSON array:
    [
      {
        "headline": "",
        "primary_text": "",
        "description": "",
        "cta": "SHOP_NOW|LEARN_MORE|SIGN_UP|DOWNLOAD|BOOK_TRAVEL|CONTACT_US",
        "angle": "",
        "psychological_trigger": "",
        "target_emotion": ""
      }
    ]`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('AI creative generation error:', error);
      return this.getFallbackCreatives(product);
    }
  }

  // Generate audience suggestions
  async generateAudienceSuggestions(product, campaignObjective = 'CONVERSIONS') {
    const prompt = `
    Generate 5 highly targeted Facebook audience suggestions for this product:

    PRODUCT: ${product.title}
    DESCRIPTION: ${product.body_html?.replace(/<[^>]*>/g, '') || 'No description'}
    CATEGORY: ${product.product_type || 'General'}
    PRICE: $${product.variants[0]?.price || 'N/A'}
    OBJECTIVE: ${campaignObjective}

    Create diverse audience types:
    1. Interest-based (broad interests)
    2. Behavior-based (purchase behaviors)
    3. Demographic-focused (age, income, life events)
    4. Lookalike-ready (for custom audiences)
    5. Competitor-based (competitor interests)

    For each audience include:
    - Detailed targeting criteria
    - Estimated audience size category
    - Why this audience would be interested
    - Recommended ad messaging angle

    Format as JSON:
    {
      "audiences": [
        {
          "name": "",
          "type": "interest|behavior|demographic|lookalike|competitor",
          "targeting": {
            "age_min": 18,
            "age_max": 65,
            "genders": ["all|male|female"],
            "locations": [],
            "interests": [],
            "behaviors": [],
            "life_events": [],
            "income": "",
            "education": ""
          },
          "estimated_size": "small|medium|large",
          "reasoning": "",
          "messaging_angle": "",
          "expected_performance": ""
        }
      ]
    }`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('AI audience generation error:', error);
      return this.getFallbackAudiences(product);
    }
  }

  // Analyze campaign performance and suggest optimizations
  async analyzeCampaignPerformance(campaignId) {
    try {
      const campaign = await Campaign.findByPk(campaignId, {
        include: [
          { model: AdCreative },
          { model: Performance, limit: 30, order: [['createdAt', 'DESC']] }
        ]
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      const performances = campaign.Performances || [];
      const creatives = campaign.AdCreatives || [];

      // Calculate performance metrics
      const totalSpend = performances.reduce((sum, p) => sum + parseFloat(p.spend || 0), 0);
      const totalRevenue = performances.reduce((sum, p) => sum + parseFloat(p.revenue || 0), 0);
      const totalClicks = performances.reduce((sum, p) => sum + parseInt(p.clicks || 0), 0);
      const totalImpressions = performances.reduce((sum, p) => sum + parseInt(p.impressions || 0), 0);
      const totalConversions = performances.reduce((sum, p) => sum + parseInt(p.conversions || 0), 0);

      const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
      const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0;
      const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const roas = totalSpend > 0 ? totalRevenue / totalSpend : 0;

      const prompt = `
      Analyze this Facebook ad campaign performance and provide optimization recommendations:

      CAMPAIGN DATA:
      - Campaign ID: ${campaign.id}
      - Objective: ${campaign.objective}
      - Budget: $${campaign.budget}/day
      - Status: ${campaign.status}
      - Running for: ${Math.ceil((new Date() - campaign.createdAt) / (1000 * 60 * 60 * 24))} days

      PERFORMANCE METRICS:
      - Total Spend: $${totalSpend.toFixed(2)}
      - Total Revenue: $${totalRevenue.toFixed(2)}
      - ROAS: ${roas.toFixed(2)}x
      - CTR: ${avgCTR.toFixed(2)}%
      - CPC: $${avgCPC.toFixed(2)}
      - Conversion Rate: ${conversionRate.toFixed(2)}%
      - Total Conversions: ${totalConversions}
      - Number of Creatives: ${creatives.length}

      INDUSTRY BENCHMARKS:
      - Good CTR: 1.5-2.5%
      - Good CPC: $0.50-$2.00
      - Good Conversion Rate: 2-5%
      - Good ROAS: 3-5x

      Provide detailed analysis and recommendations:

      Format as JSON:
      {
        "overall_health": "excellent|good|average|poor|critical",
        "performance_score": 0-100,
        "key_insights": [
          {
            "metric": "",
            "current_value": "",
            "benchmark": "",
            "status": "above|at|below",
            "impact": "high|medium|low"
          }
        ],
        "recommendations": [
          {
            "type": "budget|targeting|creative|bidding|schedule",
            "priority": "high|medium|low",
            "action": "",
            "reasoning": "",
            "expected_impact": "",
            "implementation_difficulty": "easy|medium|hard"
          }
        ],
        "next_steps": [],
        "predicted_improvements": {
          "roas_increase": "",
          "cost_reduction": "",
          "conversion_increase": ""
        }
      }`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('AI performance analysis error:', error);
      return this.getFallbackAnalysis();
    }
  }

  // Generate budget recommendations
  async generateBudgetRecommendations(campaignData, performanceData) {
    const prompt = `
    Analyze this campaign data and provide intelligent budget recommendations:

    CURRENT CAMPAIGN:
    - Daily Budget: $${campaignData.budget}
    - Objective: ${campaignData.objective}
    - Target ROAS: ${campaignData.targetRoas || '3.0'}x
    - Running Days: ${campaignData.runningDays || 7}

    PERFORMANCE DATA:
    - Current ROAS: ${performanceData.roas || 0}x
    - Daily Spend: $${performanceData.dailySpend || 0}
    - Conversion Rate: ${performanceData.conversionRate || 0}%
    - CPC: $${performanceData.cpc || 0}
    - CTR: ${performanceData.ctr || 0}%

    Provide budget optimization recommendations:

    Format as JSON:
    {
      "current_performance": "underperforming|meeting_goals|exceeding_goals",
      "recommended_budget": {
        "amount": 0,
        "change_percentage": 0,
        "reasoning": ""
      },
      "scaling_strategy": {
        "immediate": "",
        "week_1": "",
        "week_2": "",
        "month_1": ""
      },
      "risk_assessment": {
        "level": "low|medium|high",
        "factors": []
      },
      "expected_outcomes": {
        "roas_projection": "",
        "conversion_increase": "",
        "spend_efficiency": ""
      }
    }`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Failed to parse AI response');
    } catch (error) {
      console.error('AI budget recommendation error:', error);
      return this.getFallbackBudgetRecommendations();
    }
  }

  // Fallback methods for when AI fails
  getFallbackCampaignStrategy(product, userPreferences) {
    return {
      campaign: {
        objective: 'CONVERSIONS',
        reasoning: 'Conversions objective is best for e-commerce products',
        budget_strategy: 'Start with daily budget, scale based on performance',
        bidding_strategy: 'Lowest cost without cap for initial testing'
      },
      audiences: [
        {
          name: 'Broad Interest Audience',
          type: 'interest',
          demographics: { age_min: 25, age_max: 55, genders: ['all'] },
          interests: ['Online shopping', 'E-commerce'],
          behaviors: ['Online shoppers'],
          exclusions: []
        }
      ],
      creatives: [
        {
          headline: product.title.substring(0, 40),
          primary_text: `Discover ${product.title} - Limited time offer!`,
          description: 'Shop now and save!',
          cta: 'SHOP_NOW',
          angle: 'benefit-focused',
          reasoning: 'Direct benefit communication'
        }
      ],
      optimization: {
        key_metrics: ['ROAS', 'CPC', 'CTR', 'Conversion Rate'],
        schedule: 'Daily monitoring for first week',
        scaling_plan: 'Increase budget by 20% when ROAS > 3x',
        testing_plan: ['Test different audiences', 'Test creative variations']
      },
      predictions: {
        ctr_range: '1.5-2.5%',
        estimated_cpc: '$0.50-$2.00',
        conversion_rate: '2-4%',
        roas_projection: '3-5x',
        timeline: '7-14 days to optimization'
      }
    };
  }

  getFallbackCreatives(product) {
    return [
      {
        headline: product.title.substring(0, 40),
        primary_text: `Transform your life with ${product.title}!`,
        description: 'Limited time offer',
        cta: 'SHOP_NOW',
        angle: 'transformation',
        psychological_trigger: 'aspiration',
        target_emotion: 'excitement'
      }
    ];
  }

  getFallbackAudiences(product) {
    return {
      audiences: [
        {
          name: 'General Interest Audience',
          type: 'interest',
          targeting: {
            age_min: 25,
            age_max: 55,
            genders: ['all'],
            locations: ['United States'],
            interests: ['Online shopping'],
            behaviors: [],
            life_events: [],
            income: '',
            education: ''
          },
          estimated_size: 'large',
          reasoning: 'Broad audience for initial testing',
          messaging_angle: 'General benefits and features',
          expected_performance: 'Moderate CTR, good for data collection'
        }
      ]
    };
  }

  getFallbackAnalysis() {
    return {
      overall_health: 'average',
      performance_score: 50,
      key_insights: [
        {
          metric: 'Overall Performance',
          current_value: 'Analyzing...',
          benchmark: 'Industry standard',
          status: 'at',
          impact: 'medium'
        }
      ],
      recommendations: [
        {
          type: 'creative',
          priority: 'medium',
          action: 'Test new ad creatives',
          reasoning: 'Fresh creatives can improve performance',
          expected_impact: 'Moderate improvement in CTR',
          implementation_difficulty: 'easy'
        }
      ],
      next_steps: ['Monitor performance daily', 'Test new audiences'],
      predicted_improvements: {
        roas_increase: '10-20%',
        cost_reduction: '5-15%',
        conversion_increase: '15-25%'
      }
    };
  }

  getFallbackBudgetRecommendations() {
    return {
      current_performance: 'meeting_goals',
      recommended_budget: {
        amount: 50,
        change_percentage: 0,
        reasoning: 'Maintain current budget while optimizing'
      },
      scaling_strategy: {
        immediate: 'Continue current budget',
        week_1: 'Monitor performance closely',
        week_2: 'Consider 20% increase if ROAS > 3x',
        month_1: 'Scale based on consistent performance'
      },
      risk_assessment: {
        level: 'low',
        factors: ['Stable performance', 'Good ROAS']
      },
      expected_outcomes: {
        roas_projection: '3-4x',
        conversion_increase: '10-20%',
        spend_efficiency: 'Improved targeting efficiency'
      }
    };
  }
}

// Initialize AI service
const aiService = new AIService();

async function initAI() {
  await aiService.init();
}

module.exports = {
  aiService,
  initAI
};