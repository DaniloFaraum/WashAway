import { isPlacaValida } from './placa'
import type { DadosVeiculo, ErrosVeiculo } from './service/veiculos.model'

// Validação do formulário de veículo (I3), antes de enviar. Mesmas regras do
// back-end (backend/src/modules/veiculos-cliente/veiculosCliente.validation.ts).

export const TEXTO_MAXIMO_VEICULO = 60

export type { ErrosVeiculo }

/** Mapa campo → mensagem. Vazio = pode enviar. */
export function validarVeiculo({ marca, modelo, cor, placa }: DadosVeiculo): ErrosVeiculo {
  const erros: ErrosVeiculo = {}
  const longo = (valor: string) => valor.trim().length > TEXTO_MAXIMO_VEICULO

  if (longo(marca)) erros.marca = `A marca pode ter no máximo ${TEXTO_MAXIMO_VEICULO} caracteres`

  if (modelo.trim() === '') erros.modelo = 'Informe o modelo'
  else if (longo(modelo)) erros.modelo = `O modelo pode ter no máximo ${TEXTO_MAXIMO_VEICULO} caracteres`

  if (cor.trim() === '') erros.cor = 'Informe a cor'
  else if (longo(cor)) erros.cor = `A cor pode ter no máximo ${TEXTO_MAXIMO_VEICULO} caracteres`

  if (placa.trim() === '') erros.placa = 'Informe a placa'
  else if (!isPlacaValida(placa)) erros.placa = 'Placa inválida. Use o formato ABC-1234 ou ABC1D23'

  return erros
}
