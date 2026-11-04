// node --test (ver "npm test"): a regra precisa bater com a da API
// (api/helpers/validacao.php - mesmos casos em api/tests/helpers_test.php).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mensagemSenhaFraca, requisitosSenha, senhaForte } from "./senha.ts";

const faltando = (senha: string) => requisitosSenha(senha).filter((r) => !r.ok).map((r) => r.chave);

test("senha que cumpre tudo", () => {
  assert.equal(senhaForte("Senha@123"), true);
  assert.equal(senhaForte("Abcde1!x"), true, "exatamente 8 caracteres");
  assert.equal(mensagemSenhaFraca("Senha@123"), null);
});

test("acentos contam como letras, e o tamanho é em caracteres", () => {
  assert.equal(senhaForte("Ação#2026"), true);
  assert.deepEqual(faltando("Çé1!abc"), ["tamanho"], "7 caracteres, mesmo com acentos de 2 bytes");
});

test("cada requisito que falta aparece", () => {
  assert.deepEqual(faltando("abc"), ["tamanho", "maiuscula", "numero", "especial"]);
  assert.deepEqual(faltando("SENHA@123"), ["minuscula"]);
  assert.deepEqual(faltando("senha123"), ["maiuscula", "especial"], "a regra antiga (6+ caracteres) aceitava esta");
});

test("espaço não conta como caractere especial", () => {
  assert.deepEqual(faltando("Senha 1234"), ["especial"]);
});

test("mais de 128 caracteres não serve", () => {
  assert.equal(senhaForte("Aa1!" + "x".repeat(125)), false);
});

test("a frase do erro é a mesma da API", () => {
  assert.equal(mensagemSenhaFraca("senha123"), "A senha precisa ter uma letra maiúscula e um caractere especial (ex.: ! @ # $ %).");
  assert.equal(mensagemSenhaFraca("Senha@abc"), "A senha precisa ter um número.");
  assert.equal(
    mensagemSenhaFraca("ab1"),
    "A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula e um caractere especial (ex.: ! @ # $ %)."
  );
});
