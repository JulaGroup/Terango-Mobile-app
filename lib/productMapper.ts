export interface Product {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  // Optional: cards render their own Ionicons placeholder when this is absent,
  // which is better than a remote placeholder that has to be fetched.
  imageUrl?: string;
  shopName?: string;
  shop?: { name: string; id: string };
  _count?: { orderItems: number };
  createdAt?: string;
  isAvailable?: boolean;
  inStock?: boolean;
}

export const mapProductResponse = (raw: any): Product => ({
  id: raw.id,
  name: raw.name,
  price: Number(raw.price) || 0,
  discountedPrice:
    raw.discountedPrice !== null && raw.discountedPrice !== undefined
      ? Number(raw.discountedPrice)
      : undefined,
  imageUrl: raw.imageUrl || undefined,
  shopName: raw.shop?.name || raw.shopName,
  shop: raw.shop
    ? {
        name: raw.shop.name,
        id: raw.shop.id,
      }
    : raw.shopId
    ? {
        name: raw.shopName || "",
        id: raw.shopId,
      }
    : undefined,
  _count: raw._count,
  createdAt: raw.createdAt,
  isAvailable: raw.isAvailable !== false,
  inStock: raw.inStock !== false,
});

export const uniqueProducts = (products: Product[]): Product[] => {
  const map = new Map<string, Product>();
  products.forEach((product) => {
    if (!product?.id) return;
    if (!map.has(product.id)) {
      map.set(product.id, product);
    }
  });
  return Array.from(map.values());
};
