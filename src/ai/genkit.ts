import { genkit } from 'genkit';
import type { Plugin } from '@genkit-ai/core'; // Corrected import
import { openAI } from 'genkitx-openai';
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const activePlugins: Plugin[] = [];

if (OPENAI_API_KEY) {
    activePlugins.push(openAI({ apiKey: OPENAI_API_KEY }));
}


// Enable Firebase telemetry
enableFirebaseTelemetry();

// Configure Genkit globally by creating a single configured instance.
// This ensures all AI flows use this configuration by default.
export const ai = genkit({
  plugins: activePlugins,
  logLevel: "debug",
  enableTracingAndMetrics: true,
});