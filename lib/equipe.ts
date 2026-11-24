import type { Coordenacao } from "./types";

/**
 * A conta da equipe do sistema (ADMIN_EMAILS na API) fica separada das
 * escolas: ela não registra entradas, não vê turmas nem alunos. Só usa a
 * Administração e a própria conta.
 */
export const TELAS_DA_EQUIPE = ["/admin", "/conta"] as const;

type ContaLogada = Pick<Coordenacao, "administrador"> | null | undefined;

export function ehEquipeDoSistema(conta: ContaLogada): boolean {
  return !!conta?.administrador;
}

/** Para onde vai quem acabou de entrar (ou abriu a raiz do site). */
export function telaInicial(conta: ContaLogada): string {
  return ehEquipeDoSistema(conta) ? "/admin" : "/dashboard";
}

/** A tela pode ser aberta por esta conta? As telas da escola ficam fora para a equipe do sistema. */
export function telaPermitida(conta: ContaLogada, caminho: string): boolean {
  if (!ehEquipeDoSistema(conta)) return true;
  return TELAS_DA_EQUIPE.some((tela) => caminho === tela || caminho.startsWith(tela + "/"));
}
