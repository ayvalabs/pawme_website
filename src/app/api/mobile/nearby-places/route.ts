import { NextRequest, NextResponse } from 'next/server';
import { logApi, runApi } from '@/lib/pawme-logging';
import { requireMobileUser } from '@/lib/pawme-mobile';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mobile/nearby-places
 *
 * Query params:
 *   - lat: number (required)
 *   - lng: number (required)
 *   - category: 'vet' | 'clinic' | 'grooming' | 'shop' | 'park' | 'daycare' | 'all'
 *   - radius: number (meters, default 3000, max 25000)
 *
 * Auth: Bearer Firebase ID token (mobile user).
 *
 * Backed by Google Places Nearby Search v1. Returns a normalized array
 * suitable for the React Native client. Falls back to an empty array (with
 * `success: true`) when GOOGLE_PLACES_API_KEY is not configured, so the app
 * can degrade gracefully without breaking the UI.
 */

type Category =
  | 'vet'
  | 'clinic'
  | 'grooming'
  | 'shop'
  | 'park'
  | 'daycare'
  | 'restaurant'
  | 'all';

const CATEGORY_TO_TYPES: Record<Exclude<Category, 'all'>, string[]> = {
  vet: ['veterinary_care'],
  clinic: ['veterinary_care'],
  grooming: ['pet_store'],
  shop: ['pet_store'],
  park: ['park'],
  daycare: ['pet_store'],
  restaurant: ['restaurant'],
};

const CATEGORY_KEYWORDS: Partial<Record<Exclude<Category, 'all'>, string>> = {
  grooming: 'pet grooming',
  daycare: 'dog daycare boarding',
  park: 'dog park',
  restaurant: 'pet friendly dog friendly',
};

interface NormalizedPlace {
  id: string;
  name: string;
  address: string;
  category: Category;
  rating?: number;
  distance?: string;
  isOpen?: boolean;
  phone?: string;
  lat?: number;
  lng?: number;
}

const ENDPOINT = 'mobile/nearby-places';

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function distanceLabel(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function inferCategory(types: string[] | undefined, requested: Category): Category {
  if (requested !== 'all') return requested;
  const t = (types || []).join(' ');
  if (/veterinary/.test(t)) return 'vet';
  if (/park/.test(t)) return 'park';
  if (/pet_store/.test(t)) return 'shop';
  return 'all';
}

export async function GET(request: NextRequest) {
  const { requestId, result, error } = await runApi<NormalizedPlace[]>(
    { endpoint: ENDPOINT, request },
    async ({ requestId: _rid, logInfo }): Promise<NormalizedPlace[]> => {
      const { uid } = await requireMobileUser(request);
      logInfo({ uid });

      const { searchParams } = new URL(request.url);
      const lat = Number(searchParams.get('lat'));
      const lng = Number(searchParams.get('lng'));
      const category = (searchParams.get('category') || 'all') as Category;
      const radiusRaw = Number(searchParams.get('radius') || 3000);
      const radius = Math.min(
        Math.max(Number.isFinite(radiusRaw) ? radiusRaw : 3000, 250),
        25000,
      );

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        const err: Error & { statusCode?: number } = new Error(
          'lat and lng are required',
        );
        err.statusCode = 400;
        throw err;
      }

      logInfo({ lat, lng, category, radius });

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        logInfo({ note: 'GOOGLE_PLACES_API_KEY not set — returning empty list' });
        return [];
      }

      const types =
        category === 'all'
          ? ['veterinary_care', 'pet_store', 'park', 'restaurant']
          : CATEGORY_TO_TYPES[category];
      const keyword =
        category !== 'all'
          ? CATEGORY_KEYWORDS[category as Exclude<Category, 'all'>]
          : undefined;

      const body: Record<string, unknown> = {
        includedTypes: types,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius,
          },
        },
      };
      if (keyword) {
        body.textQuery = keyword;
      }

      const fieldMask =
        'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.regularOpeningHours.openNow,places.nationalPhoneNumber,places.types';

      const r = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': fieldMask,
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        logApi('warn', {
          requestId: _rid,
          endpoint: ENDPOINT,
          status: r.status,
          providerError: txt.slice(0, 240),
        });
        return [];
      }

      const raw = await r.json();
      const places: any[] = Array.isArray(raw?.places) ? raw.places : [];
      const data: NormalizedPlace[] = places.map((p) => {
        const plat = p?.location?.latitude;
        const plng = p?.location?.longitude;
        const distKm =
          Number.isFinite(plat) && Number.isFinite(plng)
            ? haversine(lat, lng, plat, plng)
            : undefined;
        return {
          id: String(p.id ?? p.displayName?.text ?? Math.random()),
          name: p.displayName?.text ?? 'Unknown',
          address: p.formattedAddress ?? '',
          category: inferCategory(p.types, category),
          rating: typeof p.rating === 'number' ? p.rating : undefined,
          distance: distKm != null ? distanceLabel(distKm) : undefined,
          isOpen: p.regularOpeningHours?.openNow,
          phone: p.nationalPhoneNumber,
          lat: plat,
          lng: plng,
        };
      });

      data.sort((a, b) => {
        const da = a.distance ? parseFloat(a.distance) : Infinity;
        const db = b.distance ? parseFloat(b.distance) : Infinity;
        if (da !== db) return da - db;
        return (b.rating ?? 0) - (a.rating ?? 0);
      });

      logInfo({ count: data.length });
      return data;
    },
  );

  if (error) {
    const status =
      typeof (error as { statusCode?: number }).statusCode === 'number'
        ? (error as { statusCode: number }).statusCode
        : 500;
    return NextResponse.json(
      {
        success: false,
        message:
          status === 401
            ? 'Unauthorized'
            : (error as Error)?.message || 'Internal error',
        requestId,
      },
      { status },
    );
  }

  return NextResponse.json({ success: true, data: result ?? [], requestId });
}
