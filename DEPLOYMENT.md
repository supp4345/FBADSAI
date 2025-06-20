# 🚀 Deployment Guide - AI Facebook Ads Pro

This guide will help you deploy the AI Facebook Ads Pro Shopify app to production using Vercel.

## 📋 Prerequisites

Before deploying, ensure you have:

- ✅ Vercel account (free tier available)
- ✅ GitHub repository with your code
- ✅ Shopify Partner account
- ✅ Facebook Developer account
- ✅ Google AI API key
- ✅ Database (PostgreSQL recommended for production)

## 🔧 Environment Variables

Set up the following environment variables in your Vercel dashboard:

### Required Variables

```env
# App Configuration
NODE_ENV=production
HOST=https://your-app-domain.vercel.app

# Shopify App Credentials
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET_KEY=your_shopify_secret_key

# Facebook App Credentials
FACEBOOK_APP_ID=your_facebook_app_id
FACEBOOK_APP_SECRET=your_facebook_app_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Database (PostgreSQL recommended)
DATABASE_URL=postgresql://username:password@host:port/database

# Session Security
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
```

## 🚀 Deployment Steps

### 1. Deploy to Vercel

#### Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

#### Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure environment variables
5. Deploy

### 2. Configure Shopify App

1. **Update App URLs in Shopify Partner Dashboard:**
   ```
   App URL: https://your-app-domain.vercel.app
   Allowed redirection URLs: https://your-app-domain.vercel.app/auth/shopify/callback
   ```

2. **Set Webhook Endpoints:**
   ```
   Orders Create: https://your-app-domain.vercel.app/webhooks/shopify/orders/create
   ```

3. **Configure App Scopes:**
   ```
   read_products,write_products,read_orders,write_orders,read_customers
   ```

### 3. Configure Facebook App

1. **Update OAuth Redirect URIs:**
   ```
   https://your-app-domain.vercel.app/auth/facebook/callback
   ```

2. **Request Required Permissions:**
   - `ads_management`
   - `ads_read`
   - `business_management`

## 🔒 Security Checklist

- ✅ All environment variables are set
- ✅ Session secret is strong and unique
- ✅ HTTPS is enabled (automatic with Vercel)
- ✅ CSP headers are configured for Shopify iframe
- ✅ Webhook signatures are verified

## 🎯 Post-Deployment Checklist

- ✅ App successfully deploys to Vercel
- ✅ Shopify app installation works
- ✅ Facebook authentication works
- ✅ Database connections are stable
- ✅ AI features are functional

---

**🎉 Your AI Facebook Ads Pro app is now live and ready to help Shopify merchants scale their businesses!**