# Operação de produção — Bros Store

## Ambientes e domínio

- Produção: `https://bros-store-site.vercel.app` (domínio gratuito da Vercel).
- O projeto Vercel deve permanecer ligado ao repositório `Brosstore/bros-store-site`, branch `main`.
- Não é necessário contratar domínio, Analytics pago ou monitoramento externo para operar esta versão.

## Variáveis obrigatórias

Configure na Vercel, nos ambientes que realmente as utilizam, sem copiar valores para o Git:

| Variável | Exposição | Finalidade |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | pública | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | chave pública protegida por RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | webhook e persistência privilegiada |
| `MERCADO_PAGO_ENVIRONMENT` | servidor | `test` ou `production`; deve corresponder às credenciais |
| `MERCADO_PAGO_ACCESS_TOKEN` | servidor | consulta/criação no Mercado Pago |
| `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` | pública | SDK/checkout do Mercado Pago |
| `MERCADO_PAGO_WEBHOOK_SECRET` | servidor | validação HMAC do webhook |
| `NEXT_PUBLIC_SITE_URL` | pública | `https://bros-store-site.vercel.app` |
| `CATALOG_PROVIDER` | servidor | normalmente `supabase` em produção |

Nunca prefixe `SUPABASE_SERVICE_ROLE_KEY`, `MERCADO_PAGO_ACCESS_TOKEN` ou
`MERCADO_PAGO_WEBHOOK_SECRET` com `NEXT_PUBLIC_`. Após trocar um segredo, faça novo
deploy e revogue imediatamente o valor anterior no provedor.

`NEXT_PUBLIC_MP_PUBLIC_KEY` é aceito temporariamente como nome legado. Não configure
os dois nomes com valores diferentes. Toda configuração nova deve usar somente
`NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY`.

### Troca da conta do Mercado Pago

1. Na nova conta, crie ou selecione a aplicação que receberá os pagamentos.
2. Copie o Access Token e a Public Key do mesmo ambiente e da mesma aplicação.
3. Na Vercel, atualize `MERCADO_PAGO_ACCESS_TOKEN`,
   `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` e `MERCADO_PAGO_ENVIRONMENT` em Production.
4. Gere/consulte a assinatura secreta do webhook da nova aplicação e atualize
   `MERCADO_PAGO_WEBHOOK_SECRET` na Vercel.
5. No painel do Mercado Pago, cadastre a URL
   `https://bros-store-site.vercel.app/api/mercado-pago/webhook` para pagamentos.
6. Confirme que `NEXT_PUBLIC_SITE_URL` continua sendo
   `https://bros-store-site.vercel.app` e faça um novo deploy de Production.
7. Valide primeiro com credenciais `TEST-*` e comprador de teste. Para ativar
   cobranças reais, troque o par completo para `APP_USR-*`, altere o ambiente para
   `production`, faça novo deploy e então realize uma compra real de baixo valor.
8. Depois da validação, revogue as credenciais antigas no Mercado Pago.

O servidor rejeita configuração ausente, formatos desconhecidos, nomes público
atual/legado divergentes e qualquer mistura entre credenciais de teste e produção.
Os erros registram apenas um código de configuração, nunca os valores.

## Deploy

1. Confirme `git status` e inclua somente arquivos da mudança pretendida.
2. Rode `npm test`, `npm run lint` e `npm run build`.
3. Confira migrations pendentes com `npx supabase migration list --linked`.
4. Aplique migrations com `npx supabase db push --linked` antes do deploy que depende delas.
5. Envie a branch `main` e acompanhe `npx vercel ls bros-store-site` até `Ready`.
6. Valide a página inicial, checkout e o endpoint de webhook no domínio gratuito principal.

## Gate de release candidate

Antes de promover uma versão para produção:

