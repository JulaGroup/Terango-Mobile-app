/**
 * Gambian phone numbers, in one format — now PURA's 9-digit plan.
 *
 * The rules themselves live in ./gambiaPhone.ts (shared, byte-identical, with
 * the server and driver app). This file is the app-facing layer the inputs use.
 *
 * The same CustomDelivery row could hold `senderPhone: "+2203046265"` and
 * `receiverPhone: "7728771"` — the sender came from the account profile, the
 * receiver from an input. Anything that compares, de-duplicates or matches the
 * two fails, and a +220 number dropped into a field already labelled "+220"
 * renders as +220 +2203046265.
 *
 * The canonical form is the national number without +220: 9 digits for
 * migrated mobiles (87…, 83…, 86…), 7 for Gamcel and fixed lines. Old 7-digit
 * input is still accepted until the 1 Dec 2026 cutoff and converted here.
 */
import { formatGambian, isLegacySeven, isValidGambian, toGambianE164, toGambianNational } from "./gambiaPhone";

/** Longest national number a Gambia input should accept. */
export const GAMBIA_PHONE_MAX_LENGTH = 9;

/**
 * The national number: 9 digits (or 7 for Gamcel/fixed line), no country code.
 * Incomplete input is returned as its digits so a half-typed value survives.
 */
export function toLocalDigits(raw: string | null | undefined): string {
  const national = toGambianNational(raw);
  if (national) return national;
  const digits = String(raw ?? "").replace(/[^0-9]/g, "");
  // Only strip 220 when something follows a full national number — a local
  // number may legitimately start with those digits (2203173 is valid).
  return digits.startsWith("220") && digits.length > GAMBIA_PHONE_MAX_LENGTH ? digits.slice(3) : digits;
}

/** Dialable form, for tel: links and anything leaving the country. */
export function toE164(raw: string | null | undefined): string {
  const e164 = toGambianE164(raw);
  if (e164) return e164;
  const local = toLocalDigits(raw);
  return local ? `+220${local}` : "";
}

/** True when the value is a complete Gambian number, old or new format. */
export function isCompleteLocal(raw: string | null | undefined): boolean {
  return isValidGambian(raw);
}

/** Keeps only digits, capped at the 9-digit national length — for onChangeText. */
export function sanitizeGambiaInput(text: string): string {
  return text.replace(/[^0-9]/g, "").slice(0, GAMBIA_PHONE_MAX_LENGTH);
}

/**
 * "Your new number is +220 87 712 3456" when an old 7-digit number was typed,
 * otherwise null — shown under inputs during the transition.
 */
export function newNumberHint(raw: string | null | undefined): string | null {
  return isLegacySeven(raw) ? `Your new number is ${formatGambian(raw)}` : null;
}

/**
 * For free-text contact fields that may hold a foreign number: a recognisable
 * Gambian number (old or new) is saved as +220 + 9 digits; anything else is
 * kept exactly as typed.
 */
export function normalizeContactPhone(raw: string): string {
  return toGambianE164(raw) ?? raw.trim();
}

export { formatGambian };
