# Guia: domínio e hospedagem (do zero)

## Primeiro, entendendo os dois conceitos

- **Hospedagem** é o "computador" que fica com o site ligado 24h, mostrando
  ele pra quem acessar. Vamos usar a **Vercel** — é gratuita para um site
  como o seu e foi feita pela mesma empresa que criou o Next.js (a
  tecnologia usada no site).
- **Domínio** é o endereço, tipo `brosstore.com.br`. É opcional no começo:
  a Vercel já te dá um endereço gratuito (tipo `bros-store.vercel.app`) pra
  você já sair vendendo. Depois, quando quiser, você liga um domínio
  próprio nele.

Ou seja: dá pra publicar **hoje, de graça, sem comprar nada**, e comprar o
domínio depois com calma.

---

## Parte 1 — Publicar o site de graça na Vercel

### Passo 1: subir o projeto pro GitHub

Você já tem o repositório: https://github.com/Brosstore/bros-store-site
Envie os arquivos atualizados que eu te entreguei para esse repositório
(pode ser pela interface do próprio GitHub, arrastando os arquivos, ou por
`git push` se você usa o Git no computador).

### Passo 2: criar conta na Vercel

1. Acesse **vercel.com**
2. Clique em **Sign Up**
3. Escolha **Continue with GitHub** — assim a Vercel já conecta direto com
   sua conta do GitHub, sem precisar criar senha nova

### Passo 3: importar o projeto

1. No painel da Vercel, clique em **Add New Project**
2. Escolha o repositório **bros-store-site**
3. A Vercel já reconhece automaticamente que é um projeto Next.js — não
   precisa mudar nenhuma configuração
4. Clique em **Deploy**

Em menos de 2 minutos o site estará no ar, em um endereço parecido com
`https://bros-store-site.vercel.app`.

### Passo 4: deploy automático

A partir de agora, toda vez que você atualizar o código no GitHub (por
exemplo, depois de adicionar um produto novo seguindo o `GUIA-PRODUTOS.md`),
a Vercel republica o site sozinha, automaticamente, em menos de um minuto.
Você não precisa fazer mais nada manualmente.

---

## Parte 2 — Comprar um domínio próprio (quando quiser)

### Onde comprar

Para domínios `.com.br`, o mais barato e confiável é comprar direto na
fonte oficial: **registro.br** — custa **R$ 40 por ano**, sem pegadinha de
preço que sobe na renovação (algumas registradoras cobram barato no
primeiro ano e caro depois — o registro.br não faz isso).

1. Acesse **registro.br**
2. Pesquise o nome que você quer, ex: `brosstore.com.br`
3. Se estiver disponível, siga o cadastro (você vai precisar de CPF ou
   CNPJ)
4. Finalize o pagamento

### Ligando o domínio ao site na Vercel

1. No painel da Vercel, abra seu projeto → **Settings** → **Domains**
2. Digite seu domínio (ex: `brosstore.com.br`) e clique em **Add**
3. A Vercel vai te mostrar 1 ou 2 registros de DNS para configurar
   (geralmente um registro do tipo "A" ou "CNAME")
4. Volte no painel do **registro.br**, vá em **DNS** do seu domínio, e
   cadastre exatamente os valores que a Vercel te mostrou
5. Pode levar de alguns minutos até algumas horas para o domínio começar a
   funcionar (é normal, chama-se "propagação de DNS")

Depois disso, `brosstore.com.br` vai abrir o mesmo site que está na
Vercel — e continua tudo gratuito, você só paga a renovação anual do
domínio.

### E-mail profissional (opcional)

Depois que o domínio estiver seu, dá pra criar um e-mail do tipo
`contato@brosstore.com.br` em vez de usar o Gmail. Isso passa mais
credibilidade pros clientes. Provedores como Google Workspace ou Zoho Mail
oferecem isso por uma mensalidade — não é obrigatório pra começar a
vender, é uma melhoria pra depois.

---

## Resumo rápido

| O que | Custo | Quando fazer |
|---|---|---|
| Publicar na Vercel | Grátis | Agora, antes de tudo |
| Domínio `.com.br` | R$ 40/ano | Quando quiser um endereço próprio |
| E-mail profissional | Varia (opcional) | Mais pra frente, se quiser |
