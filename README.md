# Real-Time Support Center

![CI](https://github.com/Beckerr11/real-time-support-center/actions/workflows/ci.yml/badge.svg)

Backend Node.js para demonstrar os elementos centrais de uma fila de atendimento: **conversas, atribuição de operador, SLA e eventos em tempo real via Server-Sent Events (SSE)**.

O projeto mantém o domínio em memória para deixar os fluxos fáceis de executar e testar sem banco ou broker externo.

## Fluxos implementados

- criação de conversa por cliente;
- prioridades `urgent`, `high`, `normal` e `low` com deadline de SLA calculado;
- atribuição de operador;
- mensagens com papel `client` ou `operator`;
- estados `new`, `open`, `waiting` e `resolved`;
- reabertura para `waiting` quando um cliente responde a uma conversa resolvida;
- filtros por status e operador;
- snapshot de fila com indicador `overdue`;
- stream SSE em `/events`;
- publicação de eventos de criação, atribuição, mensagem e mudança de status;
- integração de notifier injetável com fallback noop;
- limite de 1 MB para payload JSON;
- health check.

## Modelo de SLA

O deadline é calculado na criação da conversa:

```text
urgent → 30 min
high   → 120 min
normal → 480 min
low    → 1440 min
```

O endpoint de fila compara `slaDueAt` com o horário atual para marcar itens vencidos.

## API principal

```text
GET   /health
GET   /events
POST  /conversations
GET   /conversations
GET   /queue
PATCH /conversations/:id/assign
POST  /conversations/:id/messages
PATCH /conversations/:id/status
```

## Tempo real

`GET /events` mantém uma conexão `text/event-stream` e recebe eventos publicados pelo hub local.

```text
HTTP mutation
    ↓
domain update
    ↓
SSE hub ─────→ connected clients
    ↓
optional notifier
```

## Executando

```bash
npm ci
npm test
npm run dev
```

## Limites atuais

Este é um case study de domínio + realtime, não uma central de atendimento pronta para produção.

- conversas ficam em memória;
- não há autenticação/autorização;
- SSE vive em um único processo e não é distribuído entre réplicas;
- não existe histórico durável/auditoria;
- o notifier padrão não envia webhooks reais;
- SLA é uma regra local simples, sem calendário comercial/feriados;
- não há anexos, busca full-text ou controle de concorrência.

## Evolução natural

- persistência transacional;
- autenticação e RBAC;
- event broker/pub-sub para múltiplas instâncias;
- reconnect/resume de eventos;
- histórico auditável;
- calendário de SLA;
- webhooks com retries/idempotência;
- métricas de tempo de primeira resposta e resolução;
- dashboard operacional.

## Qualidade

- testes automatizados com o runner do Node.js;
- GitHub Actions CI;
- Dependabot;
- documentação de deploy, segurança e checklist de produção.

## Autor

**Douglas Silva**  
[GitHub](https://github.com/Beckerr11) · [Portfólio](https://douglasdev.tech)
