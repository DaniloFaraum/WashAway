import { describe, expect, it } from 'vitest';

import { validarLogin } from '../features/auth/validarLogin';

describe('validarLogin', () => {
  it('aceita e-mail válido (com espaços nas pontas) e senha preenchida', () => {
    expect(validarLogin('ana@exemplo.com', '123456')).toBeNull();
    expect(validarLogin('  ana@exemplo.com  ', 'x')).toBeNull();
  });

  it('pede e-mail e senha quando algum está vazio', () => {
    expect(validarLogin('', '123456')).toBe('Informe e-mail e senha');
    expect(validarLogin('ana@exemplo.com', '')).toBe('Informe e-mail e senha');
    expect(validarLogin('   ', '')).toBe('Informe e-mail e senha');
  });

  it('avisa que o e-mail é inválido em vez de mandar para a API', () => {
    expect(validarLogin('naoemail', '123456')).toBe('Informe um e-mail válido');
    expect(validarLogin('ana@', '123456')).toBe('Informe um e-mail válido');
    expect(validarLogin('ana @exemplo.com', '123456')).toBe('Informe um e-mail válido');
    expect(validarLogin(`${'a'.repeat(250)}@x.com`, '123456')).toBe('Informe um e-mail válido');
  });
});
