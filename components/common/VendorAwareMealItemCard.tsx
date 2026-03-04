import React, { useCallback } from "react";
import { Alert } from "react-native";
import MealItemCard, {
  UniversalProduct as ProductUniversal,
} from "@/components/common/MealItemCard";
import { VendorOrderingMeta } from "@/utils/vendorOrdering";
import { useVendorOrderingStatus } from "@/hooks/useVendorOrderingStatus";

interface VendorAwareMealItemCardProps {
  product: ProductUniversal;
  cartQuantity: number;
  onAddToCart: (product: ProductUniversal) => void;
  onRemoveFromCart: () => void;
  onPress?: () => void;
  vendor: VendorOrderingMeta;
}

const VendorAwareMealItemCard: React.FC<VendorAwareMealItemCardProps> = ({
  product,
  cartQuantity,
  onAddToCart,
  onRemoveFromCart,
  onPress,
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
      disabledReason ||
        `This ${vendorLabel} is not accepting orders right now.`,
    );
  }, [orderingDisabled, disabledReason, vendor.vendorType]);

  return (
    <MealItemCard
      product={product}
      cartQuantity={cartQuantity}
      onAddToCart={onAddToCart}
      onRemoveFromCart={onRemoveFromCart}
      onPress={onPress}
      orderingDisabled={orderingDisabled}
      disabledReason={disabledReason}
      onAddDisabledPress={handleDisabledPress}
    />
  );
};

export default VendorAwareMealItemCard;
