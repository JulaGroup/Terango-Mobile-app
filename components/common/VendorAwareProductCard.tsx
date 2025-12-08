import React, { useCallback } from "react";
import { Alert } from "react-native";
import ProductCard, { UniversalProduct } from "@/components/common/ProductCard";
import { VendorOrderingMeta } from "@/utils/vendorOrdering";
import { useVendorOrderingStatus } from "@/hooks/useVendorOrderingStatus";

interface VendorAwareProductCardProps {
  product: UniversalProduct;
  cartQuantity: number;
  onAddToCart: (product: UniversalProduct) => void;
  onRemoveFromCart: () => void;
  onPress?: () => void;
  cardWidth?: number;
  vendor: VendorOrderingMeta;
}

const VendorAwareProductCard: React.FC<VendorAwareProductCardProps> = ({
  product,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onPress,
  cardWidth,
  vendor,
}) => {
  const { orderingDisabled, disabledReason } = useVendorOrderingStatus({
    vendorId: vendor.vendorId,
    vendorType: vendor.vendorType,
    meta: vendor,
  });

  const handleDisabledPress = useCallback(() => {
    if (!orderingDisabled) {
      return;
    }

    const vendorLabel =
      vendor.vendorType === "restaurant" ? "restaurant" : "shop";
    Alert.alert(
      "Ordering unavailable",
      disabledReason || `This ${vendorLabel} is not accepting orders right now.`
    );
  }, [orderingDisabled, disabledReason, vendor.vendorType]);

  return (
    <ProductCard
      product={product}
      cartQuantity={cartQuantity}
      onAddToCart={onAddToCart}
      onRemoveFromCart={onRemoveFromCart}
      onPress={onPress}
      cardWidth={cardWidth}
      orderingDisabled={orderingDisabled}
      disabledReason={disabledReason}
      onAddDisabledPress={handleDisabledPress}
    />
  );
};

export default VendorAwareProductCard;
