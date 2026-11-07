import { test } from "node:test";
import assert from "node:assert/strict";
import { mensagemDoRegistro, rotuloTipoAviso } from "./avisos.ts";
import { barraPontualidade, tendenciaDoMes } from "./graficos.ts";
import { formatarDeltaPontos, formatarPercentual, nomeMesCurto, nomeMesLongo, rotuloOrigemAtraso, rotuloTipoAlerta } from "./format.ts";

test("mensagem depois do registro diz o que aconteceu com os avisos", () => {
  assert.equal(mensagemDoRegistro("atraso", { registro: null, limite: [] }), "Entrada atrasada registrada.");
  assert.equal(
    mensagemDoRegistro("saida", { registro: null, limite: { atrasos: { responsaveis: 1, enviados: 1, na_fila: 0, falhas: 0 } } }),
    "Saída antecipada registrada. O aluno passou do limite da escola: 1 mensagem enviada ao responsável."
  );
  assert.match(
    mensagemDoRegistro("atraso", { registro: null, limite: { atrasos: { sem_responsavel: true } } }),
    /não tem responsável cadastrado/
  );
  // Já avisado dentro do intervalo: não repete o texto do limite.
  assert.equal(mensagemDoRegistro("atraso", { registro: null, limite: { atrasos: { ja_avisado: true } } }), "Entrada atrasada registrada.");
  assert.match(
    mensagemDoRegistro("atraso", { registro: { responsaveis: 2, enviados: 1, na_fila: 1, falhas: 0 }, limite: [] }),
    /1 mensagem enviada ao responsável, 1 mensagem na fila de Notificações/
  );
  assert.equal(rotuloTipoAviso("limite_saidas"), "Limite de saídas antecipadas");
  assert.equal(rotuloTipoAviso(null), "Aviso");
});

test("rodapé do gráfico compara a média por dia de aula, não o total do mês", () => {
  assert.equal(tendenciaDoMes([]), null);
  const semAula = tendenciaDoMes([{ mes: "2026-11-01", atrasos: 0, saidas: 0, dias_letivos: 0, pontualidade: null }]);
  assert.match(semAula?.texto ?? "", /Ainda não houve dia de aula em novembro/);
  // Novembro: 2 em 1 dia (2 por dia) > outubro: 21 em 21 dias (1 por dia).
  const subiu = tendenciaDoMes([
    { mes: "2026-10-01", atrasos: 21, saidas: 0, dias_letivos: 21, pontualidade: 95 },
    { mes: "2026-11-01", atrasos: 2, saidas: 0, dias_letivos: 1, pontualidade: 85 },
  ]);
  assert.equal(subiu?.direcao, "subiu");
  assert.match(subiu?.texto ?? "", /2 entradas atrasadas em 1 dia de aula/);
  const caiu = tendenciaDoMes([
    { mes: "2026-10-01", atrasos: 42, saidas: 0, dias_letivos: 21, pontualidade: 90 },
    { mes: "2026-11-01", atrasos: 1, saidas: 0, dias_letivos: 2, pontualidade: 99 },
  ]);
  assert.equal(caiu?.direcao, "caiu");
});

test("barra de pontualidade da turma: cor pela faixa do limite", () => {
  assert.deepEqual(barraPontualidade(null, 20), { largura: 0, classe: "sem-dados" });
  assert.equal(barraPontualidade(95, 20).classe, "ok");
  assert.equal(barraPontualidade(78, 20).classe, "acima");
  assert.equal(barraPontualidade(55, 20).classe, "critica");
  assert.equal(barraPontualidade(120, 20).largura, 100);
});

test("formatação das porcentagens e dos meses", () => {
  assert.equal(formatarPercentual(22.5), "22,5%");
  assert.equal(formatarPercentual(20), "20%");
  assert.equal(formatarPercentual(null), "—");
  assert.equal(formatarDeltaPontos(2.3), "+2,3 p.p.");
  assert.equal(formatarDeltaPontos(-1), "−1 p.p.");
  assert.equal(formatarDeltaPontos(null), "");
  assert.equal(nomeMesCurto("2026-11-01"), "nov");
  assert.equal(nomeMesLongo("2026-09-01"), "setembro de 2026");
  assert.equal(rotuloTipoAlerta("saidas"), "Saídas antecipadas");
  assert.equal(rotuloOrigemAtraso("presenca"), "Pela presença do app");
  assert.equal(rotuloOrigemAtraso(null), "Lançada pela coordenação");
});
