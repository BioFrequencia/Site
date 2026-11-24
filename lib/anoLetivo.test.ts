import { test } from "node:test";
import assert from "node:assert/strict";
import { doValor, resumoDoEncerramento } from "./anoLetivo.ts";

const turmas = [
  { id_sala: 1, nome_sala: "8º A", periodo_sala: "Matutino", alunos: [{ id_aluno: 10, nome_aluno: "Ana" }, { id_aluno: 11, nome_aluno: "Bia" }] },
  { id_sala: 2, nome_sala: "9º A", periodo_sala: "Matutino", alunos: [{ id_aluno: 20, nome_aluno: "Caio" }] },
];

test("fim do ano: turma que passa, turma que conclui e quem repete", () => {
  assert.deepEqual(resumoDoEncerramento(turmas, { 1: "turma-2", 2: "concluiu" }, { 11: "manter" }), { movidos: 1, saem: 1, ficam: 1 });
});

test("fim do ano: sem escolha, todo mundo fica; mandar a turma para ela mesma também", () => {
  assert.deepEqual(resumoDoEncerramento(turmas, {}, {}), { movidos: 0, saem: 0, ficam: 3 });
  assert.deepEqual(resumoDoEncerramento(turmas, { 1: "turma-1" }, {}), { movidos: 0, saem: 0, ficam: 3 });
});

test("fim do ano: exceção de transferência sai mesmo com a turma ficando", () => {
  assert.deepEqual(resumoDoEncerramento(turmas, {}, { 20: "transferido" }), { movidos: 0, saem: 1, ficam: 2 });
});

test("o valor do select vira o destino da API", () => {
  assert.equal(doValor("turma-12"), 12);
  assert.equal(doValor("concluiu"), "concluiu");
  assert.equal(doValor("manter"), "manter");
});
