export function formatCartPrice(cents) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((Number(cents) || 0) / 100);
}

export function priceToCents(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const normalized = String(value || '').replace(/[^\d,]/g, '').replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function buildCartWhatsappMessage(items) {
  const lines = items.map((item) => {
    const options = [item.selectedSize && `Tamanho: ${item.selectedSize}`, item.selectedColor && `Cor: ${item.selectedColor}`]
      .filter(Boolean)
      .join(' | ');
    return `• ${item.name} — ${item.quantity}x ${formatCartPrice(item.price_cents)}${options ? ` (${options})` : ''}`;
  });
  const total = items.reduce((sum, item) => sum + item.price_cents * item.quantity, 0);
  return ['Olá! Quero finalizar esta compra na Bros Store:', '', ...lines, '', `Subtotal: ${formatCartPrice(total)}`].join('\n');
}
