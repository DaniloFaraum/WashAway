-- DropForeignKey
ALTER TABLE "Pedido" DROP CONSTRAINT "Pedido_lavaRapidoId_fkey";
ALTER TABLE "Servico" DROP CONSTRAINT "Servico_lavaRapidoId_fkey";
ALTER TABLE "Intercorrencia" DROP CONSTRAINT "Intercorrencia_lavaRapidoId_fkey";

-- AddForeignKey (ON DELETE CASCADE)
ALTER TABLE "Pedido" ADD CONSTRAINT "Pedido_lavaRapidoId_fkey" FOREIGN KEY ("lavaRapidoId") REFERENCES "LavaRapido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Servico" ADD CONSTRAINT "Servico_lavaRapidoId_fkey" FOREIGN KEY ("lavaRapidoId") REFERENCES "LavaRapido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Intercorrencia" ADD CONSTRAINT "Intercorrencia_lavaRapidoId_fkey" FOREIGN KEY ("lavaRapidoId") REFERENCES "LavaRapido"("id") ON DELETE CASCADE ON UPDATE CASCADE;
