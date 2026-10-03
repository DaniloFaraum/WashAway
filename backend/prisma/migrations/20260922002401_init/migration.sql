-- CreateEnum
CREATE TYPE "PedidoStatus" AS ENUM ('pendente', 'em_andamento', 'concluido');

-- CreateTable
CREATE TABLE "LavaRapido" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewsCount" INTEGER NOT NULL DEFAULT 0,
    "distance" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "isOpen" BOOLEAN NOT NULL DEFAULT true,
    "image" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "LavaRapido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pedido" (
    "id" TEXT NOT NULL,
    "lavaRapidoId" TEXT NOT NULL,
    "veiculo" JSONB NOT NULL,
    "servico" TEXT NOT NULL,
    "horario" TIMESTAMP(3) NOT NULL,
    "status" "PedidoStatus" NOT NULL DEFAULT 'pendente',
    "fotos" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "Pedido_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_lavaRapidoId_fkey" FOREIGN KEY ("lavaRapidoId") REFERENCES "LavaRapido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
