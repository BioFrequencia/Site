import type { EvolucaoMensal } from "./types";

/**
 * Rodapé do gráfico de entradas atrasadas: o mês atual comparado com o
 * anterior PELA MÉDIA POR DIA DE AULA, não pelo total - no dia 3 o mês
 * atual sempre teria "menos atrasos" que o mês passado inteiro, o que é
 * verdade e não diz nada.
 *
 * "subiu" é ruim (mais atrasos por dia de aula), "caiu" é bom.
 */
export function tendenciaDoMes(meses: EvolucaoMensal[]): { direcao: "subiu" | "caiu" | "igual"; texto: string } | null {
  if (meses.length === 0) return null;
  const atual = meses[meses.length - 1];
  const nomeAtual = nomeDoMes(atual.mes);
  if (atual.dias_letivos === 0) {
    return { direcao: "igual", texto: `Ainda não houve dia de aula em ${nomeAtual}.` };
  }
  const resumoAtual = `${atual.atrasos} ${atual.atrasos === 1 ? "entrada atrasada" : "entradas atrasadas"} em ${atual.dias_letivos} ${
    atual.dias_letivos === 1 ? "dia de aula" : "dias de aula"
  }`;
  const anterior = meses.length > 1 ? meses[meses.length - 2] : null;
  if (!anterior || anterior.dias_letivos === 0) {
    return { direcao: "igual", texto: `Em ${nomeAtual}: ${resumoAtual}.` };
  }
  const mediaAtual = atual.atrasos / atual.dias_letivos;
  const mediaAnterior = anterior.atrasos / anterior.dias_letivos;
  const diferenca = mediaAtual - mediaAnterior;
  const direcao = Math.abs(diferenca) < 0.05 ? "igual" : diferenca > 0 ? "subiu" : "caiu";
  const comparacao =
    direcao === "igual" ? "mesma média por dia de aula" : direcao === "subiu" ? "mais por dia de aula" : "menos por dia de aula";
  return {
    direcao,
    texto: `Em ${nomeAtual}: ${resumoAtual} (${comparacao} que em ${nomeDoMes(anterior.mes)}: ${anterior.atrasos} em ${
      anterior.dias_letivos
    }).`,
  };
}

function nomeDoMes(iso: string): string {
  const [ano, mes] = iso.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, 15)).toLocaleDateString("pt-BR", { month: "long", timeZone: "UTC" });
}

/** Largura da barra de pontualidade de uma turma (0 a 100), e a cor pela faixa. */
export function barraPontualidade(pontualidade: number | null, limiteAlerta: number): { largura: number; classe: string } {
  if (pontualidade === null) return { largura: 0, classe: "sem-dados" };
  const taxaAtrasos = 100 - pontualidade;
  const classe = taxaAtrasos >= 2 * limiteAlerta ? "critica" : taxaAtrasos >= limiteAlerta ? "acima" : "ok";
  return { largura: Math.max(0, Math.min(100, pontualidade)), classe };
}
