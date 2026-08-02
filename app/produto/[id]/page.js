import { notFound } from 'next/navigation';
import ProductDetail from '../../../components/ProductDetail';
import {
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
} from '../../../lib/catalog/products';
import { getStoreSettings } from '../../../lib/storeSettings';
import { absoluteUrl, jsonLd } from '../../../lib/seo';

// O catálogo é atualizado localmente com frequência; evita páginas estáticas
// desatualizadas quando novos produtos são adicionados.
export const dynamic = 'force-dynamic';

export async function generateStaticParams() { const products = await getAllProducts(); return products.map((product) => ({ id: product.id })); }

export async function generateMetadata({ params }) {
  const { id } = await params;
  const product = await getProductBySlug(id);
  if (!product) return { title: 'Produto | Bros Store', robots: { index: false, follow: false } };
  const url = absoluteUrl(`/produto/${encodeURIComponent(product.id)}`);
  const image = product.images?.[0] ? absoluteUrl(product.images[0]) : absoluteUrl('/opengraph-image');
  return { title: `${product.name} | Bros Store`, description: product.description, alternates: { canonical: url }, openGraph: { title: `${product.name} | Bros Store`, description: product.description, type: 'website', url, images: [{ url: image, alt: product.name }] }, twitter: { card: 'summary_large_image', title: `${product.name} | Bros Store`, description: product.description, images: [image] } };
}

export default async function ProductPage({ params }) { const { id } = await params; const product = await getProductBySlug(id); if (!product) notFound(); const [related, settings] = await Promise.all([getRelatedProducts(product.id), getStoreSettings()]); const url = absoluteUrl(`/produto/${encodeURIComponent(product.id)}`); const image = product.images?.[0] ? absoluteUrl(product.images[0]) : undefined; const price = Number(product.price_cents); const offer = Number.isFinite(price) ? { '@type': 'Offer', priceCurrency: 'BRL', price: (price / 100).toFixed(2), availability: product.isAvailable === false ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock', url } : undefined; const schema = { '@context': 'https://schema.org', '@type': 'Product', name: product.name, description: product.description, image: image ? [image] : undefined, brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined, category: product.category || undefined, offers: offer }; return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(schema) }} /><ProductDetail product={product} related={related} settings={settings} /></>; }
