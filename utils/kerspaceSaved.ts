import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Property } from "@/lib/api";

const KEY = "@kerspace_saved";

// A trimmed property we keep locally so the Saved screen renders without
// re-fetching each listing.
export type SavedProperty = Pick<
  Property,
  | "id"
  | "title"
  | "type"
  | "listingType"
  | "price"
  | "currency"
  | "bedrooms"
  | "bathrooms"
  | "area"
  | "city"
  | "region"
  | "images"
>;

export async function getSaved(): Promise<SavedProperty[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedProperty[]) : [];
  } catch {
    return [];
  }
}

export async function getSavedIds(): Promise<string[]> {
  return (await getSaved()).map((p) => p.id);
}

export async function isSaved(id: string): Promise<boolean> {
  return (await getSavedIds()).includes(id);
}

// Returns the new saved state (true = now saved).
export async function toggleSaved(p: SavedProperty): Promise<boolean> {
  try {
    const list = await getSaved();
    const exists = list.some((x) => x.id === p.id);
    const next = exists
      ? list.filter((x) => x.id !== p.id)
      : [
          {
            id: p.id,
            title: p.title,
            type: p.type,
            listingType: p.listingType,
            price: p.price,
            currency: p.currency,
            bedrooms: p.bedrooms ?? null,
            bathrooms: p.bathrooms ?? null,
            area: p.area ?? null,
            city: p.city,
            region: p.region ?? null,
            images: (p.images || []).slice(0, 1),
          },
          ...list,
        ];
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    return !exists;
  } catch {
    return false;
  }
}
