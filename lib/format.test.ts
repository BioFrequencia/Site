import { test } from "node:test";
import assert from "node:assert/strict";
import {
  dataPorExtenso,
  formatarData,
  formatarDataHora,
  formatarHora,
  hojeNaEscola,
  horarioLocalEscola,
  lerHorarioApi,
  plural,
  rotuloPrioridade,
} from "./format.ts";

test("plural com o número, sem o \"(s)\"", () => {
  assert.equal(plural(1, "aluno", "alunos"), "1 aluno");
  assert.equal(plural(0, "aluno", "alunos"), "0 alunos");
  assert.equal(plural(1250, "escola", "escolas"), "1.250 escolas");
});

test("prioridade do alerta escrita como na tela, com acento", () => {
  assert.equal(rotuloPrioridade("alta"), "Alta");
  assert.equal(rotuloPrioridade("media"), "Média");
  assert.equal(rotuloPrioridade("baixa"), "Baixa");
});

test("data por extenso no calendário da escola", () => {
  assert.equal(dataPorExtenso(new Date("2026-11-18T12:00:00Z")), "quarta-feira, 18 de novembro");
  // 01:30 UTC do dia 19 ainda é dia 18 em São Paulo.
  assert.equal(dataPorExtenso(new Date("2026-11-19T01:30:00Z")), "quarta-feira, 18 de novembro");
});

test("hora da presença no fuso da escola (UTC da API menos 3 horas)", () => {
  assert.equal(formatarHora("2026-10-30 10:42:07.123"), "07:42");
  assert.equal(formatarHora("2026-10-31 02:03:00"), "23:03");
  assert.equal(formatarHora(null), "-");
});

test("horário da API sem fuso é UTC (padrão do banco)", () => {
  assert.equal(lerHorarioApi("2026-10-29 13:45:00")?.toISOString(), "2026-10-29T13:45:00.000Z");
  assert.equal(lerHorarioApi("2026-09-18 14:25:11.870724")?.toISOString(), "2026-09-18T14:25:11.870Z");
  assert.equal(lerHorarioApi("2026-10-29T10:45:00-03:00")?.toISOString(), "2026-10-29T13:45:00.000Z");
  assert.equal(lerHorarioApi("ontem"), null);
});

test("mostra no horário da escola: 13:45 UTC = 10:45 em São Paulo", () => {
  // Regressão: o site mostrava 13:45 (3 h adiantado).
  assert.match(formatarDataHora("2026-10-29 13:45:00"), /29\/10\/2026.*10:45/);
});

test("lançamento às 22:30 locais (01:30 UTC do dia seguinte) aparece no dia certo", () => {
  assert.equal(formatarData("2026-10-30 01:30:00"), "29/10/2026");
});

test("data sem horário é dia de calendário, sem conversão de fuso", () => {
  assert.equal(formatarData("2026-10-01"), "01/10/2026");
  assert.equal(formatarData(null), "-");
});

test("horário local da escola no formato aceito pela API", () => {
  assert.equal(horarioLocalEscola("2026-10-30 01:30:00"), "2026-10-29 22:30");
});

test("'hoje' segue o calendário da escola, não o UTC", () => {
  // 01:30 UTC de 30/10 ainda é 29/10 em São Paulo.
  assert.equal(hojeNaEscola(new Date("2026-10-30T01:30:00Z")), "2026-10-29");
});
