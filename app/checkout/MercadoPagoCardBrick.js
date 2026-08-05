'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

export default function MercadoPagoCardBrick({ amount, publicKey, onSubmit }) {
  const controllerRef = useRef(null);
  const submitRef = useRef(onSubmit);
  const [sdkReady, setSdkReady] = useState(() => typeof window !== 'undefined' && Boolean(window.MercadoPago));
  const [error, setError] = useState('');
  submitRef.current = onSubmit;

  useEffect(() => {
    if (!sdkReady || !publicKey || !amount || controllerRef.current) return undefined;
    let cancelled = false;
    const render = async () => {
      try {
        const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' });
        const controller = await mp.bricks().create('cardPayment', 'mercado-pago-card-brick', {
          initialization: { amount },
          customization: { visual: { style: { theme: 'dark' } }, paymentMethods: { maxInstallments: 12 } },
          callbacks: {
            onReady: () => setError(''),
            onSubmit: (formData, additionalData) => submitRef.current({
              token: formData.token,
              paymentMethodId: formData.payment_method_id,
              paymentTypeId: additionalData.paymentTypeId,
              installments: formData.installments,
              identification: formData.payer?.identification,
            }),
            onError: () => setError('Não foi possível carregar o formulário seguro do cartão.'),
          },
        });
        if (cancelled) await controller.unmount();
        else controllerRef.current = controller;
      } catch {
        setError('Não foi possível carregar o formulário seguro do cartão.');
      }
    };
    render();
    return () => {
      cancelled = true;
      const controller = controllerRef.current;
      controllerRef.current = null;
      if (controller) controller.unmount().catch(() => {});
    };
  }, [amount, publicKey, sdkReady]);

  return <div className="mt-6 rounded-xl border border-white/10 bg-white/[.03] p-4">
    <Script src="https://sdk.mercadopago.com/js/v2" strategy="afterInteractive" onLoad={() => setSdkReady(true)} />
    {!sdkReady && <p className="text-sm text-zinc-400">Carregando formulário seguro do Mercado Pago...</p>}
    <div id="mercado-pago-card-brick" />
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </div>;
}
