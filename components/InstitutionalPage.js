import Footer from './Footer';
import Header from './Header';
import WhatsAppButton from './WhatsAppButton';
import { getStoreSettings } from '../lib/storeSettings';

export default async function InstitutionalPage({ eyebrow = 'Bros Store', title, intro, sections }) {
  const settings = await getStoreSettings();
  return <main><Header settings={settings} /><article className="section pt-[126px]"><p className="eyebrow">{eyebrow}</p><h1 className="section-title max-w-3xl">{title}</h1><p className="mt-6 max-w-3xl text-base leading-8 text-zinc-400">{intro}</p><div className="mt-12 grid max-w-4xl gap-6">{sections.map((section) => <section key={section.title} className="glass rounded-2xl p-6 sm:p-8"><h2 className="text-xl font-extrabold text-white">{section.title}</h2><p className="mt-4 whitespace-pre-line leading-7 text-zinc-400">{section.content}</p></section>)}</div></article><Footer settings={settings} /><WhatsAppButton settings={settings} /></main>;
}
