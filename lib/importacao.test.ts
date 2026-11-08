import { test } from "node:test";
import assert from "node:assert/strict";
import {
  foraPorErro,
  formatarTelefone,
  juntarComE,
  oQueEntraOcorrencias,
  oQueEntraTurmas,
  problemaDaPlanilha,
  quantidade,
} from "./importacao.ts";

test("planilha: extensão e tamanho conferidos antes de enviar", () => {
  assert.equal(problemaDaPlanilha({ name: "Turmas.XLSX", size: 1000 }), null);
  assert.equal(problemaDaPlanilha({ name: "saidas.csv", size: 2 * 1024 * 1024 }), null);
  assert.match(problemaDaPlanilha({ name: "foto.png", size: 1000 }) ?? "", /\.xlsx/);
  assert.match(problemaDaPlanilha({ name: "sem-extensao", size: 1000 }) ?? "", /\.xlsx/);
  assert.match(problemaDaPlanilha({ name: "grande.xlsx", size: 2 * 1024 * 1024 + 1 }) ?? "", /2 MB/);
});

test("textos da importação com plural e 'e' antes do último", () => {
  assert.equal(quantidade(1, "turma", "turmas"), "1 turma");
  assert.equal(quantidade(0, "turma", "turmas"), "0 turmas");
  assert.equal(juntarComE(["a"]), "a");
  assert.equal(juntarComE(["a", "b", "c"]), "a, b e c");
  assert.equal(oQueEntraTurmas({ turmas_novas: 2, alunos_novos: 15 }), "2 turmas e 15 alunos");
  assert.equal(oQueEntraTurmas({ turmas_novas: 0, alunos_novos: 1 }), "1 aluno");
  assert.equal(oQueEntraTurmas({ turmas_novas: 0, alunos_novos: 0 }), "");
  assert.equal(oQueEntraOcorrencias({ atrasos_novos: 3, saidas_novas: 1 }), "3 entradas atrasadas e 1 saída antecipada");
  assert.equal(oQueEntraOcorrencias({ atrasos_novos: 0, saidas_novas: 2 }), "2 saídas antecipadas");
  assert.equal(foraPorErro(0), "");
  assert.equal(foraPorErro(1), "; a linha com erro fica de fora");
  assert.equal(foraPorErro(4), "; as 4 linhas com erro ficam de fora");
});

test("telefone da prévia fica legível", () => {
  assert.equal(formatarTelefone("11988887777"), "(11) 98888-7777");
  assert.equal(formatarTelefone("1133334444"), "(11) 3333-4444");
  assert.equal(formatarTelefone("123"), "123");
});
