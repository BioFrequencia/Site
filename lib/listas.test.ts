import { test } from "node:test";
import assert from "node:assert/strict";
import { agruparPorMes, inicioDoPeriodo, paginar } from "./listas.ts";

test("paginar: a página pedida, o total e o número de páginas", () => {
  const itens = Array.from({ length: 23 }, (_, i) => i + 1);
  const segunda = paginar(itens, 2, 10);
  assert.deepEqual(segunda.itens, [11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  assert.equal(segunda.totalPaginas, 3);
  assert.equal(segunda.total, 23);
  assert.deepEqual(paginar(itens, 3, 10).itens, [21, 22, 23]);
});

test("paginar: página fora do intervalo vira a mais próxima (o filtro encolheu a lista)", () => {
  const itens = [1, 2, 3];
  assert.equal(paginar(itens, 9, 2).pagina, 2);
  assert.deepEqual(paginar(itens, 9, 2).itens, [3]);
  assert.equal(paginar(itens, 0, 2).pagina, 1);
  assert.equal(paginar([], 4).pagina, 1);
  assert.equal(paginar([], 4).totalPaginas, 1);
});

test("agruparPorMes: na ordem da lista e no mês da escola", () => {
  const eventos = [
    { id: 1, data: "2026-11-19 10:31:00" },
    { id: 2, data: "2026-11-03 10:00:00" },
    // 01:30 UTC do dia 1º de novembro ainda é outubro em São Paulo.
    { id: 3, data: "2026-11-01 01:30:00" },
    { id: 4, data: "2026-09-10 11:00:00" },
  ];
  const grupos = agruparPorMes(eventos, (e) => e.data);
  assert.deepEqual(grupos.map((g) => g.chave), ["2026-11", "2026-10", "2026-09"]);
  assert.equal(grupos[0].rotulo, "novembro de 2026");
  assert.deepEqual(grupos[0].itens.map((e) => e.id), [1, 2]);
  assert.deepEqual(grupos[1].itens.map((e) => e.id), [3]);
});

test("inicioDoPeriodo: 30 e 90 dias contando hoje, o ano e tudo", () => {
  const agora = new Date("2026-11-27T15:00:00Z");
  assert.equal(inicioDoPeriodo("30", agora), "2026-10-29");
  assert.equal(inicioDoPeriodo("90", agora), "2026-08-30");
  assert.equal(inicioDoPeriodo("ano", agora), "2026-01-01");
  assert.equal(inicioDoPeriodo("tudo", agora), "2020-01-01");
  // 01:00 UTC do dia 1º de janeiro ainda é 31/12 em São Paulo.
  assert.equal(inicioDoPeriodo("ano", new Date("2027-01-01T01:00:00Z")), "2026-01-01");
});
