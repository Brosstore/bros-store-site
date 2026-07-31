import { MessageCircle } from 'lucide-react';
import { storeWhatsappLink } from '../lib/storeSettings';

export default function WhatsAppButton({ settings }) {
  return <a href={storeWhatsappLink(settings)} target="_blank" rel="noreferrer" aria-label="Falar pelo WhatsApp" className="fixed bottom-5 right-5 z-50 grid h-[50px] w-[50px] place-items-center rounded-full bg-[#25D366] text-white transition hover:scale-105" style={{ animation: 'pulse-soft 3s ease-in-out infinite' }} title="Fale conosco"><MessageCircle size={23} fill="currentColor"/></a>;
}
