-- CreateTable
CREATE TABLE "HorarioFuncionamento" (
    "id" TEXT NOT NULL,
    "lavaRapidoId" TEXT NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "fechado" BOOLEAN NOT NULL DEFAULT false,
    "abertura" TEXT,
    "fechamento" TEXT,

    CONSTRAINT "HorarioFuncionamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HorarioFuncionamento_lavaRapidoId_diaSemana_key" ON "HorarioFuncionamento"("lavaRapidoId", "diaSemana");

-- AddForeignKey
ALTER TABLE "HorarioFuncionamento" ADD CONSTRAINT "HorarioFuncionamento_lavaRapidoId_fkey" FOREIGN KEY ("lavaRapidoId") REFERENCES "LavaRapido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
