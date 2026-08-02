export function authErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'email_not_confirmed') return 'Confirme seu e-mail antes de entrar.';
  if (code === 'invalid_credentials') return 'E-mail ou senha incorretos.';
  if (code === 'user_banned') return 'Esta conta está temporariamente bloqueada.';
  if (code === 'over_request_rate_limit') return 'Muitas tentativas. Aguarde alguns minutos.';
  if (error?.name === 'AuthRetryableFetchError' || /fetch|network|connect/i.test(error?.message || '')) return 'Não foi possível conectar ao serviço de autenticação.';
  return 'Não foi possível entrar agora. Tente novamente.';
}

export function signupErrorMessage(error) {
  const code = error?.code || '';
  if (code === 'user_already_exists' || code === 'email_exists') return 'Já existe uma conta para este e-mail. Entre para continuar.';
  if (code === 'email_address_invalid') return 'Informe um e-mail válido.';
  if (code === 'weak_password') return 'Escolha uma senha mais segura.';
  if (error?.name === 'AuthRetryableFetchError' || /fetch|network|connect/i.test(error?.message || '')) return 'Não foi possível conectar ao serviço de autenticação.';
  return 'Não foi possível criar sua conta agora. Tente novamente.';
}
export function logAuthError(scope, error) { if (process.env.NODE_ENV === 'development') console.warn(`[${scope}] falha de autenticação`, { code: error?.code, status: error?.status, message: error?.message, name: error?.name }); }
