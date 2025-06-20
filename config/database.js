const { Sequelize, DataTypes } = require('sequelize');

// Environment variables
const {
  DATABASE_URL,
  POSTGRES_URL,
  NODE_ENV = 'production'
} = process.env;

// Database setup
const sequelize = new Sequelize(DATABASE_URL || POSTGRES_URL || 'sqlite::memory:', {
  logging: NODE_ENV === 'development' ? console.log : false,
  dialectOptions: (DATABASE_URL || POSTGRES_URL) ? {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  } : {}
});

// Enhanced Database Models

// User model with extended features
const User = sequelize.define('User', {
  shopDomain: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  shopifyAccessToken: DataTypes.TEXT,
  facebookAccessToken: DataTypes.TEXT,
  facebookUserId: DataTypes.STRING,
  facebookAdAccountId: DataTypes.STRING,
  facebookCatalogId: DataTypes.STRING,
  email: DataTypes.STRING,
  shopName: DataTypes.STRING,
  currency: DataTypes.STRING,
  timezone: DataTypes.STRING,
  hasCompletedOnboarding: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  lastProductSyncAt: DataTypes.DATE,
  settings: {
    type: DataTypes.JSON,
    defaultValue: {
      autoOptimization: true,
      budgetAlerts: true,
      performanceAlerts: true,
      weeklyReports: true,
      currency: 'USD',
      timezone: 'UTC'
    }
  },
  subscription: {
    type: DataTypes.ENUM('trial', 'professional', 'enterprise'),
    defaultValue: 'trial'
  },
  trialEndsAt: DataTypes.DATE,
  lastLoginAt: DataTypes.DATE,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
});

