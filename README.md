# real-time-support-center

![CI](https://github.com/Beckerr11/real-time-support-center/actions/workflows/ci.yml/badge.svg)

Central de suporte em tempo real.

## Objetivo
Este repositorio faz parte de uma trilha de portfolio profissional full stack, com foco em simplicidade, clareza e boas praticas.

## Stack
Node.js, SSE, fila de atendimento e SLA

## Funcionalidades implementadas
- Fluxo de conversa cliente-operador
- Fila com calculo de SLA e overdue
- Eventos em tempo real via SSE
- Notificador webhook opcional

## Como executar
~~~bash
npm ci
npm test
npm run dev
~~~

## Scripts uteis
- npm run dev, npm test

## Qualidade
- CI em .github/workflows/ci.yml
- Dependabot em .github/dependabot.yml
- Testes locais obrigatorios antes de merge

## Documentacao
- [Roadmap](docs/ROADMAP.md)
- [Checklist de producao](docs/PRODUCTION-CHECKLIST.md)
- [Contribuicao](CONTRIBUTING.md)
- [Seguranca](SECURITY.md)

## Status
- [x] Scaffold inicial
- [x] Base funcional com testes
- [ ] Deploy publico com observabilidade completa
- [ ] Versao 1.0.0 com demo publica
