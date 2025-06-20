# 🚀 AI Facebook Ads Pro - Shopify App v4.0

A comprehensive AI-powered Facebook advertising management app for Shopify stores. This app provides intelligent campaign creation, optimization, and management with a modern Shopify-style dashboard.

## ✨ Features

### 🎯 Core Features
- **AI Campaign Generation**: Automatically create compelling ad campaigns using Google Gemini AI
- **Smart Targeting**: AI-powered audience suggestions based on product data and customer behavior
- **Auto Optimization**: Continuous campaign optimization with budget adjustments and bid management
- **Complete Campaign Management**: Create, edit, pause, resume, duplicate, and delete campaigns
- **Real-time Analytics**: Comprehensive performance tracking and insights
- **Shopify Integration**: Seamless product sync and order attribution

### 🤖 AI-Powered Features
- **Content Generation**: Create compelling ad copy, headlines, and descriptions
- **Audience Builder**: Generate targeted audience suggestions
- **Budget Optimization**: AI-recommended budget adjustments for maximum ROAS
- **Performance Analysis**: Intelligent insights and optimization recommendations
- **Creative Testing**: Automatic A/B testing of ad creatives

### 📱 Dashboard Features
- **Modern Shopify-style UI**: Clean, intuitive interface optimized for Shopify iframe
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Real-time Updates**: Live performance data and notifications
- **Comprehensive Analytics**: Charts, metrics, and exportable reports
- **Campaign Management**: Full CRUD operations for campaigns and creatives

## 🛠 Technology Stack

- **Backend**: Node.js, Koa.js
- **Database**: Sequelize ORM (supports PostgreSQL, MySQL, SQLite)
- **AI**: Google Gemini AI for content generation and optimization
- **Frontend**: Modern vanilla JavaScript with Shopify Polaris design system
- **APIs**: Shopify Admin API, Facebook Marketing API
- **Deployment**: Vercel-ready with optimized configuration

## 📦 Quick Start

### Prerequisites
- Node.js 18.0.0 or higher
- npm or yarn
- Shopify Partner account
- Facebook Developer account
- Google AI API key

### Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/your-username/ai-facebook-ads-pro.git
   cd ai-facebook-ads-pro
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials
   ```

3. **Configure Shopify App**
   - Create a new app in your Shopify Partner Dashboard
   - Set the app URL to your deployment URL
   - Add the required scopes: `read_products,write_products,read_orders,write_orders,read_customers,read_customer_events`
   - Configure OAuth redirect URLs

4. **Configure Facebook App**
   - Create a Facebook app in Facebook Developer Console
   - Add Marketing API permissions
   - Configure webhook endpoints

5. **Start Development Server**
   ```bash
   npm run dev
   ```

## 🚀 Deployment

### Vercel Deployment (Recommended)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

3. **Configure Environment Variables**
   - Add all environment variables in Vercel dashboard
   - Update Shopify app URLs with your Vercel domain

### Manual Deployment

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Start production server**
   ```bash
   npm start
   ```

## 📋 Shopify App Store Submission Checklist

### ✅ Technical Requirements

- [x] **Embedded App**: Uses App Bridge 2.0+ for seamless Shopify admin integration
- [x] **Session Token Authentication**: Secure authentication with session tokens
- [x] **Core Web Vitals Optimized**: 
  - LCP < 2.5 seconds
  - CLS < 0.1
  - INP < 200 milliseconds
- [x] **Theme App Extensions**: Facebook Pixel integration for storefront
- [x] **Clean Uninstall**: Proper webhook handling for app removal
- [x] **Performance Optimized**: Caching, compression, and resource optimization

### ✅ Functionality Requirements

- [x] **Well Integrated**: Primary workflows in Shopify admin
- [x] **No Asset API Usage**: Uses theme app extensions instead
- [x] **Shopify Design Guidelines**: Consistent UI/UX with Shopify admin
- [x] **Proper Error Handling**: Graceful error handling and user feedback

### ✅ App Features

- [x] **AI Campaign Creation**: Generate Facebook ads using AI
- [x] **Product Sync**: Sync Shopify products to Facebook catalog
- [x] **Conversion Tracking**: Facebook Pixel and Conversions API integration
- [x] **Performance Analytics**: Real-time campaign performance tracking
- [x] **Onboarding Flow**: Guided setup for new users

## 🔧 Configuration

### Required Environment Variables

```env
# Shopify Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET_KEY=your_shopify_secret
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Facebook Configuration  
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_secret
FACEBOOK_WEBHOOK_SECRET=your_facebook_webhook_secret

# Database
DATABASE_URL=your_database_url

# Server
HOST=https://your-app-domain.com
PORT=12000
SESSION_SECRET=your_session_secret

# AI
GOOGLE_AI_API_KEY=your_google_ai_key
```

### Shopify App Configuration

Create `shopify.app.toml` in your project root:

```toml
name = "AI Facebook Ads Pro"
client_id = "{{ SHOPIFY_API_KEY }}"
application_url = "{{ HOST }}"
embedded = true

[access_scopes]
scopes = "write_products,read_products,write_orders,read_orders,read_customers,read_customer_events"

[auth]
redirect_urls = [
  "{{ HOST }}/auth/shopify/callback"
]
```

## 🎯 Usage

### For Merchants

1. **Install the App**: Click "Install" from the Shopify App Store
2. **Connect Facebook**: Link your Facebook Business account
3. **Sync Products**: Import your Shopify products to Facebook catalog
4. **Create Campaigns**: Use AI to generate high-converting ad campaigns
5. **Monitor Performance**: Track results and optimize campaigns

### For Developers

1. **API Endpoints**: RESTful API for campaign management
2. **Webhooks**: Real-time updates from Shopify and Facebook
3. **Database Models**: Comprehensive data models for campaigns, users, and analytics
4. **AI Integration**: Google Gemini AI for content generation

## 📊 Performance Monitoring

The app includes built-in performance monitoring for Core Web Vitals:

- **LCP Tracking**: Largest Contentful Paint monitoring
- **CLS Tracking**: Cumulative Layout Shift detection  
- **INP Tracking**: Interaction to Next Paint measurement
- **Response Time**: Server response time monitoring

## 🔒 Security

- **Session Token Authentication**: Secure Shopify authentication
- **Webhook Verification**: HMAC signature verification
- **Data Encryption**: Sensitive data encryption at rest
- **CORS Protection**: Proper CORS configuration for Shopify embedding
- **Rate Limiting**: API rate limiting and abuse prevention

## 🧪 Testing

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suite
npm test -- --grep "Campaign"
```

## 📈 Analytics & Reporting

- **Campaign Performance**: ROAS, CTR, CPC, conversions
- **Product Analytics**: Best performing products and categories
- **Audience Insights**: Demographic and behavioral data
- **Revenue Attribution**: Order tracking and attribution
- **Export Capabilities**: CSV/Excel export for external analysis

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Documentation**: [Full documentation](https://docs.your-app.com)
- **Support Email**: support@your-app.com
- **GitHub Issues**: [Report bugs](https://github.com/your-username/ai-facebook-ads-pro/issues)

## 🎉 Changelog

### v4.0.0
- Complete rewrite with modern architecture
- App Bridge 2.0+ integration
- Core Web Vitals optimization
- Theme app extensions
- Enhanced AI capabilities
- Improved onboarding flow

---

**Made with ❤️ for Shopify merchants who want to scale their Facebook advertising with AI**