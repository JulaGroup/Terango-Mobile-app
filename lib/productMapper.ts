export const FALLBACK_IMAGE = "https://via.placeholder.com/300";

export interface Product {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  imageUrl: string;
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
  imageUrl: raw.imageUrl || FALLBACK_IMAGE,
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
