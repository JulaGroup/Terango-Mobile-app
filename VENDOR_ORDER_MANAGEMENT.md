# Vendor Order Management Guide

## Order Flow for Vendors

This document explains how vendors can manage orders in the TeranGo MVP version.

### Order States

Orders go through the following states:

1. **PENDING** - New order received, awaiting vendor acceptance
2. **ACCEPTED** - Vendor has accepted the order
3. **PREPARING** - Order is being prepared
4. **READY** - Order is ready for pickup/delivery
5. **DISPATCHED** - Order has been dispatched for delivery
6. **DELIVERED** - Order has been delivered to customer
7. **CANCELLED** - Order has been cancelled

### Vendor Actions

#### 1. View Orders

- Access orders through the vendor dashboard
- Navigate to "Orders" section
- View all orders with current status
- Filter by status (Pending, In Progress, Completed)

#### 2. Accept/Reject Orders

- New orders appear with "PENDING" status
- Vendors can accept or reject orders
- Rejecting requires a reason for customer notification

#### 3. Update Order Status

- Move orders through preparation stages
- Update estimated delivery times
- Notify customers of status changes

#### 4. Order Details

- View complete order information:
  - Customer name and phone
  - Delivery address
  - Order items and quantities
  - Special notes/instructions
  - Total amount

### MVP Limitations

In this MVP version:

- Only admins can add/edit menu items and products
- Vendors can only view their items and manage orders
- Payment processing is handled separately
- Advanced analytics are coming in future updates

### Order Management Best Practices

1. **Quick Response**: Accept or reject orders within 5 minutes
2. **Accurate Updates**: Keep order status current
3. **Communication**: Use status updates to inform customers
4. **Quality Control**: Double-check orders before marking as ready

### Customer Experience

When customers place orders:

1. They browse restaurants/shops without login
2. Login is required only when adding to cart
3. Checkout requires authentication
4. Order tracking available after login

### Support

For technical issues or questions about order management:

- Contact TeranGo admin support
- Report bugs through the app
- Request feature enhancements for future versions
