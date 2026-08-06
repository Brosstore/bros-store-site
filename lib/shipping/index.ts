export * from './types';
export * from './manual';

export function normalizeShippingError(error: unknown) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'UNAVAILABLE';
  return { code, message: error instanceof Error ? error.message : 'Não foi possível calcular o frete.' };
}
