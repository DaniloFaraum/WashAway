-- CreateEnum
CREATE TYPE "SolicitacaoStatus" AS ENUM ('aguardando_contrato', 'concluida');

-- CreateTable
CREATE TABLE "Contrato" (
    "id" TEXT NOT NULL,
    "versao" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "conteudo" TEXT NOT NULL,
    "vigente" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoOnboarding" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "cnpj" TEXT NOT NULL,
    "status" "SolicitacaoStatus" NOT NULL DEFAULT 'aguardando_contrato',
    "contratoId" TEXT NOT NULL,
    "aceitoEm" TIMESTAMP(3),
    "lavaRapidoId" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoOnboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contrato_versao_key" ON "Contrato"("versao");

-- CreateIndex
CREATE UNIQUE INDEX "SolicitacaoOnboarding_lavaRapidoId_key" ON "SolicitacaoOnboarding"("lavaRapidoId");

-- AddForeignKey
ALTER TABLE "SolicitacaoOnboarding" ADD CONSTRAINT "SolicitacaoOnboarding_contratoId_fkey" FOREIGN KEY ("contratoId") REFERENCES "Contrato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
