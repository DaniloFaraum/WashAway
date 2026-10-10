import bcrypt from 'bcryptjs'

// Hash e conferência de senha (cliente e lava-rápido).

export const CUSTO_BCRYPT = 10

// Hash qualquer, só pra o login com conta inexistente gastar o mesmo tempo de um
// `bcrypt.compare` real (não dá pra descobrir quais contas existem pelo tempo).
const HASH_FICTICIO = bcrypt.hashSync('senha-ficticia-para-tempo-constante', CUSTO_BCRYPT)

export function gerarHashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, CUSTO_BCRYPT)
}

/**
 * A senha confere com o hash? Sem hash (conta inexistente), compara com o hash
 * fictício (mesmo tempo de resposta) e devolve `false`.
 */
export async function conferirSenha(senha: string, hash: string | null | undefined): Promise<boolean> {
  const confere = await bcrypt.compare(senha, hash ?? HASH_FICTICIO)
  return hash != null && confere
}
