import { PixelRatio } from "react-native";

/**
 * Right-sizes Cloudinary images at the point of render.
 *
 * Every image is stored as a 1000px master and, until this existed, was served
 * at that size into slots as small as 84px — which is where ~96% of the
 * Cloudinary bill came from. Cloudinary resizes at its CDN edge, so this is a
 * pure string operation: no extra round trip, no runtime cost.
 *
 * ─── Read this before changing anything below ───────────────────────────────
 * Cloudinary bills transformations PER DERIVED ASSET CREATED, not per delivery.
 * Every distinct transformation string you emit for an image is a new asset you
 * pay for, permanently. Two consequences:
 *
 *   1. CLD_WIDTHS IS FROZEN. Changing a rung re-bills the entire catalogue
 *      (~4,900 assets) as fresh derived assets.
 *   2. Never enable Cloudinary's derived-asset cleanup or "invalidate derived
 *      on update". Deleting a derived asset and regenerating it bills the
 *      transformation a second time. It is presented as a storage saving; under
 *      this billing model it is actively harmful.
 *
 * Everything here exists to keep the number of variants per image small.
 */

/** FROZEN — see the note above. Do not add, remove, or edit a rung. */
export const CLD_WIDTHS = [64, 128, 192, 256, 384, 512, 768, 1000] as const;
export type CldWidth = (typeof CLD_WIDTHS)[number];

const CLD_URL_RE =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/;
/** A transformation segment, e.g. `f_auto,q_auto` or `c_limit,w_768`. */
const CLD_XFORM_SEG = /^[a-z]{1,3}_[^,/]+(?:,[a-z]{1,3}_[^,/]+)*$/;

/**
 * Snap a pixel requirement up to the nearest rung.
 *
 * Up, never down: rounding down would serve fewer pixels than the screen shows
 * and the image would visibly soften.
 */
const snap = (px: number): CldWidth => {
  for (const w of CLD_WIDTHS) {
    if (px <= w) return w;
  }
  return CLD_WIDTHS[CLD_WIDTHS.length - 1];
};

/**
 * How many device pixels a slot of `dp` logical points actually needs.
 *
 * `dpr_auto` is not an option here: it depends on Client Hints, which React
 * Native does not send, so it silently resolves to 1.0 and ships blurry images.
 *
 * The cap matters. Android devices in The Gambia commonly report a pixel ratio
 * of 3, and 3× a 390dp hero is 1170px — the whole master, i.e. no saving at
 * all. Small elements keep 2× (density is most visible there and the bytes are
 * cheap); large elements take 1.5×, because that is where the bytes actually
 * are and the difference is invisible at arm's length.
 */
const effectivePx = (dp: number): number =>
  dp * Math.min(PixelRatio.get(), dp >= 200 ? 1.5 : 2);

/**
 * Pick the rung for a slot of `wDp` × `hDp`.
 *
 * `contain` sizes on width: the image is letterboxed and never exceeds the slot
 * width. `cover` sizes on the larger edge, because a covering image scales up
 * until it fills BOTH axes — so for a tall slot the height is what binds.
 */
export function cldWidthForBox(
  wDp: number,
  hDp: number,
  fit: "cover" | "contain",
): CldWidth {
  const basis = fit === "cover" ? Math.max(wDp, hDp) : wDp;
  return snap(effectivePx(basis));
}

/** Convenience for slots where only the width constrains the image. */
export function cldWidthForDp(wDp: number): CldWidth {
  return snap(effectivePx(wDp));
}

/**
 * Rewrite a Cloudinary URL to be delivered at `width`.
 *
 * Generic in its argument because call sites hold `string | number` — a number
 * being a bundled `require()` asset. Returning those untouched is what keeps
 * every call site from needing its own type guard.
 *
 * Idempotent BY REPLACEMENT: existing transformation segments are stripped, not
 * appended to. That is what lets this override the server's own 768 backstop
 * rather than chaining a second transformation onto it.
 *
 * On the transformation string itself:
 *  - `c_limit` never a bare `w_` — a bare width defaults to `c_scale`, which
 *    UPSCALES a small master into a bigger file that also looks worse.
 *  - `f_webp` not `f_auto` — f_auto bills a separate derived asset per format
 *    served, and keys off Accept headers that RN's image loaders don't reliably
 *    send, so it can quietly ship JPEG to everyone.
 *  - quality is a pure function of the rung, so it never adds a second variant.
 */
export function cldUrl<T>(source: T, width: CldWidth): T {
  if (typeof source !== "string") return source;
  const url: string = source;
  // Covers data: URIs (QR codes) and file:// picker results.
  if (!url.startsWith("http")) return source;

  const match = CLD_URL_RE.exec(url);
  // Covers non-Cloudinary hosts, and Cloudinary video/ and raw/ delivery.
  if (!match) return source;

  const [, base, rest] = match;
  const parts = rest.split("/");
  // Guard on length so a public_id that merely looks like a transformation
  // (`ab_cd.jpg` sitting at the root) is never eaten.
  while (
    parts.length > 1 &&
    CLD_XFORM_SEG.test(parts[0]) &&
    !/^v\d+$/.test(parts[0])
  ) {
    parts.shift();
  }

  const quality = width <= 384 ? "q_auto:eco" : "q_auto:good";
  return `${base}c_limit,f_webp,${quality},w_${width}/${parts.join(
    "/",
  )}` as unknown as T;
}
