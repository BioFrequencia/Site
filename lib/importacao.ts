/**
 * O que as duas importações por planilha têm em comum: a de turmas e
 * alunos (/turmas/importar) e a de entradas atrasadas e saídas
 * antecipadas anotadas sem internet (/registros/importar). A API confere
 * tudo de novo; aqui é só para avisar antes de enviar e escrever bem.
 */

export const EXTENSOES_PLANILHA = [".xlsx", ".xls", ".ods", ".csv"];
export const TAMANHO_MAXIMO_PLANILHA = 2 * 1024 * 1024;

/** Por que o arquivo não serve, antes de enviar; null quando serve. */
export function problemaDaPlanilha(arquivo: { name: string; size: number }): string | null {
  const ponto = arquivo.name.lastIndexOf(".");
  const extensao = ponto >= 0 ? arquivo.name.slice(ponto).toLowerCase() : "";
  if (!EXTENSOES_PLANILHA.includes(extensao)) {
    return "Escolha uma planilha do Excel (.xlsx ou .xls), do LibreOffice (.ods) ou um .csv.";
  }
  if (arquivo.size > TAMANHO_MAXIMO_PLANILHA) {
    return "A planilha passa de 2 MB. Divida em arquivos menores.";
  }
  return null;
}

/** Selo de cada situação da prévia (classes de app/globals.css). */
export const SELO_SITUACAO: Record<string, { classe: string; texto: string }> = {
  nova: { classe: "badge badge--regular", texto: "Nova" },
  novo: { classe: "badge badge--regular", texto: "Novo" },
  existente: { classe: "badge badge--neutral", texto: "Já existe" },
  erro: { classe: "badge badge--erro", texto: "Erro" },
};

/** 1 => "1 turma"; 3 => "3 turmas". */
export function quantidade(numero: number, singular: string, plural: string): string {
  return `${numero} ${numero === 1 ? singular : plural}`;
}

/** ["a", "b", "c"] => "a, b e c". */
export function juntarComE(partes: string[]): string {
  if (partes.length <= 1) return partes.join("");
  return `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

/** O que a confirmação de turmas e alunos cadastra, em palavras ("2 turmas e 15 alunos"). */
export function oQueEntraTurmas(resumo: { turmas_novas: number; alunos_novos: number }): string {
  const partes: string[] = [];
  if (resumo.turmas_novas > 0) partes.push(quantidade(resumo.turmas_novas, "turma", "turmas"));
  if (resumo.alunos_novos > 0) partes.push(quantidade(resumo.alunos_novos, "aluno", "alunos"));
  return juntarComE(partes);
}

/** O que a confirmação de entradas e saídas registra ("3 entradas atrasadas e 1 saída antecipada"). */
export function oQueEntraOcorrencias(resumo: { atrasos_novos: number; saidas_novas: number }): string {
  const partes: string[] = [];
  if (resumo.atrasos_novos > 0) partes.push(quantidade(resumo.atrasos_novos, "entrada atrasada", "entradas atrasadas"));
  if (resumo.saidas_novas > 0) partes.push(quantidade(resumo.saidas_novas, "saída antecipada", "saídas antecipadas"));
  return juntarComE(partes);
}

/** O pedaço da legenda da prévia sobre as linhas com erro ("; as 3 linhas com erro ficam de fora"). */
export function foraPorErro(comErro: number): string {
  if (comErro <= 0) return "";
  return comErro === 1 ? "; a linha com erro fica de fora" : `; as ${comErro} linhas com erro ficam de fora`;
}

/** "11988887777" => "(11) 98888-7777"; para a prévia ficar legível. */
export function formatarTelefone(digitos: string): string {
  const m = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digitos);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digitos;
}
