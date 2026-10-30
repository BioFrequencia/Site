// Leitura da validade do token de login (JWT emitido pela API, 2 horas).
//
// O site não confere a assinatura - quem confere é a API em toda chamada.
// Ler o "exp" aqui serve só para não mostrar o painel de alguém cuja
// sessão já venceu: antes, abrir o site no dia seguinte mostrava o painel
// com o nome da pessoa e erros em toda tela até a primeira chamada voltar
// 401.

/** Instante (ms) em que o token expira, ou null se não der para ler. */
export function expiracaoDoToken(token: string): number | null {
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  try {
    const base64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/**
 * Token vencido (com folga de 30 s para diferença de relógio). Um token
 * ilegível NÃO é tratado como vencido: a API decide na próxima chamada.
 */
export function tokenExpirado(token: string, agoraMs: number): boolean {
  const expiraEm = expiracaoDoToken(token);
  return expiraEm !== null && expiraEm - 30_000 <= agoraMs;
}
