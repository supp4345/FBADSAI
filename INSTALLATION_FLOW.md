# 🚀 AI Facebook Ads Pro - Installation Flow

## ✅ Partner Dashboard Installation Process

The app is configured for direct installation from Shopify Partner Dashboard, bypassing the App Store requirement.

### Installation Flow:

1. **Developer clicks "Test on development store" from Partner Dashboard**
   - Partner Dashboard redirects to: `https://your-app.com/?shop=store.myshopify.com`

2. **Root route handles installation request**
   - Validates shop domain format
   - Shows installation page if no shop parameter
   - Redirects to OAuth if shop parameter is valid

3. **OAuth Authentication**
   - Redirects to: `/auth/shopify?shop=store.myshopify.com`
   - Shopify handles permission grants for required scopes
   - Callback to: `/auth/shopify/callback`

4. **User Creation & Setup**
   - Creates user record in database with shop information
   - Stores encrypted access tokens
   - Sets up webhooks automatically
   - Redirects to: `/app?shop=store.myshopify.com&host=...&embedded=1`

5. **Embedded Dashboard Launch**
   - App loads directly in Shopify admin iframe
   - Shows onboarding flow for new users
   - Guides through Facebook connection and product sync

## 🔧 Configuration Changes Made

### 1. Shopify App Configuration (`shopify.app.toml`)
```toml
application_url = "{{ HOST }}/app"  # Points directly to embedded app
embedded = true
```

### 2. Root Route Behavior
```javascript
// Root route now redirects to Shopify App Store if no shop parameter
router.get('/', async (ctx) => {
  const shop = ctx.query.shop;
  
  if (shop) {
    // Shop parameter present - redirect to auth
    ctx.redirect(`/auth/shopify?shop=${encodeURIComponent(shop)}`);
  } else {
    // No shop parameter - redirect to App Store
    ctx.redirect('https://apps.shopify.com/your-app-handle');
  }
});
```

### 3. App Route Behavior
```javascript
// App route requires shop parameter
router.get('/app', async (ctx) => {
  const shop = ctx.query.shop;
  
  if (!shop) {
    ctx.status = 400;
    ctx.body = { error: 'Shop parameter is required. Please install the app from Shopify App Store.' };
    return;
  }
  
  // Check if user exists, if not redirect to auth
  // If user exists, show embedded dashboard
});
```

## 🚀 Benefits of This Approach

### ✅ Shopify App Store Compliant
- No external landing page required
- Direct integration with Shopify admin
- Seamless user experience

### ✅ Better User Experience
- One-click installation from App Store
- Immediate access to app functionality
- No additional sign-up steps required

### ✅ Embedded App Best Practices
- App opens directly in Shopify admin
- Uses App Bridge for seamless integration
- Follows Shopify's embedded app guidelines

## 🔄 Installation URLs

### Development
- **App URL**: `https://your-dev-domain.com/app`
- **OAuth Callback**: `https://your-dev-domain.com/auth/shopify/callback`

### Production
- **App URL**: `https://your-production-domain.com/app`
- **OAuth Callback**: `https://your-production-domain.com/auth/shopify/callback`

## 📋 Testing the Installation Flow

1. **Test with shop parameter**:
   ```
   https://your-app.com/app?shop=test-store.myshopify.com
   ```

2. **Test without shop parameter**:
   ```
   https://your-app.com/
   ```
   Should redirect to Shopify App Store

3. **Test OAuth flow**:
   ```
   https://your-app.com/auth/shopify?shop=test-store.myshopify.com
   ```

## 🎯 Next Steps

1. **Deploy the updated app** to your hosting platform
2. **Update Shopify Partner Dashboard** with new app URL
3. **Test installation** on a development store
4. **Submit to Shopify App Store** for review

---

**The app now provides a seamless installation experience that opens directly in the Shopify dashboard without any landing page redirects.**