import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { CHAVE_TEMA, outroTema, SCRIPT_TEMA, temaEscolhido, temaInicial } from "./tema.ts";

test("a escolha guardada vale; sem escolha (ou valor estranho), vale o tema do sistema", () => {
  assert.equal(temaInicial("escuro", false), "escuro");
  assert.equal(temaInicial("claro", true), "claro");
  assert.equal(temaInicial(null, true), "escuro");
  assert.equal(temaInicial(null, false), "claro");
  assert.equal(temaInicial("dark", true), "escuro");
  assert.equal(temaEscolhido("roxo"), null);
});

test("o botão alterna entre os dois temas", () => {
  assert.equal(outroTema("claro"), "escuro");
  assert.equal(outroTema("escuro"), "claro");
});

/** Roda o script do <head> com um navegador de mentira e devolve o data-tema aplicado. */
function rodarScript(guardado: string | null, sistemaEscuro: boolean, armazenamentoQuebrado = false): string | null {
  const atributos: Record<string, string> = {};
  vm.runInNewContext(SCRIPT_TEMA, {
    localStorage: {
      getItem: (chave: string) => {
        if (armazenamentoQuebrado) throw new Error("bloqueado");
        return chave === CHAVE_TEMA ? guardado : null;
      },
    },
    window: { matchMedia: (consulta: string) => ({ matches: sistemaEscuro && consulta.includes("dark") }) },
    document: { documentElement: { setAttribute: (nome: string, valor: string) => { atributos[nome] = valor; } } },
  });
  return atributos["data-tema"] ?? null;
}

test("script do <head> aplica o tema antes da primeira pintura", () => {
  assert.equal(rodarScript("escuro", false), "escuro");
  assert.equal(rodarScript(null, true), "escuro");
  assert.equal(rodarScript(null, false), "claro");
  assert.equal(rodarScript("qualquer", true), "escuro");
  // Navegador que bloqueia o armazenamento: fica o tema claro do CSS, sem erro.
  assert.equal(rodarScript(null, true, true), null);
});
