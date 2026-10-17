-- I15: aceite/recusa de pedido. Só acrescenta (não altera dados existentes).
ALTER TYPE "PedidoStatus" ADD VALUE IF NOT EXISTS 'aceito' BEFORE 'em_andamento';
ALTER TYPE "PedidoStatus" ADD VALUE IF NOT EXISTS 'recusado' BEFORE 'em_andamento';

ALTER TABLE "Pedido" ADD COLUMN "statusAlteradoEm" TIMESTAMP(3),
ADD COLUMN "motivoRecusa" TEXT;
