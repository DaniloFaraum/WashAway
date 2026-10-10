-- AlterTable
ALTER TABLE "LavaRapido" ADD COLUMN     "email" TEXT;

-- AlterTable
ALTER TABLE "SolicitacaoOnboarding" ADD COLUMN     "email" TEXT,
ADD COLUMN     "senhaHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "LavaRapido_email_key" ON "LavaRapido"("email");

