import './globals.css';

export const metadata = {
  title: 'Bros Store | Vista sua atitude.',
  description: 'Bros Store: moda, streetwear e acessórios para vestir sua personalidade.',
  keywords: ['Bros Store', 'moda urbana', 'roupas', 'calçados', 'acessórios'],
  openGraph: {
    title: 'Bros Store | Vista sua atitude.',
    description: 'Moda, streetwear e acessórios para vestir sua personalidade.',
    type: 'website',
    locale: 'pt_BR',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
