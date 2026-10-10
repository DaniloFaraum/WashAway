import { isPlacaValida, normalizarPlaca } from './placa.js'

// Regras do cadastro de veículo do cliente (I3). Mesmas regras que o app valida
// antes de enviar (app_mobile/src/features/veiculos/validarVeiculo.ts).

export const TEXTO_MAXIMO_VEICULO = 60

export type CamposVeiculo = 'marca' | 'modelo' | 'cor' | 'placa'
export type ErrosVeiculo = Partial<Record<CamposVeiculo, string>>

export interface DadosVeiculo {
  marca: string | null
  modelo: string
  cor: string
  /** Já normalizada (sem hífen/espaços, maiúsculas). */
  placa: string
}

function textoObrigatorio(valor: unknown, rotulo: string): string | undefined {
  if (typeof valor !== 'string' || valor.trim() === '') return `${rotulo} é obrigatório`
  if (valor.trim().length > TEXTO_MAXIMO_VEICULO) return `${rotulo} pode ter no máximo ${TEXTO_MAXIMO_VEICULO} caracteres`
  return undefined
}

/**
 * Valida o body de criar/editar veículo. Devolve os erros por campo (vazio =
 * válido) e, quando válido, os dados limpos (trim; marca vazia vira `null`;
 * placa normalizada).
 */
export function validarVeiculo(body: unknown): { erros: ErrosVeiculo; dados?: DadosVeiculo } {
  const { marca, modelo, cor, placa } = (body ?? {}) as Record<string, unknown>
  const erros: ErrosVeiculo = {}

  if (marca !== undefined && marca !== null) {
    if (typeof marca !== 'string') erros.marca = 'Marca inválida'
    else if (marca.trim().length > TEXTO_MAXIMO_VEICULO) erros.marca = `Marca pode ter no máximo ${TEXTO_MAXIMO_VEICULO} caracteres`
  }

  const erroModelo = textoObrigatorio(modelo, 'Modelo')
  if (erroModelo) erros.modelo = erroModelo
  const erroCor = textoObrigatorio(cor, 'Cor')
  if (erroCor) erros.cor = erroCor

  if (typeof placa !== 'string' || placa.trim() === '') {
    erros.placa = 'Placa é obrigatória'
  } else if (!isPlacaValida(placa)) {
    erros.placa = 'Placa inválida (use o formato ABC-1234 ou ABC1D23)'
  }

  if (Object.keys(erros).length > 0) return { erros }
  const marcaLimpa = typeof marca === 'string' ? marca.trim() : ''
  return {
    erros,
    dados: {
      marca: marcaLimpa === '' ? null : marcaLimpa,
      modelo: (modelo as string).trim(),
      cor: (cor as string).trim(),
      placa: normalizarPlaca(placa as string),
    },
  }
}
