# 🚗 TeranGO Driver Location Strategy - RECOMMENDED APPROACH

## Question: Should drivers have location always on?

### ❌ **DON'T: Track 24/7**
Problems:
- **Battery drain** - Driver's phone dies quickly
- **Privacy concerns** - Tracking when not working
- **Unnecessary data** - Location when driver is sleeping/off-duty
- **Server costs** - Storing millions of unused location points
- **Driver dissatisfaction** - "Big Brother" feeling

### ✅ **DO: "Online Mode" Tracking**

## Recommended Implementation: 3-State System

### **State 1: OFFLINE (Default)**
```
Driver Status: Offline
Location Tracking: OFF ❌
Accepts Orders: NO
Battery Impact: ZERO
```

**When:**
- Driver opens app but hasn't started work
- Driver finished work for the day
- Driver on break

**What happens:**
- No location updates sent
- Driver doesn't appear in "available drivers" list
- Can't receive order assignments

---

### **State 2: ONLINE (Available)**
```
Driver Status: Online
Location Tracking: ON ✅ (every 10-30 seconds)
Accepts Orders: YES
Battery Impact: MODERATE
```

**When:**
- Driver taps "Go Online" button
- Ready to accept deliveries
- Actively working

**What happens:**
- Location updates every 10-30 seconds
- Appears in "available drivers" for admin
- Can receive order assignments
- Admin can see nearest drivers

**Location Update Frequency:**
```javascript
// When online and idle (no active delivery)
sendLocationEvery: 30 seconds

// When online with active delivery
sendLocationEvery: 10 seconds (for real-time tracking)
```

---

### **State 3: ON DELIVERY (Active)**
```
Driver Status: On Delivery
Location Tracking: ON ✅ (every 5-10 seconds)
Accepts New Orders: NO (or limited)
Battery Impact: HIGHER (but worth it)
Shares with: Customer + Admin
```

**When:**
- Driver has accepted a delivery
- Currently en route to pickup/delivery

**What happens:**
- Frequent location updates (5-10 seconds)
- Customer can see driver on map
- Admin can monitor delivery
- ETA calculated in real-time

---

## Implementation in Driver App

### Driver App UI Flow:

```
┌─────────────────────────────────────┐
│  TeranGO Driver                     │
│                                      │
│  ┌────────────────────────────┐    │
│  │ You're Offline              │    │
│  │                             │    │
│  │ [  Go Online  ]             │    │  ← Big green button
│  │                             │    │
│  │ Tap to start receiving      │    │
│  │ delivery requests           │    │
│  └────────────────────────────┘    │
│                                      │
│  📊 Today's Earnings: D0            │
│  🚗 Deliveries: 0                   │
└─────────────────────────────────────┘

After tapping "Go Online":

┌─────────────────────────────────────┐
│  TeranGO Driver                     │
│                                      │
│  ┌────────────────────────────────┐ │
│  │ 🟢 You're Online               │ │
│  │                                 │ │
│  │ Waiting for deliveries...       │ │
│  │                                 │ │
│  │ [  Go Offline  ]               │ │  ← Can turn off
│  └────────────────────────────────┘ │
│                                      │
│  📍 Location: Serekunda             │
│  ⚡ Available drivers nearby: 12    │
│                                      │
│  📦 Incoming Requests               │
│  └─ None yet                        │
└─────────────────────────────────────┘
```

### Code Implementation:

```javascript
// Driver App - Location Service

class DriverLocationService {
  private locationInterval: NodeJS.Timeout | null = null;
  private isOnline: boolean = false;
  private hasActiveDelivery: boolean = false;

  async goOnline() {
    this.isOnline = true;
    await this.updateDriverStatus('ONLINE');
    this.startLocationTracking();
  }

  async goOffline() {
    this.isOnline = false;
    this.stopLocationTracking();
    await this.updateDriverStatus('OFFLINE');
  }

  private startLocationTracking() {
    const interval = this.hasActiveDelivery ? 10000 : 30000; // 10s or 30s
    
    this.locationInterval = setInterval(async () => {
      if (this.isOnline) {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        await this.sendLocationToServer({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          timestamp: new Date(),
        });
      }
    }, interval);
  }

  async startDelivery(deliveryId: string) {
    this.hasActiveDelivery = true;
    // Increase frequency to 10 seconds
    this.stopLocationTracking();
    this.startLocationTracking();
  }

  async completeDelivery() {
    this.hasActiveDelivery = false;
    // Decrease frequency back to 30 seconds
    this.stopLocationTracking();
    this.startLocationTracking();
  }
}
```

---

## Admin Panel - Finding Nearest Driver

### Strategy for Express Orders:

