/** Pendências contadas no menu lateral, atualizadas a cada 45 s (app/(painel)/layout.tsx). */
export interface Contadores {
  alertas: number;
  notificacoes: number;
  /** Contas aguardando a aprovação da gestão (só para a gestão). */
  equipe: number;
  /** Contas pendentes e chamados abertos de todas as escolas (só para a equipe do sistema). */
  admin: number;
}

export const CONTADORES_ZERADOS: Contadores = { alertas: 0, notificacoes: 0, equipe: 0, admin: 0 };

/** Alguma fila cresceu desde a última consulta? É o que toca o som de notificação. */
export function temNovidade(antes: Contadores, agora: Contadores): boolean {
  return (Object.keys(agora) as (keyof Contadores)[]).some((fila) => agora[fila] > antes[fila]);
}
