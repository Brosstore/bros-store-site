import Footer from '../../components/Footer';
import Header from '../../components/Header';
import WhatsAppButton from '../../components/WhatsAppButton';
import { getStoreSettings } from '../../lib/storeSettings';

export default async function ProductLayout({ children }) {
  const settings = await getStoreSettings();
  return <><Header settings={settings} />{children}<Footer settings={settings} /><WhatsAppButton settings={settings} /></>;
}
