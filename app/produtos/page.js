import Header from '../../components/Header';
import Catalog from '../../components/Catalog';
import Footer from '../../components/Footer';
import WhatsAppButton from '../../components/WhatsAppButton';
import { filterProductsByCategory, getAllProducts } from '../../lib/catalog/products';
import { getStoreSettings } from '../../lib/storeSettings';

export const metadata = { title: 'Produtos | Bros Store', description: 'Conheça o catálogo completo da Bros Store.' };

const filters = [
  { label: 'Todos os produtos', value: '' },
  { label: 'Tênis', value: 'tenis' },
  { label: 'Acessórios', value: 'acessorios' },
  { label: 'Masculino', value: 'masculino' },
  { label: 'Feminino', value: 'feminino' },
];

export default async function ProductsPage({ searchParams }) {
  const requestedCategory = typeof searchParams?.categoria === 'string' ? searchParams.categoria : '';
  const activeCategory = filters.some((filter) => filter.value === requestedCategory) ? requestedCategory : '';
  const [products, settings] = await Promise.all([getAllProducts(), getStoreSettings()]);
  const visibleProducts = filterProductsByCategory(products, activeCategory);
  const visibleFilters = filters.filter(
    (filter) => !filter.value || filterProductsByCategory(products, filter.value).length > 0
  );

  return <main><Header settings={settings} /><div className="pt-[78px]"><Catalog activeCategory={activeCategory} visibleFilters={visibleFilters} visibleProducts={visibleProducts} /></div><Footer settings={settings} /><WhatsAppButton settings={settings} /></main>;
}
