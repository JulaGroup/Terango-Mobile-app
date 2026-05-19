# TeranGO Vendor Mobile App — User Manual

---

## Getting Started

### Logging In

- Open the TeranGO app on your phone.
- On the main screen, tap **Profile** (bottom right icon).
- If not logged in, log in with your phone number and password.
- Once logged in as a vendor, tap **Vendor Dashboard** from the profile menu.

### Becoming a Vendor

If you are not yet a vendor:

1. Go to **Profile** → **Become a Vendor**
2. Fill in the application form with your business details
3. Submit and wait for admin approval
4. Once approved, you will get a notification and can access the Vendor Dashboard

---

## Pages Overview

### 1. Vendor Dashboard (Home)

Your main control center showing business performance at a glance.

**What you see:**

- **Today's Revenue** — earnings from orders today
- **Today's Orders** — number of orders received today
- **Total Revenue** — all-time earnings
- **Total Orders** — lifetime order count
- **Pending Orders** — orders waiting for your action
- **Completed Orders** — successfully delivered orders
- **Active Businesses** — how many of your locations are active
- **Total Menu Items** (for restaurants) or **Total Products** (for shops)
- **Average Order Value** — average customer spend per order

**Quick action cards:**

- **Orders** — tap to view and manage orders
- **Menu** (restaurants) or **Products** (shops) — tap to manage your items
- **Earnings** — tap to see detailed earnings breakdown

**Subscription Status:**
If your account requires a subscription, you will see a banner showing:

- Days remaining
- Active/Expired status
- Option to extend subscription (contact admin)

**Refresh:** Pull down on the screen to refresh the dashboard and load latest data.

---

### 2. Orders

Manage incoming orders from customers.

**Tabs:**

- **Active** — orders in progress (Pending, Accepted, Preparing, Ready)
- **Completed** — orders already delivered or cancelled

**Each order card shows:**

- Order ID and time
- Customer name
- Order type: **Pickup** or **Delivery**
- Payment status (Paid/Unpaid)
- Total amount
- Current status badge

**Tap any order** to open the full order detail modal.

**Order Detail Modal shows:**

- Customer name, phone, and address
- All items ordered with quantities and prices
- Subtotal, delivery fee, discount (if any)
- Payment method and status
- Special instructions from customer
- Driver name (for delivery orders)
- Status timeline

**How to update order status:**

Orders move sequentially through these stages:

1. **PENDING** → Tap:
   - **Accept** → confirms you received the order
   - **Cancel** → rejects the order

2. **ACCEPTED** → Tap:
   - **Mark Preparing** → you started preparing the items

3. **PREPARING** → Tap:
   - **Mark Ready** → order is packed and ready

4. **READY** →
   - **For PICKUP**: Tap **Scan QR Code** when customer arrives to verify and complete
   - **For DELIVERY**: The driver will handle delivery — your job is done

**QR Code Scanning for Pickup:**

1. When customer arrives, tap **Scan QR Code** button
2. Camera opens — point at the customer's order QR code on their phone
3. If the code is valid for this order, delivery is confirmed and marked **Delivered**
4. If the code is invalid or doesn't match, scanning fails — contact admin

**Real-time updates:** The orders list refreshes automatically when new orders arrive or statuses change.

**Pull to refresh:** Drag the screen down to manually refresh the order list.

**Search orders:** Use the search bar at the top to find orders by customer name or order ID.

---

### 3. Menu (For Restaurants)

Manage your restaurant menu items (dishes).

**What you see:**

- All menu items with name, price, availability status, and image
- Filter by meal time (Breakfast, Lunch, Dinner, All Day)
- Search by item name

**How to add a new menu item:**

1. Tap the **+ Add Menu Item** button (floating button at bottom right)
2. Fill in the form:
   - **Name** — dish name
   - **Description** — optional details
   - **Price** — in Dalasi (D)
   - **Discounted Price** — optional sale price
   - **Meal Time** — select Breakfast, Lunch, Dinner, etc.
   - **Subcategory** — select from the list (e.g., Rice Dishes, Grills, Soups)
   - **Preparation Time** — estimated minutes
   - **Available** — toggle ON to show to customers, OFF to hide
   - **Image** — tap to upload a photo from your gallery or camera
3. Tap **Add Item**

**How to edit a menu item:**

1. Tap the item card
2. Tap the **Edit** (pencil) icon
3. Update any fields
4. Tap **Save Changes**

**How to delete a menu item:**

1. Tap the item card
2. Tap the **Delete** (trash) icon
3. Confirm deletion

**Availability Toggle:**

- Quickly turn items ON/OFF by tapping the toggle switch on each card
- When OFF, customers cannot see or order that item

**Image Upload:**

- Tap the image placeholder or existing image
- Choose from **Camera** or **Gallery**
- Image is compressed and uploaded automatically to Cloudinary

**Pull to refresh:** Drag down to reload the menu list.

---

### 4. Products (For Shops & Pharmacies)

Manage your shop products (same as Menu, but for physical items).

**What you see:**

- All products with name, price, stock level, availability status, and image
- Filter by subcategory
- Search by product name
- Filter to show only products without images

**How to add a new product:**

1. Tap the **+** button at the bottom right
2. Fill in the form:
   - **Name** — product name
   - **Description** — optional details
   - **Price** — in Dalasi (D)
   - **Discounted Price** — optional sale price
   - **Stock** — quantity available
   - **Subcategory** — select from the list
   - **Active** — toggle ON to make visible to customers
   - **Image** — tap to upload photo
3. Tap **Add Product**

**How to edit or delete:**
Same as Menu — tap the product card, then tap Edit or Delete.

