# TeranGo Order Flow Documentation

This document outlines the order flow implementation for the TeranGo MVP app.

## MVP Approach

For the MVP version of TeranGo:

1. **Admin-Only Content Management**:

   - Only admins can add, edit, and manage products, menu items, and store listings
   - Vendors can only view their assigned items and stores

2. **Order Process for Vendors**:
   - Vendors receive and manage incoming orders
   - Vendors can accept, reject, and mark orders as in progress or completed

## Order Lifecycle

### Customer Flow

1. **Browse and Select**:

   - Customer browses restaurants, stores, or pharmacies
   - Customer selects items and adds them to cart
   - Customer proceeds to checkout

2. **Checkout Process**:

   - Customer provides delivery information
   - Customer selects payment method
   - Customer confirms order

3. **Order Tracking**:
   - Customer can view order status (Pending, Accepted, In Progress, Completed, Rejected)
   - Customer receives notifications on order updates

### Vendor Flow

1. **Order Reception**:

   - Vendor receives notification for new order
   - Order details are displayed in the vendor dashboard
   - Order appears in "Pending" section

2. **Order Management**:
   - Vendor can view order details
   - Vendor can accept or reject the order
   - Vendor can update order status to "In Progress" and later "Completed"
   - Vendor can add notes to the order

### Admin Flow

1. **Order Oversight**:

   - Admin can view all orders across all vendors
   - Admin can intervene in case of issues
   - Admin can generate reports on orders

2. **Content Management**:
   - Admin adds and maintains all products, menu items, and store listings
   - Admin assigns items to specific vendors

## API Endpoints

### Order Management

```javascript
// Get orders for a vendor
GET /api/vendors/:vendorId/orders

// Get specific order
GET /api/orders/:orderId

// Update order status
PUT /api/orders/:orderId/status
Body: { status: "ACCEPTED" | "REJECTED" | "IN_PROGRESS" | "COMPLETED" }

// Add note to order
POST /api/orders/:orderId/notes
Body: { note: "Customer requested extra napkins" }
```

## Database Structure

```
Order {
  id: string
  customerId: string
  vendorId: string
  items: [
    {
      id: string
      name: string
      quantity: number
      price: number
      notes: string
    }
  ]
  totalAmount: number
  deliveryFee: number
  status: enum("PENDING", "ACCEPTED", "REJECTED", "IN_PROGRESS", "COMPLETED")
  paymentStatus: enum("PENDING", "PAID", "FAILED")
  paymentMethod: enum("CASH", "CARD", "MOBILE_MONEY")
  deliveryAddress: {
    address: string
    latitude: number
    longitude: number
    notes: string
  }
  notes: string
  createdAt: datetime
  updatedAt: datetime
}
```

## Order States and Transitions

1. **PENDING**: Initial state when order is placed

   - Can transition to: ACCEPTED or REJECTED

2. **ACCEPTED**: Vendor has accepted the order

   - Can transition to: IN_PROGRESS

3. **IN_PROGRESS**: Vendor is preparing the order

   - Can transition to: COMPLETED

4. **COMPLETED**: Order has been delivered or picked up

   - Final state

5. **REJECTED**: Vendor has declined the order
   - Final state

## Future Enhancements (Post-MVP)

1. **Vendor Content Management**:

   - Allow vendors to add and manage their own products and menu items
   - Implement approval workflow for admin oversight

2. **Advanced Order Filtering**:

   - Filter orders by date range, status, and payment method
   - Search functionality for order IDs and customer names

3. **Order Analytics**:

   - Sales reports and trends
   - Popular items and peak order times

4. **Customer Feedback**:
   - Rating system for orders
   - Review submission post-delivery
