import { getAllProducts } from '../lib/catalog/products';
import { getPublicCategories } from '../lib/categories';
import { siteConfig } from '../lib/siteConfig';

export default async function sitemap() {
  const [products, categories] = await Promise.all([getAllProducts(), getPublicCategories()]);
  const now = new Date();
  const base = [
    { url: siteConfig.url, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteConfig.url}/produtos`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${siteConfig.url}/privacidade`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteConfig.url}/termos`, lastModified: now, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteConfig.url}/trocas`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${siteConfig.url}/entregas`, lastModified: now, changeFrequency: 'yearly', priority: 0.5 },
  ];
  const categoryUrls = categories.filter((category) => category?.slug).map((category) => ({ url: `${siteConfig.url}/produtos?categoria=${encodeURIComponent(category.slug)}`, lastModified: now, changeFrequency: 'weekly', priority: 0.7 }));
  const productUrls = products.map((product) => ({ url: `${siteConfig.url}/produto/${encodeURIComponent(product.id)}`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 }));
  return [...base, ...categoryUrls, ...productUrls];
}
