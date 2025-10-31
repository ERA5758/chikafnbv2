import { NextRequest, NextResponse } from 'next/server';
import { run } from 'genkit';
import { inactiveTenantFollowUpFlow, InactiveTenantFollowUpInputSchema } from '@/ai/flows/inactive-tenant-follow-up';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();

    // Validate the input against the schema
    const validatedInput = InactiveTenantFollowUpInputSchema.parse(input);

    // Run the Genkit flow with the validated input
    const result = await run(inactiveTenantFollowUpFlow, validatedInput);

    // Return the successful result from the flow
    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in /api/ai/inactive-tenant-follow-up route:', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input parameters', details: error.errors }, { status: 400 });
    }
    
    // Handle other errors
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
