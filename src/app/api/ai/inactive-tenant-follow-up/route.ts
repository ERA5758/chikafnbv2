import { NextRequest, NextResponse } from 'next/server';
import { getInactiveTenantFollowUp, InactiveTenantFollowUpInput } from '@/ai/flows/inactive-tenant-follow-up';

export async function POST(request: NextRequest) {
  try {
    const input: InactiveTenantFollowUpInput = await request.json();

    const { storeName, adminName, businessDescription, daysInactive } = input;

    if (!storeName || !adminName || !businessDescription || !daysInactive) {
      return NextResponse.json({ error: 'Missing required input parameters' }, { status: 400 });
    }

    const result = await getInactiveTenantFollowUp(input);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in inactiveTenantFollowUp API route:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate follow-up message';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}