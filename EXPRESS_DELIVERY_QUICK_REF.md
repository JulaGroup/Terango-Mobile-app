# Express Delivery Fixes - Quick Reference

## ✅ All Issues Resolved

### 1. Different Prices for Different Vehicles

- **FIXED**: Each vehicle (BIKE, KEKE_CARGO, CAR, VAN, LORRY) now calculates and displays its own unique price
- **File**: `app/custom-delivery/index.tsx` (lines 392-426)
- **Result**: Users see price differences that reflect vehicle size and capability

### 2. Weight Selection Before Vehicle

- **FIXED**: Weight selection now appears BEFORE vehicle selection
- **File**: `app/custom-delivery/index.tsx` (lines 999-1050)
- **Flow**: Route → Weight → Vehicle (with prices) → Details → Book
- **Result**: Users can make informed vehicle choices based on visible prices

### 3. Consistent Delivery ID Format

- **FIXED**: Both client and server now use `TGEXXX` format
- **File**: `utils/formatExpressDeliveryId.ts`
- **Result**: Admin panel can properly display and track express deliveries

### 4. Distance Calculation Already Correct ✓

- **1.3x multiplier** accounts for driver's pickup journey
- **Formula**: (pickup → dropoff distance) × 1.3
- **No changes needed** - system was already designed correctly

---

## Pricing Formula

```
PRICE = (Base_Fee + (Distance_km × 1.3 × Per_Km_Rate)) × Vehicle_Multiplier
```

**Example** (10km, LIGHT weight, VAN):

```
Base Fee: 80 GMD (LIGHT)
Distance: 10 × 1.3 = 13 km (with pickup)
Per-km: 34 GMD/km (VAN)
Distance Fee: 13 × 34 = 442 GMD
Vehicle Multiplier: 1.4 (VAN)
TOTAL: (80 + 442) × 1.4 = 731 GMD
```

---

## Quick Price Reference (5km delivery)

| Vehicle    | LIGHT | MEDIUM | HEAVY |
| ---------- | ----- | ------ | ----- |
| BIKE       | D197  | D237   | D297  |
| KEKE_CARGO | D267  | D307   | D383  |
| CAR        | D299  | D347   | D431  |
| VAN        | D421  | D477   | D565  |
| LORRY      | D622  | D690   | D790  |

---

## Testing Steps

1. **Open app** → Navigate to Express Delivery
2. **Select pickup** (e.g., Serekunda) → Select dropoff (e.g., Banjul)
3. **Select weight** (LIGHT/MEDIUM/HEAVY) → Vehicle cards appear
4. **Verify prices differ** → BIKE should be cheapest, LORRY most expensive
5. **Change weight** → All prices should update
6. **Select vehicle** → Enter receiver details → Book
7. **Check admin panel** → Delivery appears with `TGEXXX` ID
8. **Approve delivery** → User can proceed to payment

---

## Files Changed

| File                               | Change                        | Lines    |
| ---------------------------------- | ----------------------------- | -------- |
| `app/custom-delivery/index.tsx`    | Vehicle pricing fix           | 392-426  |
| `app/custom-delivery/index.tsx`    | Reordered weight/vehicle flow | 999-1050 |
| `utils/formatExpressDeliveryId.ts` | ID format fix                 | 4        |

---

## No Breaking Changes

✅ Existing deliveries still work
✅ API endpoints unchanged  
✅ Database schema unchanged
✅ Styling unchanged (as requested)
✅ Logic improvements only

---

## Expected Behavior

**Before selecting weight**:

- Vehicle cards show NO prices

**After selecting LIGHT weight**:

- BIKE: ~D197
- VAN: ~D421
- LORRY: ~D622

**After changing to HEAVY weight**:

- BIKE: ~D297 (+D100)
- VAN: ~D565 (+D144)
- LORRY: ~D790 (+D168)

**After selecting longer distance**:

- All prices increase proportionally
- LORRY increases the most (highest per-km rate)

---

## Admin Panel Checklist

1. Navigate to `/express` in admin panel
2. Filter: Show "ALL" status
3. Should see new deliveries with:
   - ID: TGEX#### format
   - Status: PENDING (awaiting approval)
   - Fee: Calculated based on vehicle/weight/distance
   - Route: Pickup → Dropoff
4. Click "Approve" → User can pay
5. Delivery progresses through statuses

---

## Support

If issues persist:

1. Check console for errors
2. Verify coordinates are valid (not null)
3. Ensure weight is selected before viewing vehicles
4. Check admin panel uses `/api/express-delivery?isExpress=true` endpoint
5. Verify server has latest `formatExpressDeliveryId` returning `TGEXXX`

---

**Status**: ✅ COMPLETE
**Date**: 2026-04-08
**Impact**: Critical bug fixes + UX improvements
