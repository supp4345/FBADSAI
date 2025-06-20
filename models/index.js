// Database Models for AI Facebook Ads Pro
const { Sequelize, DataTypes } = require('sequelize');

// Initialize Sequelize
const sequelize = new Sequelize(process.env.DATABASE_URL || 'sqlite::memory:', {
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  dialectOptions: process.env.NODE_ENV === 'production' && process.env.DATABASE_URL?.includes('postgres') ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {},
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// User Model
const User = sequelize.define('User', {
  shopDomain: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isUrl: true
    }
  },
  shopifyAccessToken: {
    type: DataTypes.STRING,
    allowNull: true
  },
  facebookAccessToken: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  facebookUserId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  facebookAdAccountId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  email: {
    type: DataTypes.STRING,
    validate: {
      isEmail: true
    }
  },
  shopName: DataTypes.STRING,
  shopOwner: DataTypes.STRING,
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      notifications: true,
      autoOptimize: false,
      defaultBudget: 50,
      timezone: 'America/New_York'
    }
  },
  subscription: {
    type: DataTypes.ENUM('trial', 'professional', 'enterprise'),
    defaultValue: 'trial'
  },
  subscriptionStartedAt: DataTypes.DATE,
  trialEndsAt: DataTypes.DATE,
  totalSpend: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  lastActiveAt: DataTypes.DATE
}, {
  indexes: [
    { fields: ['shopDomain'] },
    { fields: ['subscription'] }
  ]
});

// Campaign Model
const Campaign = sequelize.define('Campaign', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  facebookCampaignId: DataTypes.STRING,
  facebookAdSetId: DataTypes.STRING,
  facebookAdId: DataTypes.STRING,
  productId: DataTypes.STRING,
  productTitle: DataTypes.STRING,
  productHandle: DataTypes.STRING,
  productImage: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'failed'),
    defaultValue: 'draft'
  },
  objective: {
    type: DataTypes.ENUM('conversions', 'traffic', 'awareness', 'engagement', 'leads'),
    defaultValue: 'conversions'
  },
  adContent: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  targeting: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  budgetType: {
    type: DataTypes.ENUM('daily', 'lifetime'),
    defaultValue: 'daily'
  },
  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,
  performanceData: {
    type: DataTypes.JSON,
    defaultValue: {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      spend: 0,
      revenue: 0
    }
  },
  aiOptimizations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  lastSyncedAt: DataTypes.DATE
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['status'] },
    { fields: ['facebookCampaignId'] }
  ]
});

// Ad Generation Model
const AdGeneration = sequelize.define('AdGeneration', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  campaignId: {
    type: DataTypes.INTEGER,
    references: {
      model: Campaign,
      key: 'id'
    }
  },
  productId: DataTypes.STRING,
  productData: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  generatedContent: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  variations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  aiModel: {
    type: DataTypes.STRING,
    defaultValue: 'gemini-pro'
  },
  promptUsed: DataTypes.TEXT,
  quality: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'excellent'),
    defaultValue: 'high'
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usedAt: DataTypes.DATE,
  feedback: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['productId'] },
    { fields: ['used'] }
  ]
});

// Performance Model
const Performance = sequelize.define('Performance', {
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Campaign,
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  impressions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  reach: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  clicks: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  conversions: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  addToCart: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  checkoutInitiated: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  spend: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  revenue: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  ctr: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  cpc: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  cpm: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0
  },
  roas: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  conversionRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0
  },
  hourlyData: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  demographicData: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  placementData: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  indexes: [
    { fields: ['campaignId', 'date'], unique: true },
    { fields: ['date'] }
  ]
});

// Campaign Insight Model
const CampaignInsight = sequelize.define('CampaignInsight', {
  campaignId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Campaign,
      key: 'id'
    }
  },
  insightType: {
    type: DataTypes.ENUM('performance', 'optimization', 'audience', 'creative', 'budget'),
    allowNull: false
  },
  severity: {
    type: DataTypes.ENUM('info', 'suggestion', 'warning', 'critical'),
    defaultValue: 'suggestion'
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  recommendations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  metrics: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  actionTaken: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  actionResult: DataTypes.TEXT,
  generatedBy: {
    type: DataTypes.ENUM('ai', 'system', 'user'),
    defaultValue: 'ai'
  }
}, {
  indexes: [
    { fields: ['campaignId'] },
    { fields: ['insightType'] },
    { fields: ['severity'] }
  ]
});

// App Usage Model
const AppUsage = sequelize.define('AppUsage', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id'
    }
  },
  action: {
    type: DataTypes.STRING,
    allowNull: false
  },
  resource: DataTypes.STRING,
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  ipAddress: DataTypes.STRING,
  userAgent: DataTypes.TEXT,
  duration: DataTypes.INTEGER, // in milliseconds
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  error: DataTypes.TEXT
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['action'] },
    { fields: ['createdAt'] }
  ]
});

// Ad Template Model
const AdTemplate = sequelize.define('AdTemplate', {
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  category: {
    type: DataTypes.STRING,
    defaultValue: 'general'
  },
  content: {
    type: DataTypes.JSON,
    allowNull: false
  },
  targeting: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  isPublic: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  rating: {
    type: DataTypes.DECIMAL(3, 2),
    defaultValue: 0
  },
  tags: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  indexes: [
    { fields: ['userId'] },
    { fields: ['isPublic'] },
    { fields: ['category'] }
  ]
});

// Set up associations
User.hasMany(Campaign, { foreignKey: 'userId' });
Campaign.belongsTo(User, { foreignKey: 'userId' });

Campaign.hasMany(Performance, { foreignKey: 'campaignId' });
Performance.belongsTo(Campaign, { foreignKey: 'campaignId' });

Campaign.hasMany(CampaignInsight, { foreignKey: 'campaignId' });
CampaignInsight.belongsTo(Campaign, { foreignKey: 'campaignId' });

User.hasMany(AdGeneration, { foreignKey: 'userId' });
AdGeneration.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(AppUsage, { foreignKey: 'userId' });
AppUsage.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(AdTemplate, { foreignKey: 'userId' });
AdTemplate.belongsTo(User, { foreignKey: 'userId' });

// Export models and sequelize instance
module.exports = {
  sequelize,
  User,
  Campaign,
  AdGeneration,
  Performance,
  CampaignInsight,
  AppUsage,
  AdTemplate
};