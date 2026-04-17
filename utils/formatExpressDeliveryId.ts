export const formatExpressDeliveryId = (deliveryId?: string | null): string => {
  const compactId = String(deliveryId ?? "").replace(/[^a-zA-Z0-9]/g, "");
  const suffix = compactId.slice(-4).toUpperCase().padStart(4, "0");
  return `TGEX${suffix}`;
};
