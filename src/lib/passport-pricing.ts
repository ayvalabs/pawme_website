/**
 * Printed-passport pricing.
 *
 * Base SKU is $9.99 USD. Shipping is a flat country-band table for now —
 * TODO: swap for a POD-quoted rate once the print provider (Gelato / Printful
 * / Lob) is wired into the webhook fulfillment path.
 */

export interface PassportPrice {
  amount: number;        // total in cents
  currency: string;      // ISO 4217
  baseCents: number;
  shippingCents: number;
}

const BASE_CENTS = 999;

// Country → shipping cents, USD. Single source of truth so the create endpoint
// and the order-list view show the same numbers.
const SHIPPING_USD: Record<string, number> = {
  US: 499,
  CA: 899,
  GB: 1299, IE: 1299,
  // EU
  DE: 1299, FR: 1299, IT: 1299, ES: 1299, NL: 1299, BE: 1299, AT: 1299, PT: 1299, SE: 1299, FI: 1299, DK: 1299, NO: 1299, CH: 1299, PL: 1299,
  // APAC pickups (HK is the user's region)
  HK: 1299, SG: 1299, AU: 1299, NZ: 1299, JP: 1299,
};
const SHIPPING_DEFAULT_CENTS = 1699; // "rest of world"

export function priceForAddress(country?: string | null): PassportPrice {
  const cc = (country || '').toUpperCase();
  const shippingCents = SHIPPING_USD[cc] ?? SHIPPING_DEFAULT_CENTS;
  return {
    amount: BASE_CENTS + shippingCents,
    currency: 'usd',
    baseCents: BASE_CENTS,
    shippingCents,
  };
}
