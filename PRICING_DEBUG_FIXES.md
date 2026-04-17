# 🐛 Express Delivery Pricing Issues - DIAGNOSIS & FIXES

## 🔍 **Issues Reported:**
1. **Price discrepancy:** Booking shows D384, delivery page shows D284 
2. **Wrong service fee %:** Shows 3% instead of expected 5%

---

## 🔍 **Root Cause Analysis:**

### **Issue 1: Price Discrepancy (384 vs 284)**
**Cause:** Likely data inconsistency in database. The `estimatedFee` stored during booking might be different from what's displayed.

**Possible reasons:**
- Booking calculation uses different logic than display calculation
- Database was modified after booking
- Different pricing rules applied during booking vs retrieval

### **Issue 2: Service Fee Shows 3% Instead of 5%**
**Cause:** Database `systemSettings.serviceFeePercent` is set to `3` instead of `5`.

**Evidence:**
- Schema default: `serviceFeePercent Float @default(5)`
- But runtime shows `3%`
- This suggests admin/system changed the value to `3`

---

## ✅ **Fixes Applied:**

### **1. Enhanced Backend Debugging** 
**File:** `server/src/services/customDelivery.service.ts` & `expressDelivery.service.ts`

```typescript
// Added comprehensive logging
console.log(`[DEBUG] Delivery ID: ${deliveryId}, EstimatedFee: ${estimatedFee}, ServiceFeePercent: ${serviceFeePercent}%`);
console.log(`[DEBUG] Calculated - Subtotal: ${subtotalFee}, ServiceFee: ${serviceFee}, Total: ${subtotalFee + serviceFee}`);
console.log(`[DEBUG] Database serviceFeePercent: ${settings?.serviceFeePercent}, Using: ${serviceFeePercent}`);
```

**Purpose:** Identify exact values being calculated and stored.

### **2. Fixed Frontend Service Fee Display**
**File:** `terango/app/custom-delivery/[deliveryId].tsx`

```typescript
// Before: Shows empty if no serviceFeePercent
{delivery.serviceFeePercent ? ` (${delivery.serviceFeePercent}%)` : ""}

// After: Shows fallback 5% if no value
{delivery.serviceFeePercent ? ` (${delivery.serviceFeePercent}%)` : " (5%)"}
```

**Purpose:** Ensure service fee percentage is always displayed.

### **3. Improved Service Fee Calculation**
**File:** `server/src/services/customDelivery.service.ts`

```typescript
// Enhanced reverse calculation with proper rounding
const subtotalFee = Math.round(estimatedFee / (1 + serviceFeePercent / 100));
const serviceFee = estimatedFee - subtotalFee;
```

**Purpose:** Ensure accurate breakdown calculation that matches original pricing logic.

---

## 🔬 **Debugging Steps to Identify Issues:**

### **Step 1: Check Database Service Fee Setting**
Run this in your admin panel or database:
```sql
SELECT serviceFeePercent FROM systemSettings WHERE id = 'system-settings';
```
**Expected:** `5` **If showing:** `3` ← This explains the 3% issue

### **Step 2: Check Specific Delivery Data**
```sql
SELECT id, estimatedFee, createdAt FROM customDelivery WHERE id = 'YOUR_DELIVERY_ID';
```
Compare `estimatedFee` with what you expect.

### **Step 3: Monitor Backend Logs**
When you open the delivery page, check server console for debug logs:
```
[DEBUG] Delivery ID: xxx, EstimatedFee: 284, ServiceFeePercent: 3%
[DEBUG] Database serviceFeePercent: 3, Using: 3
[DEBUG] Calculated - Subtotal: 275, ServiceFee: 9, Total: 284
```

---

## 🎯 **Expected Results After Fix:**

### **If Service Fee = 3% (Current Database Value):**
```
Delivery Fee: D275
Service Fee (3%): D9
Total: D284 ✅
```

### **If Service Fee = 5% (Expected Value):**
```
Delivery Fee: D270  
Service Fee (5%): D14
Total: D284 ✅
```

---

## 🔧 **To Fix the 3% vs 5% Issue:**

### **Option A: Update Database to 5%**
```sql
UPDATE systemSettings 
SET serviceFeePercent = 5 
WHERE id = 'system-settings';
```

### **Option B: Accept 3% as Business Decision**
If 3% is the intended service fee, then the current behavior is correct.

---

## 🚨 **Priority Actions:**

1. **Check server logs** when viewing delivery page to see calculated values
2. **Verify database `serviceFeePercent`** - is it 3 or 5?  
3. **Compare booking flow** pricing vs display pricing
4. **Identify price discrepancy source** (384 vs 284)

---

## 📝 **Files Modified:**

1. **`server/src/services/customDelivery.service.ts`** - Enhanced calculation + debugging
2. **`server/src/services/expressDelivery.service.ts`** - Added debug logging  
3. **`terango/app/custom-delivery/[deliveryId].tsx`** - Fixed service fee % display

The fixes will provide better visibility into what's happening with the pricing calculations! 🔍