import { EMAIL_MAXIMO, FORMATO_EMAIL } from '@/features/clientes/validarCadastro';

// Validação do login antes de chamar a API (refinamento T11): e-mail fora do
// formato não vira "E-mail ou senha incorretos" (que parece erro de senha).

/** Mensagem de erro dos campos, ou `null` se pode enviar. */
export function validarLogin(email: string, senha: string): string | null {
  const emailLimpo = email.trim();
  if (emailLimpo === '' || senha === '') return 'Informe e-mail e senha';
  if (emailLimpo.length > EMAIL_MAXIMO || !FORMATO_EMAIL.test(emailLimpo)) return 'Informe um e-mail válido';
  return null;
}
