# Release candidate v1.0.1 — Bros Store

Data da auditoria: 4 de agosto de 2026.

## Resultado

Release candidate aprovado para publicação, condicionado apenas à conclusão do
deploy principal e à validação HTTP posterior ao deploy.

## Correções incluídas

- Atualização do Next.js e substituição segura de dependências transitivas
  vulneráveis; `npm audit --omit=dev` passou sem vulnerabilidades.
- Cabeçalhos globais de proteção, remoção do cabeçalho de identificação do
  framework e política restritiva de recursos do navegador.
- Exclusão de rotas privadas, transacionais e de API do rastreamento por robôs.
- Manifesto web válido para eliminar a resposta 404 do recurso declarado no HTML.
- Restauração de cabeçalho, rodapé e atalhos globais nas páginas de produto.
- Preservação do destino seguro entre cadastro/login e checkout.
- Links institucionais completos no rodapé.

## Evidências verificadas

- Branch `main` alinhada com `origin/main` antes das correções.
- Lint sem avisos ou erros.
- Testes automatizados do webhook Mercado Pago: 7 de 7 aprovados.
- Typecheck sem erros.
- Build de produção concluído.
- Catálogo com 24 itens, busca e filtros funcionais no navegador.
- Metadados, canonical, imagens com texto alternativo e controles com nome acessível.
- Todas as 21 migrations locais alinhadas com produção; nenhuma migration nova.
- Logs Vercel dos últimos sete dias sem erros de aplicação ou respostas 5xx.

## Segurança e dados

Nenhum segredo foi adicionado ao Git. Não foram usados pagamentos reais, não
houve alteração manual de estoque e nenhuma informação financeira foi modificada.
RLS, grants e RPCs de pagamento permanecem conforme as migrations aplicadas; a
escrita de pedidos continua restrita às RPCs validadas e a sincronização do
Mercado Pago continua exclusiva do `service_role`.

## Pendências reais

- Autenticação completa, painel administrativo e checkout autenticado dependem
  de contas de teste válidas. Nesta auditoria foram validadas as proteções e os
  redirecionamentos sem enviar credenciais ou gerar pagamento.
- Core Web Vitals de campo exigem tráfego real; o build mostra bundle inicial da
  Home em torno de 232 kB e não revelou regressão bloqueadora.
- O teste de pagamento ponta a ponta aprovado na auditoria anterior não foi
  repetido para evitar criar nova operação financeira sem necessidade.
