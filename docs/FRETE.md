# Infraestrutura de frete

O checkout consulta `POST /api/shipping/quotes`. A rota autenticada chama `calculate_customer_shipping`, que lê endereço, produtos e configuração no Supabase. Ao finalizar, o navegador envia apenas o identificador do serviço. A RPC recalcula o valor na mesma transação que valida preços, estoque e cria o pedido.

O contrato em `lib/shipping` representa origem, destino, itens, peso, dimensões, provedor, serviço, preço em centavos, prazo, metadados e erros. O checkout conhece somente cotações normalizadas.

## Fallback manual

O provedor `manual` oferece `manual-standard`, usando apenas configuração administrativa: habilitado, nome, tarifa fixa, limite opcional de frete grátis e prazo opcional. O padrão preserva o comportamento anterior (R$ 0,00, sem prazo inventado). Desabilitado, ele bloqueia a criação do pedido de forma segura.

Configure em **Admin > Configurações > Frete manual**. O pedido guarda provedor, serviço, nome, valor, prazo e metadados.

## Adicionando um provedor externo

### Melhor Envio

Configure `MELHOR_ENVIO_CLIENT_ID`, `MELHOR_ENVIO_CLIENT_SECRET` e `SHIPPING_TOKEN_ENCRYPTION_KEY` somente no servidor. Um administrador acessa `/api/shipping/melhor-envio/authorize`. Tokens OAuth são criptografados antes de persistidos, renovados automaticamente e nunca enviados ao navegador. Cotações externas expiram em 15 minutos e são consumidas uma única vez pela RPC transacional.

1. Implemente `ShippingProvider` em `lib/shipping/providers` e normalize a resposta.
2. Guarde tokens somente no servidor.
3. Adicione timeout, limite de concorrência e erros normalizados à rota agregadora.
4. Recalcule no servidor durante a transação, ou valide uma cotação curta assinada. Nunca aceite preço do navegador.
5. Não persista tokens nem payloads sensíveis.
6. Teste timeout, indisponibilidade, arredondamento, adulteração e idempotência.

O fallback manual não deve se apresentar como cotação de transportadora.
