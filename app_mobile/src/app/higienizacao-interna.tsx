import { ServiceDetail, ServiceDetailScreen } from './detail';

const higienizacaoInternaService: ServiceDetail = {
  title: 'Higienização Interna',
  price: '80,00',
  premiumPrice: '110,00',
  time: '30 min',
  image:
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQx6RA5P0_G-6ZvW_sywJOQgG0sTZzEjPNkMyWjAgMib8TKu1_xRXRJWyuT&s=10',
  description:
    'Limpeza profunda do interior do veículo, com aspiração completa e higienização dos bancos, carpetes, painel, portas e demais superfícies internas.',
  includedItems: [
    'Aspiração dos bancos, carpetes e porta-malas',
    'Higienização detalhada dos bancos',
    'Limpeza do painel, console e portas',
    'Limpeza interna dos vidros',
    'Neutralização de odores',
  ],
  standardTitle: 'Higienização Padrão',
  standardSubtitle: 'Limpeza completa das superfícies internas',
  premiumTitle: 'Adicionar Proteção de Tecidos',
  premiumSubtitle: 'Proteção contra líquidos e sujeiras',
  premiumSurcharge: '30,00',
};

export default function HigienizacaoInternaScreen() {
  return <ServiceDetailScreen service={higienizacaoInternaService} />;
}
