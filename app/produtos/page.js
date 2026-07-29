import Header from '../../components/Header';
import Catalog from '../../components/Catalog';
import Footer from '../../components/Footer';
import WhatsAppButton from '../../components/WhatsAppButton';

export const metadata = { title: 'Produtos | Bros Store', description: 'Conheça o catálogo completo da Bros Store.' };

export default function ProductsPage() {
  return <main><Header /><div className="pt-[78px]"><Catalog /></div><Footer /><WhatsAppButton /></main>;
}
