-- Servico vira combo de itens do catálogo; os existentes são só dado de
-- seed/dev (Pedido guarda o nome como string, sem FK), então são apagados
-- e recriados pelo seed já com itens.
DELETE FROM "Servico";

-- AlterTable
ALTER TABLE "Servico" DROP COLUMN "categoria";

-- CreateTable
CREATE TABLE "ItemServico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ItemServico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicoItem" (
    "servicoId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ServicoItem_pkey" PRIMARY KEY ("servicoId","itemId")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemServico_nome_key" ON "ItemServico"("nome");

-- AddForeignKey
ALTER TABLE "ServicoItem" ADD CONSTRAINT "ServicoItem_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicoItem" ADD CONSTRAINT "ServicoItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemServico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
