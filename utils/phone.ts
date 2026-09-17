/**
 * Gambian phone numbers across PURA's 7 → 9 digit migration.
 *
 * The rules live in ./gambiaPhone.ts (byte-identical with the server and
 * driver app). This file is the app-facing layer the inputs use.
 *
 * Two deliberately different treatments:
 *
 * - Contact and login numbers are kept EXACTLY AS TYPED. People's WhatsApp is
 *   still on whichever number they actually use, so an old 7-digit number must
 *   never be swapped for its 9-digit form (or the other way round). Inputs just
 *   accept either length — see isAcceptedGambiaInput / stripGambiaCountryCode.
 * - Wave numbers ARE converted to 9 digits (old numbers stop working
 *   1 Dec 2026) — see toLocalDigits, used by the Payment Methods screen.
 *
 * The same CustomDelivery row once held `senderPhone: "+2203046265"` and
 * `receiverPhone: "7728771"` — a +220 number dropped into a field already
 * labelled "+220" renders as +220 +2203046265, so the country code comes off.
 */
import { formatGambian, isLegacySeven, isValidGambian, toGambianNational } from "./gambiaPhone";

/** Longest national number a Gambia input should accept. */
export const GAMBIA_PHONE_MAX_LENGTH = 9;

/**
 * The number without +220, exactly as saved — no 7 ↔ 9 digit conversion.
 * 220 is only stripped when a full national number follows it: a local number
 * may legitimately start with those digits (2203173 is valid).
 */
export function stripGambiaCountryCode(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/[^0-9]/g, "");
  return digits.startsWith("220") && (digits.length === 10 || digits.length === 12) ? digits.slice(3) : digits;
}

/**
 * A Gambia number box is complete at 7 digits (an old number, or Gamcel) or a
 * valid new 9-digit number (87…, 83…, 86…). Minimum 7, maximum 9.
 */
export function isAcceptedGambiaInput(raw: string | null | undefined): boolean {
  const digits = stripGambiaCountryCode(raw);
  return digits.length === 7 || (digits.length === 9 && isValidGambian(digits));
}

/** Keeps only digits, capped at the 9-digit national length — for onChangeText. */
export function sanitizeGambiaInput(text: string): string {
  return text.replace(/[^0-9]/g, "").slice(0, GAMBIA_PHONE_MAX_LENGTH);
}

/**
 * WAVE ONLY — the number in PURA's 9-digit form (or 7 for Gamcel/fixed line),
 * without a country code. Incomplete input is returned as its digits so a
 * half-typed value survives.
 */
export function toLocalDigits(raw: string | null | undefined): string {
  return toGambianNational(raw) ?? stripGambiaCountryCode(raw);
}

/** True when the value is a complete Gambian number, old or new format. */
export function isCompleteLocal(raw: string | null | undefined): boolean {
  return isValidGambian(raw);
}

/**
 * WAVE ONLY — "Your new number is +220 87 712 3456" when an old 7-digit number
 * was typed, otherwise null. Not shown on login or contact fields.
 */
export function newNumberHint(raw: string | null | undefined): string | null {
  return isLegacySeven(raw) ? `Your new number is ${formatGambian(raw)}` : null;
}
