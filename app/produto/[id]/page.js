import { notFound } from 'next/navigation';
import ProductDetail from '../../../components/ProductDetail';
import { getProduct, products } from '../../../data/products';

// O catálogo é atualizado localmente com frequência; evita páginas estáticas
// desatualizadas quando novos produtos são adicionados.
export const dynamic = 'force-dynamic';

export function generateStaticParams() { return products.map((product) => ({ id: product.id })); }

export async function generateMetadata({ params }) { const { id } = await params; const product = getProduct(id); return { title: product ? `${product.name} | Bros Store` : 'Produto | Bros Store', description: product?.description }; }

export default async function ProductPage({ params }) { const { id } = await params; const product = getProduct(id); if (!product) notFound(); return <ProductDetail product={product} related={products.filter((item) => item.id !== product.id).slice(0, 3)} />; }
