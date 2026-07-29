# Guia: como adicionar produtos sozinho

Você só precisa editar **um arquivo**: `lib/products.js`. Nada mais no site
precisa ser tocado — ele lê esse arquivo automaticamente.

## Passo a passo para adicionar um produto novo

1. Abra o arquivo `lib/products.js` em qualquer editor de texto (recomendo o
   **VS Code**, gratuito: https://code.visualstudio.com)
2. Encontre a lista `products`, que começa assim:
   ```js
   export const products = [
   ```
3. Copie este bloco:
   ```js
   {
     name: 'Nome do produto',
     price: 'R$ 000,00',
     badge: 'NOVO',
     image: '/products/nome-da-foto.jpg',
   },
   ```
4. Cole logo antes da linha `];` que fecha a lista
5. Troque o texto entre aspas:
   - `name`: o nome do produto
   - `price`: sempre como texto, no formato `'R$ 129,90'`
   - `badge`: o selo que aparece no canto da foto. Use um destes:
     `'NOVO'`, `'MAIS VENDIDO'`, `'PROMOÇÃO'`, `'ÚLTIMAS PEÇAS'`
   - `image`: veja a seção "Fotos" abaixo
6. Salve o arquivo

Pronto — o produto já aparece no site na próxima vez que você rodar
`npm run dev` (ou depois do próximo deploy, se o site já estiver publicado).

## Como remover um produto

Apague o bloco inteiro dele (de `{` até `},`) dentro da lista `products`.

## Como editar um produto existente

Só mude o texto entre aspas do produto que quiser (nome, preço, foto).

## Fotos dos produtos

Você tem duas opções:

**Opção 1 — guardar a foto dentro do próprio site (recomendado)**
1. Coloque o arquivo da foto dentro da pasta `public/products/`
   (ex: `public/products/camiseta-logo.jpg`)
2. No campo `image`, use `'/products/camiseta-logo.jpg'`

**Opção 2 — usar um link de imagem da internet**
Cole a URL completa da imagem no campo `image`, ex:
`'https://minhaloja.com/fotos/camiseta.jpg'`

**Dica de tamanho:** fotos verticais, proporção 4:5 (por exemplo 1000x1250
pixels), ficam com o encaixe perfeito nos cards do site. Evite fotos muito
pesadas (acima de 1–2 MB) — elas deixam o site mais lento.

## Categorias

A seção "Encontre o seu estilo" funciona do mesmo jeito, mas na lista
`categories`, no mesmo arquivo. Os campos são: `num` (número, ex: `'01'`),
`name`, `desc` (descrição curta) e `image`.

## Erros comuns

- Esqueceu uma vírgula `,` no final da linha → o site para de funcionar.
  Sempre confira se cada bloco de produto termina com `},`
- Esqueceu uma aspas `'` → mesma coisa. Sempre feche o que abrir.
- Se tiver dúvida, compare com os produtos de exemplo que já estão no
  arquivo — o formato é sempre o mesmo.
