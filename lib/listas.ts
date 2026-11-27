// Listas longas sem tela gigante: paginação feita no navegador, grupos por
// mês e os períodos prontos dos filtros. Usado na ficha do aluno (entradas
// e saídas), nas turmas e nas listas parecidas. Funções puras, testadas em
// lib/listas.test.ts.

import { hojeNaEscola, horarioLocalEscola, nomeMesLongo } from "./format.ts";

/** Quantos itens cada página mostra nas listas da ficha e das turmas. */
export const ITENS_POR_PAGINA = 10;

export interface Pagina<T> {
  itens: T[];
  /** A página que está de fato na tela (a pedida, limitada ao que existe). */
  pagina: number;
  totalPaginas: number;
  total: number;
}

/** A página `pagina` (começa em 1) da lista. Página fora do intervalo vira a mais próxima. */
export function paginar<T>(itens: readonly T[], pagina: number, porPagina = ITENS_POR_PAGINA): Pagina<T> {
  const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));
  const atual = Math.min(Math.max(1, Math.trunc(pagina) || 1), totalPaginas);
  const inicio = (atual - 1) * porPagina;
  return { itens: itens.slice(inicio, inicio + porPagina), pagina: atual, totalPaginas, total: itens.length };
}

export interface GrupoDoMes<T> {
  /** "2026-11" */
  chave: string;
  /** "novembro de 2026" */
  rotulo: string;
  itens: T[];
}

/**
 * Agrupa por mês (no calendário da escola) mantendo a ordem da lista: uma
 * lista do mais recente para o mais antigo vira grupos do mês mais recente
 * para o mais antigo.
 */
export function agruparPorMes<T>(itens: readonly T[], dataDe: (item: T) => string): GrupoDoMes<T>[] {
  const grupos: GrupoDoMes<T>[] = [];
  for (const item of itens) {
    const local = horarioLocalEscola(dataDe(item)) ?? dataDe(item);
    const chave = local.slice(0, 7);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo.chave === chave) {
      ultimo.itens.push(item);
    } else {
      grupos.push({ chave, rotulo: nomeMesLongo(`${chave}-01`), itens: [item] });
    }
  }
  return grupos;
}

export type PeriodoDaLista = "30" | "90" | "ano" | "tudo";

export const PERIODOS_DA_LISTA: { valor: PeriodoDaLista; rotulo: string }[] = [
  { valor: "30", rotulo: "30 dias" },
  { valor: "90", rotulo: "90 dias" },
  { valor: "ano", rotulo: "Este ano" },
  { valor: "tudo", rotulo: "Tudo" },
];

/** Antes disso não há registro no sistema: "Tudo" começa aqui. */
export const INICIO_DOS_REGISTROS = "2020-01-01";

/** O primeiro dia (AAAA-MM-DD, calendário da escola) de cada período. */
export function inicioDoPeriodo(periodo: PeriodoDaLista, agora: Date = new Date()): string {
  const hoje = hojeNaEscola(agora);
  if (periodo === "tudo") return INICIO_DOS_REGISTROS;
  if (periodo === "ano") return `${hoje.slice(0, 4)}-01-01`;
  const dias = periodo === "30" ? 29 : 89;
  const [ano, mes, dia] = hoje.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia - dias)).toISOString().slice(0, 10);
}