**Stock Management:**

- Update stock quantity when you restock items
- When stock reaches 0, consider marking the product as inactive until you restock

**Pull to refresh:** Drag down to reload the product list.

---

### 5. Earnings

View detailed earnings breakdown and statistics.

**What you see:**

- **Today's Earnings** — revenue from orders delivered today
- **This Week's Earnings** — revenue for the current week
- **This Month's Earnings** — revenue for the current month
- **Total Lifetime Earnings** — all-time revenue
- **Pending (Unsettled)** — money earned but not yet paid out to you
- **Settled** — total amount already paid to you
- **Total Deliveries Completed** — count of successful orders

**Daily Stats Chart:**

- Visual bar chart showing your revenue trends day-by-day for the past week
- Helps you identify your best performing days

**Order Stats:**

- Total orders
- Delivered orders
- Pending orders
- Total revenue from all orders

**Pull to refresh:** Drag down to load the latest earnings data.

**Note:** To request a payout, use the **Vendor Web Dashboard** (https://teran-go-admin.vercel.app/) on a computer or tablet. The mobile app currently shows earnings for viewing only.

---

### 6. Profile

Manage your business profile and details.

**What you can view/edit:**

- **Business Name** — your restaurant/shop/pharmacy name
- **Description** — brief info about your business
- **Address** — physical location (tap to use current GPS location)
- **Phone** — business contact number
- **Email** — business email
- **Logo/Image** — tap to upload or change business photo

**Business Hours:**
Set your open/close times for each day of the week:

- Toggle each day ON (open) or OFF (closed)
- Set opening and closing times for each day
- Tap **Save Profile** to apply changes

**How to update:**

1. Tap the **Edit** button (pencil icon) at the top right
2. Make your changes
3. Tap **Save Profile** at the bottom

**Upload Business Logo:**

1. Tap the business image placeholder
2. Choose **Take Photo** or **Choose from Gallery**
3. Image is uploaded and saved automatically

**Get Current Location:**

- Tap the **location icon** next to the address field
- Grant location permission if prompted
- Your current GPS coordinates and address are filled in automatically

**Pull to refresh:** Drag down to reload your profile data.

---

### 7. Settings

Configure business operations and preferences.

**Business Settings:**

- **Open for Business** — master ON/OFF switch. When OFF, customers cannot place orders
- **Auto-Accept Orders** — automatically accept all orders (use with caution)
- **Allow Cash Payment** — accept cash on delivery
- **Allow Online Payment** — accept Wave and other digital payments
- **Minimum Order Amount** — set a minimum order value
- **Estimated Prep Time** — default minutes you need to prepare orders

**Notification Settings:**

- **New Orders** — get push notifications for new orders
- **Order Updates** — notifications when statuses change
- **Payment Alerts** — alerts for payments received
- **Daily Reports** — daily summary of orders and revenue
- **Promotional Emails** — marketing and promo updates from TeranGO

**How to save settings:**

1. Toggle the switches or edit the text fields
2. Tap **Save Settings** at the bottom
3. Settings are applied immediately

**Logout:** Tap **Logout** at the bottom of settings to sign out of the vendor dashboard.

---

## Summary: Order Management Flow

```
1. New order notification arrives
         ↓
2. Open Orders tab → see order in Active section
         ↓
3. Tap order card → view details → tap ACCEPT
         ↓
4. Start preparing the items
         ↓
5. Tap MARK PREPARING
         ↓
6. Finish preparing and packing
         ↓
7. Tap MARK READY
         ↓
8a. PICKUP: Customer arrives → Tap SCAN QR CODE → point at customer's QR → delivery confirmed
OR
8b. DELIVERY: Wait for driver to collect → driver handles delivery
```

---

## Tips & Best Practices

- **Keep the app open or enable notifications** so you don't miss new orders
- **Pull to refresh frequently** on the Orders screen to see new orders in real time
- **Update menu/product availability daily** — hide items you run out of
- **Upload clear photos** for all items — photos increase sales significantly
- **Accept orders within 5 minutes** to keep customers happy
- **Use the QR scanner** for pickup orders to prevent fraud and confirm the right customer gets the order
- **Check Earnings regularly** to track your business performance
- **Keep business hours updated** in Profile so customers know when you are open
- **Set accurate prep times** so customers have realistic expectations

---

## Troubleshooting

| Problem                       | Solution                                                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Can't access Vendor Dashboard | Make sure you are logged in and your vendor application is approved. Check Profile for Vendor Dashboard option.                   |
| Orders not showing            | Pull down to refresh. Check that "Open for Business" is ON in Settings.                                                           |
| Image upload fails            | Check your internet connection. Try a smaller image size (under 5 MB).                                                            |
| QR scan doesn't work          | Grant camera permission in your phone settings. Ensure good lighting. Ask customer to show QR code clearly.                       |
| Can't mark order as Delivered | Delivery orders stop at READY — the driver marks them delivered. Only PICKUP orders use QR scanning for vendor to mark delivered. |
| Notification not coming       | Go to phone Settings → Apps → TeranGO → Notifications → ensure all are enabled. Also check Settings inside the app.               |

---

## Contact Support

If you encounter issues or need help:

- **WhatsApp/Call**: +220 7595999/ +220 3902798
- **Email**: info@terango.gm / mdarboe@terango.com / bmanneh@terango.com

---

**Pro Tip:** For easier order management, product uploads, and payout requests, use the **Vendor Web Dashboard** on a computer or tablet: **https://teran-go-admin.vercel.app/**

Both the mobile app and web dashboard are synced in real-time, so you can use whichever is most convenient!
