/**
 * Gambian phone numbers, in one format.
 *
 * The same CustomDelivery row could hold `senderPhone: "+2203046265"` and
 * `receiverPhone: "7728771"` — the sender came from the account profile, where
 * 673 of 718 users are stored as +220XXXXXXX, and the receiver came from a
 * 7-digit input. Anything that compares, de-duplicates or matches the two
 * fails, and a +220 number dropped into a field already labelled "+220"
 * renders as +220 +2203046265 and fails a 7-digit length check.
 *
 * Local 7-digit is the canonical form: it is what the inputs collect, what
 * most rows already hold, and what dials correctly in-country.
 */

/** The national significant number: 7 digits, no country code, no spaces. */
export function toLocalDigits(raw: string | null | undefined): string {
  const digits = String(raw ?? "").replace(/[^0-9]/g, "");
  // 220 is only a country code here if something precedes it — a local number
  // may legitimately start with those digits (2203173 is a valid subscriber).
  if (digits.length > 7) return digits.slice(-7);
  return digits;
}

/** Dialable form, for tel: links and anything leaving the country. */
export function toE164(raw: string | null | undefined): string {
  const local = toLocalDigits(raw);
  return local ? `+220${local}` : "";
}

/** True when the value is a complete local number. */
export function isCompleteLocal(raw: string | null | undefined): boolean {
  return toLocalDigits(raw).length === 7;
}
