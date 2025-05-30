'use server';

/**
 * @fileOverview This file defines a Genkit flow that provides predictive maintenance tips
 * based on the motorcycle's historical diagnostic data.
 *
 * @exports predictiveMaintenanceTips - An async function that takes DiagnosticDataHistoryInput as input and returns PredictiveMaintenanceTipsOutput.
 * @exports DiagnosticDataHistoryInput - The input type for the predictiveMaintenanceTips function.
 * @exports PredictiveMaintenanceTipsOutput - The output type for the predictiveMaintenanceTips function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DiagnosticDataPointSchema = z.object({
  timestamp: z.number().describe('Timestamp of the diagnostic data point.'),
  batteryVoltage: z.number().describe('Battery voltage in volts.'),
  engineRPM: z.number().describe('Engine RPM.'),
  coolantTemp: z.number().describe('Coolant temperature in degrees Celsius.'),
  oilLevel: z.number().describe('Oil level as a percentage.'),
  fuelLevel: z.number().describe('Fuel level as a percentage.'),
  vehicleSpeed: z.number().describe('Vehicle speed in km/h.'),
  throttlePosition: z.number().describe('Throttle position as a percentage.'),
});

const DiagnosticDataHistoryInputSchema = z.object({
  diagnosticDataHistory: z
    .array(DiagnosticDataPointSchema)
    .describe('Historical diagnostic data for the motorcycle.'),
});
export type DiagnosticDataHistoryInput = z.infer<typeof DiagnosticDataHistoryInputSchema>;

const PredictiveMaintenanceTipsOutputSchema = z.object({
  tips: z
    .array(z.string())
    .describe('Array of predictive maintenance tips based on the historical data.'),
});
export type PredictiveMaintenanceTipsOutput = z.infer<typeof PredictiveMaintenanceTipsOutputSchema>;

export async function predictiveMaintenanceTips(
  input: DiagnosticDataHistoryInput
): Promise<PredictiveMaintenanceTipsOutput> {
  return predictiveMaintenanceTipsFlow(input);
}

const predictiveMaintenanceTipsPrompt = ai.definePrompt({
  name: 'predictiveMaintenanceTipsPrompt',
  input: {schema: DiagnosticDataHistoryInputSchema},
  output: {schema: PredictiveMaintenanceTipsOutputSchema},
  prompt: `You are an expert motorcycle mechanic. Analyze the following historical diagnostic data and provide predictive maintenance tips to keep the motorcycle in optimal condition.

Historical Diagnostic Data:
{{#each diagnosticDataHistory}}
  - Timestamp: {{timestamp}}, Battery Voltage: {{batteryVoltage}}V, Engine RPM: {{engineRPM}}, Coolant Temp: {{coolantTemp}}°C, Oil Level: {{oilLevel}}%, Fuel Level: {{fuelLevel}}%, Vehicle Speed: {{vehicleSpeed}} km/h, Throttle Position: {{throttlePosition}}%
{{/each}}

Predictive Maintenance Tips:
`, // Ensure array of strings
});

const predictiveMaintenanceTipsFlow = ai.defineFlow(
  {
    name: 'predictiveMaintenanceTipsFlow',
    inputSchema: DiagnosticDataHistoryInputSchema,
    outputSchema: PredictiveMaintenanceTipsOutputSchema,
  },
  async input => {
    const {output} = await predictiveMaintenanceTipsPrompt(input);
    return output!;
  }
);
