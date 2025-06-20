const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  shopifyChargeId: {
    type: DataTypes.STRING,
    allowNull: true, // For Shopify billing API
    unique: true
  },
  plan: {
    type: DataTypes.ENUM('free', 'basic', 'pro', 'enterprise'),
    allowNull: false,
    defaultValue: 'free'
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled', 'expired', 'pending', 'declined'),
    allowNull: false,
    defaultValue: 'pending'
  },
  billingCycle: {
    type: DataTypes.ENUM('monthly', 'yearly'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00
  },
  currency: {
    type: DataTypes.STRING(3),
    allowNull: false,
    defaultValue: 'USD'
  },
  trialEndsAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  currentPeriodStart: {
    type: DataTypes.DATE,
    allowNull: true
  },
  currentPeriodEnd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  cancelledAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Usage tracking
  aiGenerationsUsed: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  aiGenerationsLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 10 // Free plan limit
  },
  campaignsCreated: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  campaignsLimit: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 3 // Free plan limit
  },
  // Feature flags
  features: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: {
      aiCampaignGeneration: true,
      aiOptimization: false,
      advancedAnalytics: false,
      customAudiences: false,
      bulkOperations: false,
      apiAccess: false,
      prioritySupport: false,
      whiteLabel: false
    }
  },
  metadata: {
    type: DataTypes.JSON,
    allowNull: true
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['shopifyChargeId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['plan']
    }
  ]
});

// Define subscription plans
Subscription.PLANS = {
  free: {
    name: 'Free',
    price: 0,
    aiGenerationsLimit: 10,
    campaignsLimit: 3,
    features: {
      aiCampaignGeneration: true,
      aiOptimization: false,
      advancedAnalytics: false,
      customAudiences: false,
      bulkOperations: false,
      apiAccess: false,
      prioritySupport: false,
      whiteLabel: false
    }
  },
  basic: {
    name: 'Basic',
    price: 29.99,
    aiGenerationsLimit: 100,
    campaignsLimit: 25,
    features: {
      aiCampaignGeneration: true,
      aiOptimization: true,
      advancedAnalytics: false,
      customAudiences: true,
      bulkOperations: false,
      apiAccess: false,
      prioritySupport: false,
      whiteLabel: false
    }
  },
  pro: {
    name: 'Pro',
    price: 79.99,
    aiGenerationsLimit: 500,
    campaignsLimit: 100,
    features: {
      aiCampaignGeneration: true,
      aiOptimization: true,
      advancedAnalytics: true,
      customAudiences: true,
      bulkOperations: true,
      apiAccess: true,
      prioritySupport: true,
      whiteLabel: false
    }
  },
  enterprise: {
    name: 'Enterprise',
    price: 199.99,
    aiGenerationsLimit: -1, // Unlimited
    campaignsLimit: -1, // Unlimited
    features: {
      aiCampaignGeneration: true,
      aiOptimization: true,
      advancedAnalytics: true,
      customAudiences: true,
      bulkOperations: true,
      apiAccess: true,
      prioritySupport: true,
      whiteLabel: true
    }
  }
};

// Instance methods
Subscription.prototype.hasFeature = function(feature) {
  return this.features && this.features[feature] === true;
};

Subscription.prototype.canUseAI = function() {
  if (this.aiGenerationsLimit === -1) return true; // Unlimited
  return this.aiGenerationsUsed < this.aiGenerationsLimit;
};

Subscription.prototype.canCreateCampaign = function() {
  if (this.campaignsLimit === -1) return true; // Unlimited
  return this.campaignsCreated < this.campaignsLimit;
};

Subscription.prototype.incrementUsage = function(type) {
  if (type === 'ai') {
    this.aiGenerationsUsed += 1;
  } else if (type === 'campaign') {
    this.campaignsCreated += 1;
  }
  return this.save();
};

Subscription.prototype.resetUsage = function() {
  this.aiGenerationsUsed = 0;
  this.campaignsCreated = 0;
  return this.save();
};

Subscription.prototype.isActive = function() {
  return this.status === 'active' && 
         (!this.currentPeriodEnd || new Date() < this.currentPeriodEnd);
};

Subscription.prototype.isInTrial = function() {
  return this.trialEndsAt && new Date() < this.trialEndsAt;
};

module.exports = Subscription;