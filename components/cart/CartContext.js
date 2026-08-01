'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import CartDrawer from './CartDrawer';
import { priceToCents } from './cartUtils';

const CartContext = createContext(null);
const STORAGE_KEY = 'bros-store-cart-v1';

export function CartProvider({ children, settings }) {
  const [items, setItems] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { try { const saved = window.localStorage.getItem(STORAGE_KEY); if (saved) { const parsed = JSON.parse(saved); if (Array.isArray(parsed)) setItems(parsed.filter((item) => item?.key && item?.name && item?.price_cents >= 0)); } } catch { window.localStorage.removeItem(STORAGE_KEY); } finally { setHydrated(true); } }, []);
  useEffect(() => { if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }, [items, hydrated]);

  const value = useMemo(() => ({
    items, hydrated, isOpen,
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    subtotalCents: items.reduce((total, item) => total + item.price_cents * item.quantity, 0),
    openCart: () => setIsOpen(true), closeCart: () => setIsOpen(false),
    addItem: (product, options = {}) => {
      const productId = product.productId || product.id;
      const selectedSize = options.selectedSize || '';
      const selectedColor = options.selectedColor || '';
      const key = `${productId}:${selectedSize || '_'}:${selectedColor || '_'}`;
      const quantity = Math.max(1, Number(options.quantity) || 1);
      const item = { key, productId, slug: product.id, name: product.name, image: product.images?.[0] || '', price_cents: product.price_cents ?? priceToCents(product.price), quantity, selectedSize, selectedColor };
      setItems((current) => { const existing = current.find((entry) => entry.key === key); return existing ? current.map((entry) => entry.key === key ? { ...entry, quantity: entry.quantity + quantity } : entry) : [...current, item]; });
      setIsOpen(true);
    },
    updateQuantity: (key, quantity) => setItems((current) => quantity > 0 ? current.map((item) => item.key === key ? { ...item, quantity } : item) : current.filter((item) => item.key !== key)),
    removeItem: (key) => setItems((current) => current.filter((item) => item.key !== key)),
  }), [items, isOpen, hydrated]);
  return <CartContext.Provider value={value}>{children}<CartDrawer settings={settings}/></CartContext.Provider>;
}

export function useCart() { const cart = useContext(CartContext); if (!cart) throw new Error('useCart deve ser usado dentro de CartProvider.'); return cart; }
