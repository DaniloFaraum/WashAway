-- Default temporário só para preencher linhas já existentes; o seed define o valor real de cada item.
ALTER TABLE "ItemServico" ADD COLUMN "duracaoMinutos" INTEGER NOT NULL DEFAULT 15;
ALTER TABLE "ItemServico" ALTER COLUMN "duracaoMinutos" DROP DEFAULT;
