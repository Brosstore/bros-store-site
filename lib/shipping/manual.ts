import type { ShippingProvider, ShippingQuote, ShippingQuoteRequest } from './types';

// CommonJS mantém a mesma implementação exercitada pelos testes Node do projeto.
const manual = require('./manual.cjs') as { createManualQuote: (request: ShippingQuoteRequest, config: ManualShippingConfig) => ShippingQuote };

export type ManualShippingConfig = {
  enabled: boolean;
  serviceName: string;
  amountCents: number;
  freeThresholdCents: number | null;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
};

export function createManualProvider(config: ManualShippingConfig): ShippingProvider {
  return { id: 'manual', async quote(request) { return [manual.createManualQuote(request, config)]; } };
}
