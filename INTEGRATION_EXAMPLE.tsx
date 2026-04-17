// Example integration for your existing app
import React from 'react';
import { View } from 'react-native';
import { OrderListWithBadges } from '../components/OrderListWithBadges';
import { UnifiedLocationPicker } from '../components/UnifiedLocationPicker';

// In your existing order screen component:
export default function YourOrderScreen() {
  const [orders, setOrders] = useState([]);
  const [showCreateOrder, setShowCreateOrder] = useState(false);

  return (
    <View style={{ flex: 1 }}>
      {showCreateOrder ? (
        <UnifiedLocationPicker
          onSubmit={(orderData) => {
            // Handle order creation
            console.log('Order created:', orderData);
            setShowCreateOrder(false);
          }}
          onCancel={() => setShowCreateOrder(false)}
        />
      ) : (
        <OrderListWithBadges
          orders={orders}
          showQRCodes={true}
          filterType="all"  // or 'express' to show only Express orders
          onOrderPress={(order) => {
            // Handle order selection
            console.log('Order pressed:', order);
          }}
          onQRPress={(order) => {
            // Show QR modal
            console.log('QR pressed:', order);
          }}
          onRefresh={() => {
            // Reload orders
            loadOrders();
          }}
        />
      )}
    </View>
  );
}