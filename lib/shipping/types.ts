export type ShippingAddress = {
  postalCode: string;
  street?: string;
  number?: string;
  district?: string;
  city: string;
  state: string;
};

export type ShippingItem = {
  productId: string;
  quantity: number;
  weightGrams?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
};

export type ShippingQuoteRequest = {
  origin?: ShippingAddress;
  destination: ShippingAddress;
  items: ShippingItem[];
  subtotalCents: number;
};

export type ShippingQuote = {
  provider: string;
  service: string;
  serviceName: string;
  amountCents: number;
  estimatedDaysMin: number | null;
  estimatedDaysMax: number | null;
  metadata: Record<string, unknown>;
};

export type ShippingProvider = {
  id: string;
  quote(request: ShippingQuoteRequest): Promise<ShippingQuote[]>;
};

export type ShippingErrorCode = 'INVALID_ADDRESS' | 'INVALID_ITEMS' | 'UNAVAILABLE' | 'CONFIGURATION_ERROR';

export class ShippingError extends Error {
  constructor(message: string, public readonly code: ShippingErrorCode) {
    super(message);
    this.name = 'ShippingError';
  }
}
