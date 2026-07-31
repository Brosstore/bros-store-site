import Header from '../components/Header';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import Products from '../components/Products';
import About from '../components/About';
import { Gallery, Benefits, FAQ, ContactPremium } from '../components/PremiumDetails';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import PremiumBar from '../components/PremiumBar';
import { getCategories, getFeaturedProducts } from '../lib/catalog/products';
import { getStoreSettings } from '../lib/storeSettings';

export default async function Home() {
  const [categories, featuredProducts, settings] = await Promise.all([
    getCategories(),
    getFeaturedProducts(),
    getStoreSettings(),
  ]);

  return (
    <main>
      <Header settings={settings} />
      <Hero settings={settings} />
      <PremiumBar />
      <Categories categories={categories} />
      <Products products={featuredProducts} />
      <About />
      <Benefits />
      <Gallery settings={settings} />
      <FAQ />
      <ContactPremium settings={settings} />
      <Footer settings={settings} />
      <WhatsAppButton settings={settings} />
    </main>
  );
}