// Enhanced Campaign model
const Campaign = sequelize.define('Campaign', {
  userId: {
    type: DataTypes.INTEGER,
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
  status: {
    type: DataTypes.ENUM('active', 'paused', 'completed', 'failed', 'draft'),
    defaultValue: 'draft'
  },
  objective: {
    type: DataTypes.ENUM('CONVERSIONS', 'TRAFFIC', 'REACH', 'BRAND_AWARENESS', 'VIDEO_VIEWS'),
    defaultValue: 'CONVERSIONS'
  },
  adContent: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  targeting: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  budget: DataTypes.DECIMAL(10, 2),
  budgetType: {
    type: DataTypes.ENUM('daily', 'lifetime'),
    defaultValue: 'daily'
  },
  bidStrategy: {
    type: DataTypes.ENUM('LOWEST_COST_WITHOUT_CAP', 'LOWEST_COST_WITH_BID_CAP', 'TARGET_COST'),
    defaultValue: 'LOWEST_COST_WITHOUT_CAP'
  },
  performanceData: {
    type: DataTypes.JSON,
    defaultValue: {}
  },
  aiOptimizations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  lastOptimizedAt: DataTypes.DATE,
  createdBy: {
    type: DataTypes.ENUM('user', 'ai'),
    defaultValue: 'user'
  }
});

// Ad Creative model
const AdCreative = sequelize.define('AdCreative', {
  campaignId: {
    type: DataTypes.INTEGER,
    references: {
      model: Campaign,
      key: 'id'
    }
  },
  facebookCreativeId: DataTypes.STRING,
  type: {
    type: DataTypes.ENUM('image', 'video', 'carousel', 'collection'),
    defaultValue: 'image'
  },
  headline: DataTypes.STRING,
  primaryText: DataTypes.TEXT,
  description: DataTypes.STRING,
  callToAction: DataTypes.STRING,
  imageUrl: DataTypes.STRING,
  videoUrl: DataTypes.STRING,
  linkUrl: DataTypes.STRING,
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  performanceScore: DataTypes.DECIMAL(3, 2),
  generatedByAI: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
});

// Enhanced Performance tracking
const Performance = sequelize.define('Performance', {
  campaignId: {
    type: DataTypes.INTEGER,
    references: {
      model: Campaign,
      key: 'id'
    }
  },
  adCreativeId: {
    type: DataTypes.INTEGER,
    references: {
      model: AdCreative,
      key: 'id'
    },
    allowNull: true
  },
  impressions: DataTypes.INTEGER,
  clicks: DataTypes.INTEGER,
  conversions: DataTypes.INTEGER,
  spend: DataTypes.DECIMAL(10, 2),
  revenue: DataTypes.DECIMAL(10, 2),
  ctr: DataTypes.DECIMAL(5, 4),
  cpc: DataTypes.DECIMAL(10, 2),
  cpm: DataTypes.DECIMAL(10, 2),
  roas: DataTypes.DECIMAL(5, 2),
  frequency: DataTypes.DECIMAL(3, 2),
  reach: DataTypes.INTEGER,
  videoViews: DataTypes.INTEGER,
  videoViewsP25: DataTypes.INTEGER,
  videoViewsP50: DataTypes.INTEGER,
  videoViewsP75: DataTypes.INTEGER,
  videoViewsP100: DataTypes.INTEGER,
  recordedAt: DataTypes.DATE,
  dateStart: DataTypes.DATEONLY,
  dateEnd: DataTypes.DATEONLY
});

// AI Generation history
const AdGeneration = sequelize.define('AdGeneration', {
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  productId: DataTypes.STRING,
  prompt: DataTypes.TEXT,
  generatedContent: DataTypes.JSON,
  aiModel: {
    type: DataTypes.STRING,
    defaultValue: 'gemini-pro'
  },
  used: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  rating: DataTypes.INTEGER, // User feedback 1-5
  feedback: DataTypes.TEXT
});

// Optimization history
const Optimization = sequelize.define('Optimization', {
  campaignId: {
    type: DataTypes.INTEGER,
    references: {
      model: Campaign,
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('budget', 'targeting', 'creative', 'bidding', 'schedule'),
    allowNull: false
  },
  oldValue: DataTypes.JSON,
  newValue: DataTypes.JSON,
  reason: DataTypes.TEXT,
  impact: DataTypes.JSON, // Expected and actual impact
  status: {
    type: DataTypes.ENUM('pending', 'applied', 'reverted'),
    defaultValue: 'pending'
  },
  appliedAt: DataTypes.DATE,
  aiConfidence: DataTypes.DECIMAL(3, 2)
});

// Audience insights
const Audience = sequelize.define('Audience', {
  userId: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  name: DataTypes.STRING,
  description: DataTypes.TEXT,
  targeting: DataTypes.JSON,
  estimatedSize: DataTypes.INTEGER,
  performance: DataTypes.JSON,
  isCustom: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  facebookAudienceId: DataTypes.STRING
});

// Alerts and notifications
const Alert = sequelize.define('Alert', {
  userId: {
    type: DataTypes.INTEGER,
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
    },
    allowNull: true
  },
  type: {
    type: DataTypes.ENUM('budget_exceeded', 'low_performance', 'high_performance', 'optimization_suggestion', 'error'),
    allowNull: false
  },
  title: DataTypes.STRING,
  message: DataTypes.TEXT,
  severity: {
    type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
    defaultValue: 'medium'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  actionRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  actionData: DataTypes.JSON
});

// Set up associations
User.hasMany(Campaign);
Campaign.belongsTo(User);

Campaign.hasMany(AdCreative);
AdCreative.belongsTo(Campaign);

Campaign.hasMany(Performance);
Performance.belongsTo(Campaign);

AdCreative.hasMany(Performance);
Performance.belongsTo(AdCreative);

Campaign.hasMany(Optimization);
Optimization.belongsTo(Campaign);

User.hasMany(AdGeneration);
AdGeneration.belongsTo(User);

User.hasMany(Audience);
Audience.belongsTo(User);

User.hasMany(Alert);
Alert.belongsTo(User);

Campaign.hasMany(Alert);
Alert.belongsTo(Campaign);

// Initialize database
async function initDatabase() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    await sequelize.sync({ alter: NODE_ENV === 'development' });
    console.log('✅ Database models synchronized.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
  }
}

module.exports = {
  sequelize,
  User,
  Campaign,
  AdCreative,
  Performance,
  AdGeneration,
  Optimization,
  Audience,
  Alert,
  initDatabase
};