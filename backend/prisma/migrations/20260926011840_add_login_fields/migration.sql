-- Dados existentes (5 lava-rápidos de seed) não têm cnpj/senha e a migration
-- via CLI é interativa (bloqueada neste ambiente não-interativo); como é só
-- dado mockado de dev/teste, limpamos e o `prisma:seed` repopula com
-- cnpj/senha reais em seguida.
DELETE FROM "Pedido";
DELETE FROM "LavaRapido";

-- AlterTable
ALTER TABLE "LavaRapido" ADD COLUMN "address" TEXT;
ALTER TABLE "LavaRapido" ADD COLUMN "cnpj" TEXT NOT NULL;
ALTER TABLE "LavaRapido" ADD COLUMN "senha" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LavaRapido_cnpj_key" ON "LavaRapido"("cnpj");
