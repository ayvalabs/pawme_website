/**
 * src/lib/shop-firestore.ts
 *
 * Loads the first-party product catalog from the Firestore `shop-products`
 * collection (seeded by scripts/seed-shop-products.mjs, with AI-generated
 * images in Firebase Storage). Falls back to an empty list on any error so
 * the route can degrade to the static CATALOG.
 */

import { adminDb } from './firebase-admin';
import type {
  BreedSize,
  LifeStage,
  PetSpecies,
  ProductCategory,
  ShopProduct,
} from './shop-catalog';

// Cache the catalog briefly in-process — it changes rarely and the Shop is
// hit on every page/app load.
const TTL_MS = 5 * 60 * 1000;
let cache: { products: ShopProduct[]; expires: number } | null = null;

/* eslint-disable @typescript-eslint/no-explicit-any */
function toProduct(id: string, x: any): ShopProduct {
  return {
    asin: x.asin ?? id,
    title: x.title ?? '',
    tagline: x.tagline ?? '',
    whyItFits: x.whyItFits ?? '',
    benefit: x.benefit,
    imageUrl: x.imageUrl ?? '',
    priceHint: x.priceHint ?? '',
    url: x.url,
    category: (x.category ?? 'food') as ProductCategory,
    species: (x.species ?? []) as PetSpecies[],
    lifeStage: (x.lifeStage ?? ['*']) as LifeStage[],
    breedSize: (x.breedSize ?? ['*']) as BreedSize[],
    breedTags: x.breedTags,
    // First-party items default to out of stock ("coming soon").
    inStock: x.inStock ?? false,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Return the active products from Firestore, or [] if the collection is
 * empty / unreachable (caller falls back to the static catalog).
 */
export async function loadShopProducts(now: number = Date.now()): Promise<ShopProduct[]> {
  if (cache && cache.expires > now) return cache.products;
  try {
    const snap = await adminDb
      .collection('shop-products')
      .where('active', '==', true)
      .get();
    if (snap.empty) return [];
    const products = snap.docs.map((d) => toProduct(d.id, d.data()));
    cache = { products, expires: now + TTL_MS };
    return products;
  } catch {
    return [];
  }
}
