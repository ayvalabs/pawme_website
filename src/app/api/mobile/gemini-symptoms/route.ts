import { NextRequest, NextResponse } from 'next/server';
import { generateGeminiJson } from '@/lib/pawme-gemini';
import { getOwnedPetContext, mergePetContext, requireMobileUser } from '@/lib/pawme-mobile';

interface SymptomResult {
  severity: 'low' | 'medium' | 'high' | 'emergency';
  condition: string;
  description: string;
  recommendations: string[];
  shouldSeeVet: boolean;
  urgency: string;
}

const FALLBACK_RESULT: SymptomResult = {
  severity: 'medium',
  condition: 'Unable to analyze',
  description: 'We could not reliably analyze this symptom from the available information.',
  recommendations: [
    'Monitor your pet closely.',
    'Take clearer photos if the symptom is visible.',
    'Contact your veterinarian if symptoms persist or worsen.',
  ],
  shouldSeeVet: true,
  urgency: 'Consult your veterinarian if symptoms are worsening or severe.',
};

export async function POST(request: NextRequest) {
  try {
    const { uid } = await requireMobileUser(request);
    const body = await request.json();

    if (!body.imageBase64 && !body.description) {
      return NextResponse.json(
        { success: false, message: 'imageBase64 or description is required' },
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

    const prompt = `You are PawMe Copilot, a conservative AI pet symptom guide.

Return valid JSON only:
{
  "severity": "low" | "medium" | "high" | "emergency",
  "condition": "short symptom summary",
  "description": "short explanation of what this may represent",
  "recommendations": ["3-5 practical next steps"],
  "shouldSeeVet": true,
  "urgency": "clear next-step guidance"
}

Rules:
- Never diagnose with certainty.
- Use cautious language.
- Escalate emergencies clearly.
- Consider recent observations and care history if present.

Pet context:
${JSON.stringify(petContext, null, 2)}

Recent care context:
${JSON.stringify(
      firestoreContext
        ? {
            observations: firestoreContext.observations,
            vaccinations: firestoreContext.vaccinations,
            records: firestoreContext.records,
          }
        : {},
      null,
      2,
    )}

Owner description:
${String(body.description || '')}`;

    const data = await generateGeminiJson<SymptomResult>(
      prompt,
      body.imageBase64 ? String(body.imageBase64) : undefined,
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[mobile/gemini-symptoms] Error:', error);
    return NextResponse.json({ success: true, data: FALLBACK_RESULT });
  }
}
