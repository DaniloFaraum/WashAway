-- I18: quando o cliente viu a recusa do pedido no app (null = ainda não viu).
ALTER TABLE "Pedido" ADD COLUMN "recusaVistaEm" TIMESTAMP(3);
