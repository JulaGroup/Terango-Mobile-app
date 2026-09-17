/**
 * Gambian phone numbers under PURA's 7 → 9 digit mobile migration.
 *
 * KEEP IN SYNC — identical copies live in:
 *   server/src/utils/gambiaPhone.ts
 *   terango/utils/gambiaPhone.ts
 *   TeranGO-Driver/utils/gambiaPhone.ts
 * Ported from Jokko9 (src/domain/gambiaNumbering.ts), which carries the tests.
 *
 * Rules (PURA public notice, July 2026 — go-live 4 Sep 2026, old numbers stop
 * working 1 Dec 2026). The old number is never altered; a prefix is added:
 *   Africell (first digit 2, 4, 7) → 87 + 7 digits
 *   QCell    (first digit 3, 5)    → 83 + 7 digits
 *   Comium   (first digit 6, 8)    → 86 + 7 digits
 *   Gamcel   (first digit 9)       → stays 7 digits (a mistaken 89 is stripped)
 *   Fixed lines (42x, 43x, 448…)   → unchanged
 *
 * Canonical storage form is +220 followed by the national number — 9 digits for
 * migrated mobiles, 7 for Gamcel and fixed lines.
 *
 * A leading 220 is NOT always the country code: Africell subscriber numbers can
 * start 220 (2201234 is a valid local number). It is only read as the country
 * code after + / 00, or when 220 + a 7- or 9-digit national number fits exactly.
 */

const MIGRATION_PREFIXES: Record<string, string> = {
  africell: "87",
  qcell: "83",
  comium: "86",
};
const NINE_DIGIT_PREFIXES = new Set(["87", "83", "86"]);
const GAMCEL_WRONG_PREFIX = "89";

type Operator = "africell" | "qcell" | "comium" | "gamcel" | "landline" | "unknown";

function operatorOf(seven: string): Operator {
  if (!/^\d{7}$/.test(seven)) return "unknown";
  const first = seven[0];
  const firstTwo = seven.slice(0, 2);
  if (firstTwo === "42" || firstTwo === "43" || seven.startsWith("448")) return "landline";
  if (first === "9") return "gamcel";
  if (first === "2" || first === "4" || first === "7") return "africell";
  if (first === "3" || first === "5") return "qcell";
  if (first === "6" || first === "8") return "comium";
  return "unknown";
}

/**
 * Splits raw input into national digits, or null when it isn't a Gambian number
 * (another country code, or the wrong length).
 */
function nationalDigits(raw: string | null | undefined): string | null {
  const trimmed = String(raw ?? "").trim();
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  let international = trimmed.startsWith("+");
  while (digits.startsWith("00")) {
    digits = digits.slice(2);
    international = true;
  }

  if (international) {
    // Explicitly international: only +220 is ours.
    if (!digits.startsWith("220")) return null;
    return digits.slice(3).replace(/^0/, "");
  }

  // Bare 220 + a 7- or 9-digit national number (10 or 12 digits total).
  if (digits.startsWith("220") && (digits.length === 10 || digits.length === 12)) {
    return digits.slice(3);
  }

  // The Gambia has no trunk 0, so a bare leading zero is left alone.
  return digits;
}

/**
 * Canonical national number: 9 digits for migrated mobiles, 7 for Gamcel and
 * fixed lines. Accepts old 7-digit and new 9-digit input, with or without +220.
 * Returns null when the input isn't a recognisable Gambian number.
 */
export function toGambianNational(raw: string | null | undefined): string | null {
  const national = nationalDigits(raw);
  if (!national) return null;

  if (national.length === 7) {
    const operator = operatorOf(national);
    if (operator === "gamcel" || operator === "landline") return national;
    const prefix = MIGRATION_PREFIXES[operator];
    return prefix ? prefix + national : null;
  }

  if (national.length === 9) {
    const prefix = national.slice(0, 2);
    if (NINE_DIGIT_PREFIXES.has(prefix)) return national;
    // Gamcel does not migrate — undo an 89 added by mistake.
    if (prefix === GAMCEL_WRONG_PREFIX && operatorOf(national.slice(2)) === "gamcel") {
      return national.slice(2);
    }
  }

  return null;
}

/** Canonical dialable form (+220…), or null when not a Gambian number. */
export function toGambianE164(raw: string | null | undefined): string | null {
  const national = toGambianNational(raw);
  return national ? `+220${national}` : null;
}

/** True for any complete Gambian number, old or new format. */
export function isValidGambian(raw: string | null | undefined): boolean {
  return toGambianNational(raw) !== null;
}

/** True when the input was an old 7-digit number that gains a prefix. */
export function isLegacySeven(raw: string | null | undefined): boolean {
  const national = nationalDigits(raw);
  const canonical = toGambianNational(raw);
  return national?.length === 7 && canonical?.length === 9;
}

/**
 * The pre-migration +220 + 7-digit form of a number, for looking up records
 * saved before the migration. Null when the number never had one (Gamcel,
 * fixed lines, or not Gambian) — those didn't change.
 */
export function legacyE164(raw: string | null | undefined): string | null {
  const national = toGambianNational(raw);
  return national && national.length === 9 ? `+220${national.slice(2)}` : null;
}

/** Display form: "+220 87 712 3456" / "+220 912 3456". */
export function formatGambian(raw: string | null | undefined): string {
  const national = toGambianNational(raw);
  if (!national) return String(raw ?? "");
  return national.length === 9
    ? `+220 ${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`
    : `+220 ${national.slice(0, 3)} ${national.slice(3)}`;
}
