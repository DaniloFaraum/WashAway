-- I13 (i13-confirmacao-agendamento): pedido com cliente, veículo e vários
-- serviços congelados (PedidoServico), total e duração calculados no servidor.
--
-- Converte os pedidos existentes SEM APAGAR NENHUM (decisão D1+D2 do plano):
-- - para cada placa distinta dos pedidos antigos cria (ou reaproveita) um
--   Cliente "Cliente de pedido antigo" (e-mail técnico, senha que ninguém
--   conhece) e um Veiculo com o modelo/placa do JSON antigo;
-- - cada pedido antigo ganha um PedidoServico com o nome do serviço antigo; o
--   preço e a duração vêm do Servico de mesmo nome do lava-rápido, quando
--   existir (senão 0);
-- - só depois as colunas antigas `veiculo` (JSON) e `servico` (texto) saem.

-- 1. Colunas novas (opcionais até a conversão) e tabela de itens
ALTER TABLE "Pedido"
  ADD COLUMN "clienteId" TEXT,
  ADD COLUMN "veiculoId" TEXT,
  ADD COLUMN "precoTotal" DOUBLE PRECISION,
  ADD COLUMN "duracaoMinutos" INTEGER,
  ADD COLUMN "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE "PedidoServico" (
    "id" TEXT NOT NULL,
    "pedidoId" TEXT NOT NULL,
    "servicoId" TEXT,
    "nome" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "duracaoMinutos" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PedidoServico_pkey" PRIMARY KEY ("id")
);

-- 2. Conversão dos pedidos antigos
-- Placa normalizada como no I3 (só letras/dígitos, maiúsculas); pedido sem
-- placa ganha uma placa técnica própria (não junta pedidos sem placa).
CREATE TABLE "_i13_pedido_legado" AS
SELECT
  p."id" AS pedido_id,
  COALESCE(
    NULLIF(upper(regexp_replace(COALESCE(p."veiculo"->>'placa', ''), '[^A-Za-z0-9]', '', 'g')), ''),
    'SEMPLACA' || upper(substr(md5(p."id"), 1, 8))
  ) AS placa,
  COALESCE(NULLIF(btrim(p."veiculo"->>'modelo'), ''), 'Veículo não informado') AS modelo
FROM "Pedido" p;

-- Senha: hash bcrypt de um segredo aleatório descartado — ninguém entra com estas contas.
INSERT INTO "Cliente" ("id", "nome", "email", "senha", "criadoEm")
SELECT DISTINCT
  'legado_cli_' || md5(l.placa),
  'Cliente de pedido antigo',
  'pedido-antigo-' || lower(l.placa) || '@legado.washaway.local',
  '$2b$10$lZfbrpLyLKovxCb7vf0PyupMeYWKiwrHR/i68HH0KFbc0dY/XkpkW',
  CURRENT_TIMESTAMP
FROM "_i13_pedido_legado" l
ON CONFLICT ("email") DO NOTHING;

INSERT INTO "Veiculo" ("id", "clienteId", "marca", "modelo", "cor", "placa", "criadoEm")
SELECT
  'legado_vei_' || md5(v.placa),
  c."id",
  NULL,
  v.modelo,
  'Não informada',
  v.placa,
  CURRENT_TIMESTAMP
FROM (
  SELECT placa, min(modelo) AS modelo FROM "_i13_pedido_legado" GROUP BY placa
) v
JOIN "Cliente" c ON c."email" = 'pedido-antigo-' || lower(v.placa) || '@legado.washaway.local'
ON CONFLICT ("clienteId", "placa") DO NOTHING;

UPDATE "Pedido" p
SET "clienteId" = c."id", "veiculoId" = ve."id"
FROM "_i13_pedido_legado" l
JOIN "Cliente" c ON c."email" = 'pedido-antigo-' || lower(l.placa) || '@legado.washaway.local'
JOIN "Veiculo" ve ON ve."clienteId" = c."id" AND ve."placa" = l.placa
WHERE p."id" = l.pedido_id;

-- Um item por pedido antigo; preço/duração do Servico de mesmo nome (se houver).
INSERT INTO "PedidoServico" ("id", "pedidoId", "servicoId", "nome", "preco", "duracaoMinutos", "ordem")
SELECT
  'legado_ps_' || md5(p."id"),
  p."id",
  s."id",
  p."servico",
  COALESCE(s."preco", 0),
  COALESCE(s.duracao, 0),
  0
FROM "Pedido" p
LEFT JOIN LATERAL (
  SELECT sv."id", sv."preco",
    (SELECT COALESCE(sum(i."duracaoMinutos"), 0)::INTEGER
       FROM "ServicoItem" si JOIN "ItemServico" i ON i."id" = si."itemId"
      WHERE si."servicoId" = sv."id") AS duracao
  FROM "Servico" sv
  WHERE sv."lavaRapidoId" = p."lavaRapidoId" AND sv."nome" = p."servico"
  ORDER BY sv."ativo" DESC, sv."id"
  LIMIT 1
) s ON TRUE;

UPDATE "Pedido" p
SET "precoTotal" = ps."preco", "duracaoMinutos" = ps."duracaoMinutos"
FROM "PedidoServico" ps
WHERE ps."pedidoId" = p."id";

DROP TABLE "_i13_pedido_legado";

-- 3. Formato novo obrigatório; colunas antigas saem (já convertidas)
ALTER TABLE "Pedido"
  ALTER COLUMN "clienteId" SET NOT NULL,
  ALTER COLUMN "veiculoId" SET NOT NULL,
  ALTER COLUMN "precoTotal" SET NOT NULL,
  ALTER COLUMN "duracaoMinutos" SET NOT NULL,
  DROP COLUMN "veiculo",
  DROP COLUMN "servico";

-- CreateIndex
CREATE INDEX "Pedido_lavaRapidoId_horario_idx" ON "Pedido"("lavaRapidoId", "horario");

-- CreateIndex
CREATE INDEX "Pedido_clienteId_idx" ON "Pedido"("clienteId");

-- CreateIndex
CREATE INDEX "PedidoServico_pedidoId_idx" ON "PedidoServico"("pedidoId");

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "Veiculo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoServico" ADD CONSTRAINT "PedidoServico_pedidoId_fkey" FOREIGN KEY ("pedidoId") REFERENCES "Pedido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PedidoServico" ADD CONSTRAINT "PedidoServico_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE SET NULL ON UPDATE CASCADE;
