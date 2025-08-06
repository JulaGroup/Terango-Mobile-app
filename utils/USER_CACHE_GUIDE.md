# User Cache Manager - Usage Guide

## Overview

The `UserCacheManager` provides intelligent user data caching with 24-hour expiration and automatic fallback mechanisms.

## Quick Start

### 1. Import the Manager

```typescript
import { UserCacheManager } from "@/utils/userCache";
```

### 2. Smart Loading (Recommended)

```typescript
// Loads cached data instantly, then fetches fresh data in background
const { cached, fresh } = await UserCacheManager.smartLoadUserData();

// Apply cached data immediately
if (cached) {
  setUserData(cached);
}

// Wait for fresh data and update
const freshData = await fresh;
if (freshData) {
  setUserData(freshData);
}
```

### 3. Manual Caching

```typescript
// Cache user data after API calls or form submissions
await UserCacheManager.cacheUserData({
  fullName: "John Doe",
  email: "john@example.com",
  phone: "+1234567890",
  isVerified: true,
});
```

### 4. Cache Management

```typescript
// Check if cache is valid
const isValid = await UserCacheManager.isCacheValid();

// Clear cache (useful for logout)
await UserCacheManager.clearCache();
```

## Implementation Examples

### In Login/Signup Flow

```typescript
// After successful login/signup
const userData = await loginApi(credentials);
await UserCacheManager.cacheUserData(userData);
```

### In Profile Page

```typescript
useEffect(() => {
  const loadProfile = async () => {
    const { cached, fresh } = await UserCacheManager.smartLoadUserData();

    // Show cached data immediately
    if (cached) setProfile(cached);

    // Update with fresh data
    const freshData = await fresh;
    if (freshData) setProfile(freshData);
  };

  loadProfile();
}, []);
```

### In Checkout (Already Implemented)

```typescript
// Loads user data with instant cached response + background refresh
const loadUserInfo = useCallback(async () => {
  const { cached, fresh } = await UserCacheManager.smartLoadUserData();
  // ... rest of implementation
}, []);
```

## Benefits

1. **⚡ Instant Loading**: Cached data shows immediately
2. **🔄 Always Fresh**: Background API calls keep data current
3. **📱 Offline Ready**: Works without network connection
4. **🧠 Smart**: 24-hour cache expiration prevents stale data
5. **🎯 Consistent**: Same API across all app screens

## Best Practices

1. **Always use smart loading** for the best UX
2. **Cache after successful API calls** (login, profile updates, etc.)
3. **Clear cache on logout** to prevent data leaks
4. **Handle fallbacks gracefully** when both cache and API fail
5. **Use descriptive console logs** to debug cache behavior

## Cache Keys Used

- `cached_user_name` - Full name
- `cached_user_phone` - Phone number
- `cached_user_email` - Email address
- `cached_user_verified` - Verification status
- `cache_timestamp` - Cache creation time

## When to Clear Cache

- User logout
- Account deletion
- Profile reset
- Privacy/security requirements
