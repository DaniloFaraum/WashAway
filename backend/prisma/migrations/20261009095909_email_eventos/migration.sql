-- CreateEnum
CREATE TYPE "StatusEventoEmail" AS ENUM ('pendente', 'enviado', 'erro');

-- CreateEnum
CREATE TYPE "TipoEventoEmail" AS ENUM ('teste');

-- CreateTable
CREATE TABLE "EventoEmail" (
    "id" TEXT NOT NULL,
    "tipo" "TipoEventoEmail" NOT NULL,
    "destinatario" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "status" "StatusEventoEmail" NOT NULL DEFAULT 'pendente',
    "tentativas" INTEGER NOT NULL DEFAULT 0,
    "ultimoErro" TEXT,
    "proximaTentativaEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviadoEm" TIMESTAMP(3),

    CONSTRAINT "EventoEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventoEmail_status_criadoEm_idx" ON "EventoEmail"("status", "criadoEm");
