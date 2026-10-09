Eu fiz umas anotações galera, do que eu consegui ouvir pelo menos:
App Wash - Lavador de carro

Visão geral:
- Escopo apenas mobile para o consumidor;
- Para a lavadora será web;
	- composto por um back-end processando as reqs;


Funcionalidades:
- Deve ser possível visualizar: 
	- serviços prestados;
	- disponibilidade de lava-rápidos;
	- preços;

- Categoria de serviços

- Adição de fotos do veículo mostrando seu estado de limpeza atual
	- PO sugere que deve ser feita quando o serviço estiver selecionado;

Persona - Consumidor:
- Mariana, trabakha como full stack, presencial todos os dias, tem que lidar com logísitca e horários ruins;
- Deseja lavar o carro em horário comercial
  - Poucos lava-rápidos disponíveis, pouco intuitivos ou de fácil acesso;

Persona - Dono do lava rápido:
- Equipe pequena, muitos contatos dispersos e pouco confiáveis;
- Necessita de um bom intermediário;

Informações das opções de Lava-rápido:
- Acesso ao maps revelando localização;
- Uso de filtros para escolher a lavadora;
- Menu lateral com drop-down para seleção de veículos por parte das lavadoras 
	- (o consiumdor precisa previamente cadastrar o veículo no sistema, com suas informações importantes)

## Testes automatizados

| Nível | Projeto | O que cobre |
|---|---|---|
| Unitário (sem rede/banco) | backend (`*.unit.test.ts`), fronts | Regras puras: validações, placa, transições de status, "está aberto em data/hora", preço/duração, formatação |
| Integração de API (supertest + Postgres de teste) | backend (`src/test/*.test.ts`) | Cada rota, com os casos dos critérios (sucesso, 400/401/404/409). Nível exigido pela maioria dos critérios "Testes automatizados" |
| Service dos fronts | admin-front, app_mobile | Camada `service` contra `json-server` de teste ou servidor HTTP mínimo |
| Ponta a ponta (só o fluxo principal) | backend (supertest) | I13: pedido criado pelo cliente aparece só no painel do lava-rápido certo |

Sem testes de componente/tela por enquanto.

Como rodar (a partir desta pasta):

- `python3 scripts/test.py --project backend | admin-front | app_mobile` — um projeto; `--project all` roda os três e mostra um resumo.
- `cd backend && npm run test:unit` — só os unitários, sem Docker.
- `npm run test:coverage` em cada projeto — relatório de cobertura em `coverage/` (só relatório, não bloqueia PR).

Convenção: cada critério "Testes automatizados: A, B, C" de uma história vira um `describe` com **um `it` por caso citado, com o mesmo texto**. Detalhes (bancos por worker, factories, helpers de token) em `.specs/backend.specs.md`, seção 6.1.

CI: `.github/workflows/testes.yml` roda lint + testes (com cobertura) + build/typecheck dos três projetos em todo PR e push na `main`.
