/**
 * Minimal dependency-free UUID v4.
 *
 * Used for values that only need to be unique and opaque — Wave idempotency
 * keys and Google Places session tokens — not for anything security-sensitive,
 * since Math.random is not a CSPRNG.
 */
export const uuidv4 = (): string =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
