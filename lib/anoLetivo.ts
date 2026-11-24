import type { DestinoAnoLetivo, TurmaDoAnoLetivo } from "./types";

/** O valor do <select> de destino: "manter", "concluiu", "transferido" ou "turma-12". */
export type ValorDestino = string;

export function doValor(valor: ValorDestino): DestinoAnoLetivo {
  return valor.startsWith("turma-") ? Number(valor.slice(6)) : (valor as Exclude<DestinoAnoLetivo, number>);
}

/**
 * Para onde vão os alunos no fim do ano, contando as exceções por aluno -
 * o resumo que a gestão confere antes de confirmar. Mandar a turma para
 * ela mesma é o mesmo que ficar.
 */
export function resumoDoEncerramento(
  turmas: TurmaDoAnoLetivo[],
  destinos: Record<number, ValorDestino>,
  excecoes: Record<number, ValorDestino>
): { movidos: number; saem: number; ficam: number } {
  let movidos = 0;
  let saem = 0;
  let ficam = 0;
  for (const turma of turmas) {
    for (const aluno of turma.alunos) {
      const valor = excecoes[aluno.id_aluno] || destinos[turma.id_sala] || "manter";
      if (valor === "concluiu" || valor === "transferido") saem++;
      else if (valor === "manter" || valor === `turma-${turma.id_sala}`) ficam++;
      else movidos++;
    }
  }
  return { movidos, saem, ficam };
}
