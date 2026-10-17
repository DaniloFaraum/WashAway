-- i17-interno-exclusao: usuários internos, solicitação de exclusão de empresa
-- e os tipos de e-mail do fluxo. Só acrescenta (não apaga nada).

-- AlterEnum
ALTER TYPE "TipoEventoEmail" ADD VALUE 'exclusao_solicitada';
ALTER TYPE "TipoEventoEmail" ADD VALUE 'exclusao_aprovada';
ALTER TYPE "TipoEventoEmail" ADD VALUE 'exclusao_recusada';

-- CreateEnum
CREATE TYPE "StatusSolicitacaoExclusao" AS ENUM ('pendente', 'aprovada', 'recusada', 'cancelada');

-- CreateTable
CREATE TABLE "UsuarioInterno" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "permissoes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsuarioInterno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SolicitacaoExclusao" (
    "id" TEXT NOT NULL,
    "lavaRapidoId" TEXT,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "email" TEXT,
    "motivo" TEXT,
    "status" "StatusSolicitacaoExclusao" NOT NULL DEFAULT 'pendente',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decididoEm" TIMESTAMP(3),
    "decididoPorId" TEXT,
    "observacao" TEXT,

    CONSTRAINT "SolicitacaoExclusao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UsuarioInterno_email_key" ON "UsuarioInterno"("email");

-- CreateIndex
CREATE INDEX "SolicitacaoExclusao_lavaRapidoId_status_idx" ON "SolicitacaoExclusao"("lavaRapidoId", "status");

-- CreateIndex
CREATE INDEX "SolicitacaoExclusao_status_criadoEm_idx" ON "SolicitacaoExclusao"("status", "criadoEm");

-- AddForeignKey
ALTER TABLE "SolicitacaoExclusao" ADD CONSTRAINT "SolicitacaoExclusao_lavaRapidoId_fkey" FOREIGN KEY ("lavaRapidoId") REFERENCES "LavaRapido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoExclusao" ADD CONSTRAINT "SolicitacaoExclusao_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "UsuarioInterno"("id") ON DELETE SET NULL ON UPDATE CASCADE;
