import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';

interface ExtractedMedicalRecord {
  title: string;
  type: 'vaccination' | 'lab' | 'prescription' | 'invoice' | 'certificate' | 'visit-note' | 'other';
  providerName?: string;
  issuedAt?: string;
  summary: string;
  extractedFields: Record<string, string>;
  vaccinations?: Array<{
    vaccineName: string;
    dateAdministered?: string;
    nextDueDate?: string;
    clinicName?: string;
  }>;
}

const FALLBACK_RESULT: ExtractedMedicalRecord = {
  title: 'Scanned pet record',
  type: 'other',
  providerName: '',
  issuedAt: new Date().toISOString().split('T')[0],
  summary: 'We saved your scan, but could not confidently extract the full record details.',
  extractedFields: {
    review: 'Manual confirmation recommended',
  },
  vaccinations: [],
};

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireMobileUser(request);
    const body = await request.json();

    if (!body.imageBase64) {
      return NextResponse.json(
        { success: false, message: 'imageBase64 is required' },
        { status: 400 },
      );
    }

    let firestoreContext = null;
    if (body.petId) {
      firestoreContext = await getOwnedPetContext(uid, String(body.petId));
    }

    const petContext = firestoreContext
      ? mergePetContext(firestoreContext, body.petContext)
      : body.petContext || {};

    const prompt = `You are PawMe Copilot extracting a pet medical document from an image.

Return valid JSON only:
{
  "title": "short title for the record",
  "type": "vaccination" | "lab" | "prescription" | "invoice" | "certificate" | "visit-note" | "other",
  "providerName": "clinic or provider if visible",
  "issuedAt": "YYYY-MM-DD if visible, otherwise empty string",
  "summary": "2-3 sentence summary of what the document appears to be",
  "extractedFields": {
    "fieldName": "fieldValue"
  },
  "vaccinations": [
    {
      "vaccineName": "string",
      "dateAdministered": "YYYY-MM-DD if visible",
      "nextDueDate": "YYYY-MM-DD if visible",
      "clinicName": "string if visible"
    }
  ]
}

Rules:
- Only extract what is reasonably visible.
- Leave values empty instead of inventing specifics.
- If the image looks like a vaccine card, include vaccination entries.
- Keep the summary practical and cautious.

Pet context:
${JSON.stringify(petContext, null, 2)}

Existing care context:
${JSON.stringify(
      firestoreContext
        ? {
            vaccinations: firestoreContext.vaccinations,
            records: firestoreContext.records,
          }
        : {},
      null,
      2,
    )}`;

    const data = await generateGeminiJson<ExtractedMedicalRecord>(
      prompt,
      String(body.imageBase64),
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[mobile/gemini-record-extract] Error:', error);
    return NextResponse.json({ success: true, data: FALLBACK_RESULT });
  }
}
