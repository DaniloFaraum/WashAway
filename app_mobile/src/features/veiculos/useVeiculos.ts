import { useCallback, useEffect, useState } from 'react'
import { listarVeiculos, removerVeiculo } from './service/veiculos.service'
import type { Veiculo } from './service/veiculos.model'

/**
 * Veículos do cliente logado (I3): carrega ao montar; `recarregar()` busca de
 * novo (ex.: ao voltar do formulário); `remover(id)` apaga e tira da lista.
 * Criar/editar ficam no formulário (`criarVeiculo`/`atualizarVeiculo`), que
 * volta para a lista — e a lista recarrega ao ganhar foco.
 */
export function useVeiculos() {
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // `ativo()` evita setState depois de desmontar (resposta atrasada).
  const carregar = useCallback(
    (ativo: () => boolean = () => true) =>
      listarVeiculos()
        .then((lista) => {
          if (!ativo()) return
          setVeiculos(lista)
          setErro(null)
        })
        .catch((err) => {
          if (ativo()) setErro(err instanceof Error ? err.message : 'Não foi possível carregar seus veículos.')
        })
        .finally(() => {
          if (ativo()) setCarregando(false)
        }),
    [],
  )

  useEffect(() => {
    let ativo = true
    void carregar(() => ativo)
    return () => {
      ativo = false
    }
  }, [carregar])

  const recarregar = useCallback(() => carregar(), [carregar])

  const remover = useCallback(async (id: string) => {
    await removerVeiculo(id)
    setVeiculos((atuais) => atuais.filter((veiculo) => veiculo.id !== id))
  }, [])

  return { veiculos, carregando, erro, recarregar, remover }
}
