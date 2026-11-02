/** Pendências contadas no menu lateral, atualizadas a cada 45 s (app/(painel)/layout.tsx). */
export interface Contadores {
  alertas: number;
  notificacoes: number;
  checkins: number;
  ocorrencias: number;
}

/** Alguma fila cresceu desde a última consulta? É o que toca o som de notificação. */
export function temNovidade(antes: Contadores, agora: Contadores): boolean {
  return (Object.keys(agora) as (keyof Contadores)[]).some((fila) => agora[fila] > antes[fila]);
}
