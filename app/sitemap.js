import { getAllProducts } from '../lib/catalog/products';
import { siteConfig } from '../lib/siteConfig';

function productLastModified(product) {
  const value = product.updatedAt || product.updated_at;
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : undefined;
}

export default async function sitemap() {
  const products = await getAllProducts();
  const base = [
    { url: siteConfig.url, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteConfig.url}/produtos`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteConfig.url}/privacidade`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteConfig.url}/termos`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteConfig.url}/trocas`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${siteConfig.url}/entregas`, changeFrequency: 'yearly', priority: 0.5 },
  ];
  const productUrls = products.map((product) => {
    const lastModified = productLastModified(product);
    return {
      url: `${siteConfig.url}/produto/${encodeURIComponent(product.id)}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: 'weekly',
      priority: 0.8,
    };
  });
  return [...base, ...productUrls];
}
