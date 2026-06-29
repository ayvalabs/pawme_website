/**
 * QR collar-tag pricing.
 *
 * Base SKU is $14.99 USD (engraved metal tag with QR pointing to
 * pawme.ayvalabs.com/found/{petId}). Shipping uses the same country-band
 * table as the printed passport — see passport-pricing.ts for the rationale.
 *
 * TODO: swap shipping for tag-manufacturer-quoted rates once we pick a vendor.
 */

export interface TagPrice {
  amount: number;        // total cents
  currency: string;
  baseCents: number;
  shippingCents: number;
}

const BASE_CENTS = 1499;

const SHIPPING_USD: Record<string, number> = {
  US: 499,
  CA: 899,
  GB: 1299, IE: 1299,
  DE: 1299, FR: 1299, IT: 1299, ES: 1299, NL: 1299, BE: 1299, AT: 1299, PT: 1299, SE: 1299, FI: 1299, DK: 1299, NO: 1299, CH: 1299, PL: 1299,
  HK: 1299, SG: 1299, AU: 1299, NZ: 1299, JP: 1299,
};
const SHIPPING_DEFAULT_CENTS = 1699;

export function tagPriceForAddress(country?: string | null): TagPrice {
  const cc = (country || '').toUpperCase();
  const shippingCents = SHIPPING_USD[cc] ?? SHIPPING_DEFAULT_CENTS;
  return {
    amount: BASE_CENTS + shippingCents,
    currency: 'usd',
    baseCents: BASE_CENTS,
    shippingCents,
  };
}
