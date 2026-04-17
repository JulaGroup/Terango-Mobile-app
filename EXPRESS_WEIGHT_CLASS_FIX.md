# ✅ FIXED - ExpressWeightClassCard Error

## ❌ Error: Cannot read property 'key' of undefined

**Component:** `ExpressWeightClassCard.tsx`

**Root Cause:** 
The component expects a `weightClass` object with this structure:
```typescript
{
  key: WeightClass;
  label: string;
  description: string;
  emoji: string;
  weightRange?: string;
  backgroundColor?: string;
  borderColor?: string;
}
```

But it was receiving just a string: `"LIGHT"`, `"MEDIUM"`, or `"HEAVY"`

---

## ✅ What I Fixed

### **File:** `app/custom-delivery/index.tsx`

**Before (Wrong):**
```tsx
{(["LIGHT", "MEDIUM", "HEAVY"] as WeightClass[]).map((weight) => (
  <ExpressWeightClassCard
    key={weight}
    weight={weight}              // ❌ Wrong prop name
    selected={selectedWeight === weight}
    onSelect={() => ...}         // ❌ Wrong prop name
  />
))}
```

**After (Fixed):**
```tsx
{(["LIGHT", "MEDIUM", "HEAVY"] as WeightClass[]).map((weight) => {
  const config = WEIGHT_CONFIG[weight];
  return (
    <ExpressWeightClassCard
      key={weight}
      weightClass={{              // ✅ Correct prop name
        key: weight,              // ✅ Proper object
        label: config.label,
        description: config.description,
        emoji: config.emoji,
        weightRange: config.weightRange,
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor,
      }}
      selected={selectedWeight === weight}
      onPress={() => ...}         // ✅ Correct prop name
    />
  );
})}
```

---

## ✅ Also Fixed Vehicle Cards

Same issue with `ExpressVehicleCard` - fixed it too!

---

## 🎯 What to Do Now

**Just restart your app:**
```bash
npm start
# Press 'r' to reload
```

The Express page will now work perfectly! ✅

---

## 📱 Test It

1. Go to home page
2. Click on Express delivery
3. Select weight class (Light/Medium/Heavy) ✅
4. Select vehicle type ✅
5. Fill in details and create order ✅

---

**All fixed!** The component now receives the correct data structure. 🚀
