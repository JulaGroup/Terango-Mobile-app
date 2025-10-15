# Vendor Location GPS Button - Fix Summary

## Issues Fixed

### 1. ✅ Rate Limit Error (429)
- **Problem**: Expo's `reverseGeocodeAsync` had strict rate limits causing errors
- **Solution**: Replaced with `AddressService.getStructuredAddressFromCoordinates()` with rate limiting (1 second between calls) and exponential backoff

### 2. ✅ Coordinates Showing in Address Field
- **Problem**: When geocoding fails, coordinates (e.g., "13.4548, -16.6823") appear in address field
- **Solution**: Added validation to detect coordinate-only responses and skip updating address field when geocoding fails

### 3. 🔧 Network Error Handling
- **Problem**: Network errors prevent geocoding from working
- **Current Status**: API calls are failing due to network connectivity
- **User Action Required**: Ensure device has internet connection to use reverse geocoding

## How It Works Now

### When GPS Button is Clicked:

1. **Gets GPS Coordinates** ✓
   - Latitude: 13.454830
   - Longitude: -16.682327

2. **Attempts Reverse Geocoding** 
   - Calls Nominatim API with rate limiting
   - If successful: Updates address + city fields
   - If failed: Shows alert, saves only coordinates

3. **User Feedback**
   - ✓ Success: "Business location has been set! 📍 Address: [full address] 🏙️ City: [city]"
   - ⚠️ Network Error: "Coordinates Set ✓ - Unable to get address automatically. Please enter your address and city manually."

## What You Need To Do

### Option 1: Fix Network Connection (Recommended)
The app needs internet to call the Nominatim geocoding API. Check:
- ☐ Device has internet connection
- ☐ Firewall isn't blocking Nominatim API
- ☐ Try on different network (WiFi/Mobile data)

### Option 2: Manual Entry (Works Now)
If network is unavailable:
1. Click "Use my location" button
2. Coordinates will be saved (lat/long)
3. Manually type your address in the Address field
4. Manually type your city in the City field
5. Click "Save Changes"

### Option 3: Use Backend Geocoding (Future Enhancement)
Create a backend endpoint that proxies geocoding requests:
```typescript
// server/src/routes/geocode.routes.ts
router.post('/reverse', async (req, res) => {
  const { latitude, longitude } = req.body;
  // Call Nominatim from server side
  // Server has better network reliability
});
```

## Files Modified

### Frontend
1. **terango/services/AddressService.ts**
   - Added `getStructuredAddressFromCoordinates()` method
   - Returns `{ address: string, city: string } | null`
   - Rate limiting: 1 second between calls
   - Retry logic: 3 attempts with exponential backoff
   - Returns `null` on network errors (no coordinate fallback)

2. **terango/hooks/useLocation.ts**
   - Replaced Expo's `reverseGeocodeAsync` with `AddressService.getAddressFromCoordinates()`
   - Uses same rate-limited API

3. **terango/app/vendor/profile.tsx**
   - Added `city` field to form state
   - Added `handleGetCurrentLocation()` function
   - Added city input field in UI
   - Added coordinate validation (detects if response is just coordinates)
   - Improved error messages

4. **terango/lib/api.ts**
   - Added `latitude`, `longitude`, `city` to Business interface
   - Updated `updateShop` type to accept coordinates

### Backend
5. **server/src/services/shop.service.ts**
   - Added `latitude`, `longitude` to updateShopDetails params

6. **server/src/services/restaurant.service.ts**
   - Already supports `latitude`, `longitude`, `city` ✓

## Testing Checklist

- ☐ Device has internet connection
- ☐ Click "Use my location" button in edit mode
- ☐ GPS permission granted
- ☐ See coordinates populate (lat/long pills)
- ☐ See address + city auto-fill (if network works)
- ☐ Click "Save Changes"
- ☐ Refresh page - coordinates persist
- ☐ Test delivery fee calculation uses saved coordinates

## Current Behavior

**With Internet**: 
- Gets GPS → Geocodes address → Fills all fields → Saves

**Without Internet**:
- Gets GPS → Network error → Shows coordinates only → User enters address manually → Saves

## Network Error Troubleshooting

The error `[AxiosError: Network Error]` means:
1. Device can't reach `nominatim.openstreetmap.org`
2. Could be firewall, VPN, or no internet
3. Try: `ping nominatim.openstreetmap.org` in terminal
4. Alternative: Use Google Geocoding API (requires API key)

## Next Steps

If network issues persist, consider:
1. Add Google Geocoding API as fallback (has free tier)
2. Create server-side geocoding endpoint
3. Cache common locations in database
4. Allow manual address entry without geocoding
