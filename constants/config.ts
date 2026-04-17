export const API_URL = "https://monkfish-app-korrv.ondigitalocean.app"; //LIVE
// export const API_URL = "http://192.168.137.1:8080"; //work
// export const API_URL = "http://172.20.10.2:8080"; //Phone;
// export const API_URL = "http://172.20.10.3:8080"; //UG Phone;
export const API_BASE_URL = API_URL; // Alias for consistency

// Google Places API Key - For Future Implementation
//
// When ready to enable address search with autocomplete:
// 1. Go to https://console.cloud.google.com/apis/credentials
// 2. Create a new project or select existing one
// 3. Enable "Places API" in the API Library
// 4. Create an API key and restrict it to:
//    - Android apps (for React Native)
//    - Places API only
//    - Your app's package name and SHA-1 fingerprint
// 5. Replace the placeholder below with your real API key
// 6. Set isGooglePlacesAvailable = true in LocationModalNew.tsx
//
// Note: Google Places has a generous free tier ($200/month credit)
// but requires a billing account with credit card for verification
export const GOOGLE_PLACES_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "YOUR_ACTUAL_API_KEY_HERE"; // Replace with your real API key
