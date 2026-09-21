import { ServiceDetail, ServiceDetailScreen } from './detail';

const lavagemExternaService: ServiceDetail = {
  title: 'Lavagem Externa',
  price: '60,00',
  premiumPrice: '85,00',
  time: '25 min',
  image: 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?w=800',
  description:
    'Lavagem cuidadosa de toda a parte externa do veículo, incluindo lataria, rodas e pneus, finalizada com aplicação de cera para realçar o brilho e proteger a pintura.',
  includedItems: [
    'Lavagem da lataria com shampoo neutro',
    'Limpeza das rodas e caixas de roda',
    'Aplicação de pretinho nos pneus',
    'Secagem com toalha de microfibra',
    'Aplicação de cera líquida protetora',
  ],
  standardTitle: 'Lavagem com Cera',
  standardSubtitle: 'Cera líquida para brilho e proteção',
  premiumTitle: 'Adicionar Cera Premium',
  premiumSubtitle: 'Proteção reforçada e brilho prolongado',
  premiumSurcharge: '25,00',
};

export default function LavagemExternaScreen() {
  return <ServiceDetailScreen service={lavagemExternaService} />;
}
