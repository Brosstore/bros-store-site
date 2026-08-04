# Bros Store

Site institucional e catálogo responsivo da Bros Store, desenvolvido em **Next.js 14** e **Tailwind CSS**. As vendas acontecem via **WhatsApp**: cada botão "Comprar" abre uma conversa já com uma mensagem pronta sobre o produto escolhido.

## Como rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` no navegador.

## Antes de publicar — checklist obrigatório

Edite o arquivo **`lib/siteConfig.js`** e preencha com os dados reais da loja:

- `whatsappNumber`: número real com DDI + DDD, só números (ex: `5511912345678`)
- `email`, `instagramUrl`, `instagramHandle`
- `address` (cidade/endereço, usado no rodapé e no mapa)
- `url`: o domínio final do site (ex: `https://www.brosstore.com.br`)

Edite **`lib/products.js`** e troque os produtos e categorias de exemplo pelos produtos reais (nome, preço, foto). As fotos usadas atualmente são de banco de imagens (Unsplash), apenas para exemplo — troque por fotos reais dos seus produtos antes de vender.

Em **`components/PremiumDetails.js`**, os depoimentos (`reviews`) são de exemplo. Substitua por avaliações reais de clientes antes de publicar — apresentar depoimentos fictícios como se fossem reais pode configurar propaganda enganosa.

Em **`components/About.js`**, revise os números da seção "+1K clientes / 100% qualidade" para refletir dados reais do seu negócio.

## Estrutura do projeto

- `app/` — páginas e configuração Next.js (metadados, sitemap, favicon, imagem de compartilhamento)
- `components/` — seções da página (Header, Hero, Produtos, Categorias, Sobre, Contato, Rodapé etc.)
- `lib/siteConfig.js` — configuração central (WhatsApp, redes sociais, contato)
- `lib/products.js` — catálogo de produtos e categorias

## Formulários

Como o site não tem backend, tanto o formulário de contato quanto o de newsletter abrem o WhatsApp com a mensagem preenchida automaticamente — não é necessário nenhum serviço externo para recebê-las. Se no futuro quiser receber por e-mail também, dá para integrar um serviço como Formspree ou Resend.

## Guias passo a passo

- **`GUIA-PRODUTOS.md`** — como adicionar, editar e remover produtos sozinho
- **`GUIA-DOMINIO-HOSPEDAGEM.md`** — como publicar o site de graça e, depois, comprar um domínio próprio

## Deploy

Recomendado: [Vercel](https://vercel.com) (gratuito, feito para Next.js).

1. Suba este projeto para um repositório no GitHub
2. Crie uma conta na Vercel e importe o repositório
3. A Vercel detecta o Next.js automaticamente — clique em "Deploy"
4. Depois, configure seu domínio próprio em Project Settings → Domains

Para a operação atual, mantenha o domínio gratuito da Vercel. Variáveis, deploy,
pagamentos, webhook, reconciliação, backup, restauração e resposta a incidentes
estão documentados em **`docs/PRODUCAO.md`**.

## SEO

O favicon e a imagem de compartilhamento (Open Graph) já são gerados automaticamente pelo Next.js a partir de `app/icon.svg` e `app/opengraph-image.js`. Um `sitemap.xml` e `robots.txt` também são gerados automaticamente a partir de `app/sitemap.js` e `app/robots.js`, usando a URL definida em `lib/siteConfig.js`.
