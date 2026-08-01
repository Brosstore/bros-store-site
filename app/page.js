import Header from '../components/Header';
import Hero from '../components/Hero';
import Categories from '../components/Categories';
import Products from '../components/Products';
import About from '../components/About';
import { Gallery, Benefits, FAQ, ContactPremium } from '../components/PremiumDetails';
import Footer from '../components/Footer';
import WhatsAppButton from '../components/WhatsAppButton';
import PremiumBar from '../components/PremiumBar';
import { getAllProducts, getHomeShowcases } from '../lib/catalog/products';
import { getPublicCategories } from '../lib/categories';
import { getStoreSettings } from '../lib/storeSettings';

export const revalidate = 60;

export default async function Home() {
  const [categories, products, settings] = await Promise.all([
    getPublicCategories(),
    getAllProducts(),
    getStoreSettings(),
  ]);
  const showcases = getHomeShowcases(products);

  return (
    <main>
      <Header settings={settings} />
      <Hero settings={settings} heroProduct={showcases.heroProduct} />
      <PremiumBar />
      <Categories categories={categories} />
      <Products products={showcases.newArrivals} id="lancamentos" eyebrow="Novidades" title="RECÉM" accent="CHEGADOS." description="Produtos novos selecionados para a Bros Store." />
      <Products products={showcases.featured} id="destaques" eyebrow="Seleção Bros" title="EM" accent="DESTAQUE." description="Peças escolhidas para inspirar seu próximo visual." />
      <Products products={showcases.promotions} id="promocoes" eyebrow="Oportunidades" title="SELEÇÃO" accent="ESPECIAL." description="Produtos com condição especial disponível no catálogo." />
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
