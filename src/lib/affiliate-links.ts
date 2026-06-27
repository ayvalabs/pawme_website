/**
 * src/lib/affiliate-links.ts
 *
 * Turns a destination product URL into a monetised outbound link. Used by
 * /api/mobile/shop/redirect for BOTH the website and the mobile app, so
 * there's one place that decides how clicks earn commission.
 *
 * Strategy (in priority order):
 *   1. Skimlinks/Sovrn aggregator — if SKIMLINKS_PUBLISHER_ID is set, wrap
 *      the destination in a Skimlinks deep link. Skimlinks holds the
 *      affiliate relationships with Amazon, Chewy, Walmart, Petco and
 *      thousands of others, so ANY merchant URL becomes monetised with no
 *      per-merchant signup and no sales gate. This is our primary path as
 *      a brand-new affiliate.
 *   2. Amazon Associates tag fallback — if Skimlinks isn't configured yet
 *      but the destination is an amazon.com URL, append our ?tag= so
 *      direct Amazon links still earn from day one.
 *   3. Pass-through — otherwise send the user straight to the merchant.
 *
 * We deliberately do NOT display merchant prices or images anywhere in the
 * Shop (we use our own copy + category illustrations), which keeps us clear
 * of Amazon's Operating Agreement rules about live price/image display.
 */

const SKIMLINKS_ID = process.env.SKIMLINKS_PUBLISHER_ID; // e.g. "123456X1654321"
const SKIMLINKS_BASE = 'https://go.skimresources.com/';
const AMAZON_TAG = process.env.AMAZON_ASSOC_TAG || 'pawme-20';

function isAmazonUrl(url: string): boolean {
  try {
    return /(^|\.)amazon\.[a-z.]+$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/** Append/replace a query param on a URL, returning the new URL string. */
function withParam(url: string, key: string, value: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set(key, value);
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Build the final outbound URL for a click.
 *
 * @param destination the merchant product/search page we want the user on
 * @param clickId     optional id we pass to Skimlinks as `xcust` so clicks
 *                    can be reconciled with our own shop-clicks log
 */
export function buildOutboundUrl(
  destination: string,
  clickId?: string,
): string {
  // 1. Skimlinks aggregator (preferred).
  if (SKIMLINKS_ID) {
    const params = new URLSearchParams({
      id: SKIMLINKS_ID,
      xs: '1',
      url: destination,
    });
    if (clickId) params.set('xcust', clickId);
    return `${SKIMLINKS_BASE}?${params.toString()}`;
  }

  // 2. Direct Amazon Associates tag (works with no API, no sales).
  if (isAmazonUrl(destination)) {
    return withParam(withParam(destination, 'tag', AMAZON_TAG), 'linkCode', 'app');
  }

  // 3. Plain pass-through.
  return destination;
}

/**
 * The destination URL for a catalog product. If the product has an
 * explicit `url`, use it; otherwise fall back to an Amazon search for the
 * product's title — robust (never 404s) and still monetisable, so the
 * catalog works before anyone hand-curates exact merchant URLs.
 */
export function destinationFor(product: {
  url?: string;
  asin?: string;
  title: string;
}): string {
  // 1. Explicit override wins.
  if (product.url) return product.url;
  // 2. Canonical Amazon product page from the ASIN (best conversion).
  if (product.asin) {
    return `https://www.amazon.com/dp/${encodeURIComponent(product.asin)}`;
  }
  // 3. Last resort: Amazon search by title (never 404s).
  return `https://www.amazon.com/s?k=${encodeURIComponent(product.title)}`;
}

/** True when the aggregator is wired up (for diagnostics / UI copy). */
export function isAggregatorConfigured(): boolean {
  return Boolean(SKIMLINKS_ID);
}
