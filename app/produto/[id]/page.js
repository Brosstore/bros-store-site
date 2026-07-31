import { notFound } from 'next/navigation';
import ProductDetail from '../../../components/ProductDetail';
import {
  getAllProducts,
  getProductBySlug,
  getRelatedProducts,
} from '../../../lib/catalog/products';
import { getStoreSettings } from '../../../lib/storeSettings';

// O catálogo é atualizado localmente com frequência; evita páginas estáticas
// desatualizadas quando novos produtos são adicionados.
export const dynamic = 'force-dynamic';

export async function generateStaticParams() { const products = await getAllProducts(); return products.map((product) => ({ id: product.id })); }

export async function generateMetadata({ params }) { const { id } = await params; const product = await getProductBySlug(id); return { title: product ? `${product.name} | Bros Store` : 'Produto | Bros Store', description: product?.description }; }

export default async function ProductPage({ params }) { const { id } = await params; const product = await getProductBySlug(id); if (!product) notFound(); const [related, settings] = await Promise.all([getRelatedProducts(product.id), getStoreSettings()]); return <ProductDetail product={product} related={related} settings={settings} />; }
