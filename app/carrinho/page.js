import CartPage from '../../components/cart/CartPage';
import Footer from '../../components/Footer';
import Header from '../../components/Header';
import WhatsAppButton from '../../components/WhatsAppButton';
import { getStoreSettings } from '../../lib/storeSettings';

export const metadata = { title: 'Carrinho | Bros Store', description: 'Revise os produtos selecionados antes de finalizar seu pedido.' };

export default async function CartRoute() {
  const settings = await getStoreSettings();
  return <main><Header settings={settings}/><div className="pt-[78px]"><CartPage /></div><Footer settings={settings}/><WhatsAppButton settings={settings}/></main>;
}
