-- i17-senha-gerada: senha temporária enviada por e-mail + tipos de e-mail.
-- Só acrescenta (não apaga nada).

-- AlterEnum
ALTER TYPE "TipoEventoEmail" ADD VALUE 'senha_gerada';
ALTER TYPE "TipoEventoEmail" ADD VALUE 'esqueci_senha';

-- AlterTable
ALTER TABLE "LavaRapido" ADD COLUMN "senhaGerada" TEXT;
