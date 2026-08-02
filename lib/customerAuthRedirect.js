export function getSafeCustomerNext(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/minha-conta';
  const allowed = value === '/checkout'
    || value === '/minha-conta'
    || value.startsWith('/minha-conta/')
    || value.startsWith('/pedido-confirmado/');
  return allowed ? value : '/minha-conta';
}

export function customerLoginUrl(next) {
  const destination = getSafeCustomerNext(next);
  return destination === '/minha-conta' ? '/login' : `/login?next=${encodeURIComponent(destination)}`;
}