```javascript
// When customer creates express order
async function findNearestAvailableDriver(pickupCoords) {
  // 1. Get only ONLINE drivers
  const onlineDrivers = await prisma.driver.findMany({
    where: {
      status: 'ONLINE',
      currentLatitude: { not: null },
      currentLongitude: { not: null },
      // Optional: Only drivers who updated location in last 5 minutes
      lastLocationUpdate: {
        gte: new Date(Date.now() - 5 * 60 * 1000)
      }
    }
  });

  // 2. Calculate distance from pickup point
  const driversWithDistance = onlineDrivers.map(driver => ({
    ...driver,
    distanceToPickup: calculateDistance(
      driver.currentLatitude,
      driver.currentLongitude,
      pickupCoords.latitude,
      pickupCoords.longitude
    )
  }));

  // 3. Sort by distance (nearest first)
  driversWithDistance.sort((a, b) => a.distanceToPickup - b.distanceToPickup);

  // 4. Return top 5 nearest drivers
  return driversWithDistance.slice(0, 5);
}
```

---

## Price Estimation Strategy

### For Initial Quote (Before Driver Accepts):

**Option A: Use Pickup → Delivery Distance (Current)**
```javascript
// Good for fixed pricing
const deliveryDistance = calculateDistance(pickup, delivery);
const estimatedTotal = deliveryDistance * 1.3; // Add 30% buffer
const price = calculatePrice(estimatedTotal, vehicle, weight);
```

**Option B: Find Nearest Driver First**
```javascript
// More accurate but requires driver availability check
const nearestDriver = await findNearestAvailableDriver(pickup);

if (nearestDriver) {
  const driverToPickup = calculateDistance(nearestDriver.location, pickup);
  const pickupToDelivery = calculateDistance(pickup, delivery);
  const totalDistance = driverToPickup + pickupToDelivery;
  const price = calculatePrice(totalDistance, vehicle, weight);
} else {
  // Fallback: Use 1.3x multiplier
  const price = calculatePrice(deliveryDistance * 1.3, vehicle, weight);
}
```

### 🎯 **My Recommendation for Gambia:**

Use **Option A (1.3x multiplier)** because:
- ✅ Instant price quote (no waiting)
- ✅ Consistent pricing (users expect same price each time)
- ✅ Simpler to understand
- ✅ Works even when no drivers online
- ✅ Driver distance averages out over time

Use **Option B** only if:
- You want dynamic pricing like Uber
- You're okay with prices varying
- You have many drivers always online

---

## Battery Optimization Tips

### For Driver App:

```javascript
// 1. Use Balanced Accuracy (not High)
Location.Accuracy.Balanced // vs Location.Accuracy.High

// 2. Adjust frequency based on state
Online + Idle: 30 seconds
Online + Active delivery: 10 seconds
Offline: Don't track

// 3. Stop when app in background (optional)
AppState.addEventListener('change', (state) => {
  if (state === 'background') {
    // Reduce frequency or pause
  }
});

// 4. Use significant location changes (iOS)
Location.watchPositionAsync({
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 50, // Only update if moved 50+ meters
});
```

---

## Recommended Database Schema

```sql
-- Driver table
CREATE TABLE drivers (
  id UUID PRIMARY KEY,
  user_id UUID,
  status ENUM('OFFLINE', 'ONLINE', 'ON_DELIVERY'),
  current_latitude DECIMAL(10, 8),
  current_longitude DECIMAL(11, 8),
  last_location_update TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Index for fast nearest-driver queries
CREATE INDEX idx_drivers_online_location 
ON drivers (status, current_latitude, current_longitude)
WHERE status = 'ONLINE';

-- Optional: Location history (for analytics)
CREATE TABLE driver_location_history (
  id UUID PRIMARY KEY,
  driver_id UUID,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  recorded_at TIMESTAMP,
  -- Auto-delete old records
  ttl TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days')
);
```

---

## Summary: Best Practice for TeranGO

### ✅ **Implement This:**

1. **3-State System:**
   - OFFLINE (no tracking)
   - ONLINE (track every 30s)
   - ON_DELIVERY (track every 10s)

2. **Driver Controls:**
   - Big "Go Online/Offline" toggle
   - Clear battery impact explanation
   - Show earnings while online

3. **Admin Features:**
   - See only online drivers on map
   - Find nearest 5 drivers for each order
   - Auto-assign to nearest available

4. **Pricing:**
   - Use 1.3x multiplier for estimates
   - Fixed upfront pricing
   - Don't dynamically change based on actual driver location

5. **Battery Optimization:**
   - Balanced accuracy
   - Frequency based on state
   - Distance-based updates (50m threshold)

### 📊 Expected Results:

- **Driver satisfaction:** High (control over tracking)
- **Battery life:** ~8-12 hours of online time
- **Accuracy:** ±10-50 meters (good enough)
- **Server costs:** Low (only online drivers)
- **Customer experience:** Real-time tracking when needed

---

## What NOT to Do:

❌ Track all drivers 24/7
❌ High accuracy location (battery killer)
❌ Update every second (overkill)
❌ Show offline drivers to customers
❌ Dynamic pricing based on driver location (confusing)

---

**Bottom Line:** Use "Online Mode" tracking. Drivers control when they're tracked. Admin sees nearest online drivers. Customers get real-time tracking during delivery. Everyone wins! 🎉
