# 📱 Shopify App Installation Flow

## ✅ Updated Installation Process (No Landing Page)

The app has been updated to remove the landing page and open directly in the Shopify dashboard when installed.

### Installation Flow:

1. **User clicks "Install" from Shopify App Store**
   - App Store redirects to: `https://your-app.com/app?shop=store.myshopify.com`

2. **App checks for existing user**
   - If user exists: Shows embedded dashboard immediately
   - If user doesn't exist: Redirects to OAuth flow

3. **OAuth Authentication (if needed)**
   - Redirects to: `/auth/shopify?shop=store.myshopify.com`
   - Shopify handles permission grants
   - Callback to: `/auth/shopify/callback`

4. **User Creation & Redirect**
   - Creates user record in database
   - Sets up webhooks automatically
   - Redirects to: `/app?shop=store.myshopify.com&host=...`

5. **Embedded Dashboard**
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