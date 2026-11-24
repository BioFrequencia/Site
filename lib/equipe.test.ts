import { test } from "node:test";
import assert from "node:assert/strict";
import { telaInicial, telaPermitida } from "./equipe.ts";

test("a equipe do sistema entra na Administração; as escolas, no Painel", () => {
  assert.equal(telaInicial({ administrador: true }), "/admin");
  assert.equal(telaInicial({ administrador: false }), "/dashboard");
  assert.equal(telaInicial(null), "/dashboard");
});

test("a equipe do sistema só abre a Administração e a própria conta", () => {
  const equipe = { administrador: true };
  assert.equal(telaPermitida(equipe, "/admin"), true);
  assert.equal(telaPermitida(equipe, "/conta"), true);
  assert.equal(telaPermitida(equipe, "/dashboard"), false);
  assert.equal(telaPermitida(equipe, "/turmas/12"), false);
  assert.equal(telaPermitida(equipe, "/administracao"), false);
});

test("uma conta de escola abre todas as telas da escola", () => {
  assert.equal(telaPermitida({ administrador: false }, "/turmas/12"), true);
  assert.equal(telaPermitida(undefined, "/registros"), true);
});