1. Execute `npm audit --omit=dev` e não aceite vulnerabilidades altas ou críticas.
2. Execute `npm run lint`, `npm test`, `npx tsc --noEmit` e `npm run build`.
3. Confirme manualmente, sem criar transações financeiras reais, a Home, catálogo, busca, filtros, produto, carrinho e redirecionamento do checkout para login.
4. Confirme `robots.txt`, `sitemap.xml`, `manifest.webmanifest` e os cabeçalhos de segurança.
5. Consulte erros e respostas 5xx recentes nos logs de produção da Vercel.
6. Confirme que migrations locais e remotas estão alinhadas antes de qualquer `db push`.

Os cabeçalhos globais esperados incluem `X-Content-Type-Options: nosniff`,
`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` e
`Cross-Origin-Opener-Policy`. Rotas de autenticação, conta, checkout, API e
administração não devem ser indexadas.

## Pagamentos e webhook

- A preferência grava o UUID do pedido em `external_reference`.
- O webhook aceita somente notificação assinada, consulta o pagamento na API do
  Mercado Pago e chama `sync_mercado_pago_payment` como `service_role`.
- Sucesso esperado: `payment_attempts.status = approved`, `status_detail` e
  `last_synced_at` preenchidos; `orders.payment_status = aprovado` e
  `orders.status = confirmado`.
- Notificações repetidas são idempotentes. A sincronização não altera estoque.
- Para teste, use exclusivamente credenciais `TEST-*`, comprador/cartão de teste e
  `sandbox_init_point`. Nunca use credencial de produção para um teste automatizado.
- A seleção de `sandbox_init_point` ou `init_point` é feita no servidor a partir de
  `MERCADO_PAGO_ENVIRONMENT`; o navegador não lê tokens, segredo ou ambiente.

### Diagnóstico

Use Vercel Logs no plano gratuito, filtrando por `Mercado Pago webhook` ou
`Mercado Pago:`. Os registros contêm operação, código técnico limitado e ID do
pagamento; não devem conter token, segredo, chave, payload integral, endereço ou
dados do cartão. Respostas 5xx fazem o Mercado Pago tentar novamente; 401 indica
assinatura inválida e 422 indica pagamento sem dados de reconciliação.

Sentry não é necessário nesta versão. Reavalie apenas se a retenção/pesquisa dos
logs gratuitos deixar de atender à operação; só então configure uma conta e DSN real.

## Reconciliação excepcional

A reconciliação não faz parte do fluxo normal. Primeiro execute apenas o dry-run:

```powershell
npm run reconcile:mercado-pago -- --payment-id=ID
```

Confirme ID, referência, pedido e valor. Somente com autorização operacional explícita:

```powershell
npm run reconcile:mercado-pago -- --apply --payment-id=ID
```

## Backup lógico e restauração

As migrations versionadas em `supabase/migrations` são o backup lógico do schema.
O arquivo `supabase/backups/v1.0.0/migrations.sha256` registra exatamente o conjunto
aprovado na versão. Ele não contém dados pessoais nem segredos.

Para restaurar em um projeto Supabase vazio:

1. Crie um projeto de recuperação e guarde as novas chaves fora do Git.
2. Valide os hashes com `Get-FileHash supabase/migrations/*.sql -Algorithm SHA256`.
3. Vincule o CLI ao projeto de recuperação e rode `npx supabase db push --linked`.
4. Recrie manualmente usuários, configurações e dados a partir de um backup de dados
   autorizado e criptografado; dados de produção não fazem parte deste repositório.
5. Configure variáveis no novo projeto Vercel e valide tudo em Preview antes de trocar produção.

Para um snapshot adicional, execute `npx supabase db dump --linked --schema public`
em uma estação com Docker Desktop. Armazene o dump fora do Git se ele incluir dados.

## Checklist diário e de incidente

- Deployment principal `Ready` e página inicial respondendo.
- Nenhum aumento anormal de 401/422/5xx no webhook.
- Pagamentos aprovados atualizando pedidos automaticamente.
- Migrations local/remoto alinhadas.
- Segredos somente nos provedores e no `.env.local` ignorado.
- Em incidente: preserve logs, suspenda apenas o método afetado, rotacione o segredo
  comprometido, faça redeploy e use reconciliação somente após conferir os valores.
