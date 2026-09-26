-- CreateTable
CREATE TABLE "Servico" (
    "id" TEXT NOT NULL,
    "lavaRapidoId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Servico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intercorrencia" (
    "id" TEXT NOT NULL,
    "lavaRapidoId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "diaInteiro" BOOLEAN NOT NULL DEFAULT true,
    "horaInicio" TEXT,
    "horaFim" TEXT,

    CONSTRAINT "Intercorrencia_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_lavaRapidoId_fkey" FOREIGN KEY ("lavaRapidoId") REFERENCES "LavaRapido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intercorrencia" ADD CONSTRAINT "Intercorrencia_lavaRapidoId_fkey" FOREIGN KEY ("lavaRapidoId") REFERENCES "LavaRapido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
