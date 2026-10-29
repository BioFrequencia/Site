import { test } from "node:test";
import assert from "node:assert/strict";
import { expiracaoDoToken, tokenExpirado } from "./sessao.ts";

function token(payload: Record<string, unknown>): string {
  const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(payload)}.assinatura`;
}

test("lê o exp do token (em ms)", () => {
  assert.equal(expiracaoDoToken(token({ exp: 1_800_000_000 })), 1_800_000_000_000);
});

test("token vencido é detectado (com folga de 30 s)", () => {
  const agora = 1_800_000_000_000;
  assert.equal(tokenExpirado(token({ exp: agora / 1000 - 60 }), agora), true);
  assert.equal(tokenExpirado(token({ exp: agora / 1000 + 10 }), agora), true, "a 10 s do fim já conta como vencido");
  assert.equal(tokenExpirado(token({ exp: agora / 1000 + 3600 }), agora), false);
});

test("token ilegível não é tratado como vencido (a API decide)", () => {
  assert.equal(tokenExpirado("nao-e-jwt", Date.now()), false);
  assert.equal(tokenExpirado(token({ sub: 1 }), Date.now()), false);
});
