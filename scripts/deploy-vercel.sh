#!/bin/bash

# AI Facebook Ads Pro - Vercel Deployment Script
# This script helps you deploy the app to Vercel with proper environment variables

echo "🚀 AI Facebook Ads Pro - Vercel Deployment"
echo "=========================================="

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Login to Vercel (if not already logged in)
echo "🔐 Checking Vercel authentication..."
vercel whoami || vercel login

# Set environment variables
echo "🔧 Setting up environment variables..."

# Production environment variables
vercel env add SHOPIFY_API_KEY production
vercel env add SHOPIFY_API_SECRET_KEY production
vercel env add FACEBOOK_APP_ID production
vercel env add FACEBOOK_APP_SECRET production
vercel env add GEMINI_API_KEY production
vercel env add POSTGRES_URL production
vercel env add HOST production
vercel env add SESSION_SECRET production
vercel env add NODE_ENV production

echo "✅ Environment variables configured!"

# Deploy to production
echo "🚀 Deploying to production..."
vercel --prod

echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update your Shopify app URLs in the Partner Dashboard"
echo "2. Update your Facebook app OAuth redirect URIs"
echo "3. Test the app installation flow"
echo ""
echo "Your app should be live at: https://your-app-name.vercel.app"