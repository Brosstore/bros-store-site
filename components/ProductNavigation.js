'use client';

import { useEffect } from 'react';

export default function ProductNavigation() {
  useEffect(() => {
    const updateLinks = () => document.querySelectorAll('a[href="#produtos"]').forEach((link) => { link.href = '/produtos'; });
    updateLinks();
    const observer = new MutationObserver(updateLinks);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
