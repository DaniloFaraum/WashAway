/**
 * @typedef {Object} Veiculo
 * @property {string | null} marca
 * @property {string} modelo
 * @property {string} cor
 * @property {string} placa
 */

/**
 * Serviço comprado no pedido (I13): nome e preço do momento da compra.
 * `preco` é `null` só em pedido no formato antigo (texto único).
 * @typedef {Object} ServicoDoPedido
 * @property {string} nome
 * @property {number | null} preco
 */

/**
 * @typedef {Object} Pedido
 * @property {string} id
 * @property {{ nome: string } | null} cliente
 * @property {Veiculo} veiculo
 * @property {ServicoDoPedido[]} servicos
 * @property {number | null} precoTotal
 * @property {number | null} duracaoMinutos
 * @property {string} horario
 * @property {'pendente' | 'em_andamento' | 'concluido'} status
 * @property {string[]} fotos
 */

/**
 * @param {string} horario
 * @returns {string}
 */
export function formatarHorario(horario) {
  return new Date(horario).toLocaleString('pt-BR')
}

/**
 * 110.5 → "R$ 110,50"; `null` (pedido antigo sem preço) → "—".
 * @param {number | null} valor
 * @returns {string}
 */
export function formatarPreco(valor) {
  return valor == null ? '—' : `R$ ${valor.toFixed(2).replace('.', ',')}`
}

/**
 * "Fiat Argo — ABC1D23" (marca opcional).
 * @param {Veiculo} veiculo
 * @returns {string}
 */
export function descreverVeiculo(veiculo) {
  const nome = [veiculo.marca, veiculo.modelo].filter(Boolean).join(' ')
  return veiculo.placa ? `${nome} — ${veiculo.placa}` : nome
}

export const PEDIDO_STATUS = {
  pendente: { label: 'Pendente', color: 'warning' },
  em_andamento: { label: 'Em andamento', color: 'info' },
  concluido: { label: 'Concluído', color: 'success' },
}

function numeroOuNull(valor) {
  if (valor == null || valor === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

/**
 * Normaliza o pedido do backend (formato do I13: cliente, veículo, `servicos[]`,
 * total e duração). Também aceita o formato antigo (veículo só com modelo/placa
 * e `servico` em texto), virando um serviço sem preço e sem cliente.
 * @param {any} raw
 * @returns {Pedido}
 */
export function normalizePedido(raw) {
  const servicos = Array.isArray(raw.servicos)
    ? raw.servicos.map((servico) => ({ nome: servico.nome ?? '', preco: numeroOuNull(servico.preco) }))
    : raw.servico
      ? [{ nome: String(raw.servico), preco: null }]
      : []

  return {
    id: String(raw.id),
    cliente: raw.cliente?.nome ? { nome: String(raw.cliente.nome) } : null,
    veiculo: {
      marca: raw.veiculo?.marca ?? null,
      modelo: raw.veiculo?.modelo ?? '',
      cor: raw.veiculo?.cor ?? '',
      placa: raw.veiculo?.placa ?? '',
    },
    servicos,
    precoTotal: numeroOuNull(raw.precoTotal),
    duracaoMinutos: numeroOuNull(raw.duracaoMinutos),
    horario: raw.horario ?? '',
    status: raw.status ?? 'pendente',
    fotos: raw.fotos ?? [],
  }
}
