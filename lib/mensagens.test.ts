import { test } from "node:test";
import assert from "node:assert/strict";
import {
  alternarDestino,
  destinosSugeridos,
  linkWhatsapp,
  novaChaveDeEnvio,
  rotuloComoSai,
  seloDoEnvio,
  temDestino,
  tituloDoEnvio,
} from "./mensagens.ts";
import { rotuloTipoAviso } from "./avisos.ts";
import type { ContatoResponsavel } from "./types.ts";

const responsavel = (id: number, sugeridos: ("whatsapp" | "email")[]): ContatoResponsavel => ({
  id_responsavel: id,
  nome: `Responsável ${id}`,
  parentesco: null,
  telefone: "11999990001",
  email: null,
  canal_preferido: "whatsapp",
  whatsapp: true,
  email_disponivel: false,
  sugeridos,
});

test("os destinos já vêm marcados pelo canal preferido de cada responsável", () => {
  assert.deepEqual(destinosSugeridos([responsavel(1, ["whatsapp"]), responsavel(2, ["whatsapp", "email"])]), [
    { id_responsavel: 1, canal: "whatsapp" },
    { id_responsavel: 2, canal: "whatsapp" },
    { id_responsavel: 2, canal: "email" },
  ]);
  assert.deepEqual(destinosSugeridos([]), []);
});

test("ligar e desligar um destino", () => {
  const ligado = alternarDestino([], { id_responsavel: 1, canal: "email" });
  assert.equal(temDestino(ligado, 1, "email"), true);
  assert.equal(temDestino(ligado, 1, "whatsapp"), false);
  assert.deepEqual(alternarDestino(ligado, { id_responsavel: 1, canal: "email" }), []);
});

test("como a mensagem sai e o selo de cada situação", () => {
  assert.equal(rotuloComoSai("whatsapp", "automatico"), "Sai pelo WhatsApp da escola");
  assert.match(rotuloComoSai("whatsapp", "link"), /link/);
  assert.match(rotuloComoSai("email", "fila"), /fila/);
  assert.equal(seloDoEnvio("enviada").texto, "Enviada");
  assert.equal(seloDoEnvio("erro").classe, "badge badge--erro");
  assert.equal(seloDoEnvio("pendente").texto, "Para mandar");
  assert.equal(rotuloTipoAviso("manual"), "Mensagem da coordenação");
});

test("o título do resultado diz o que aconteceu de fato", () => {
  assert.equal(tituloDoEnvio({ enviadas: 0, pendentes: 0, erros: 1 }), "A mensagem não saiu");
  assert.equal(tituloDoEnvio({ enviadas: 1, pendentes: 0, erros: 1 }), "Mensagem enviada, com erro em parte");
  assert.equal(tituloDoEnvio({ enviadas: 0, pendentes: 2, erros: 0 }), "Mensagem pronta: falta mandar pelo link");
  assert.equal(tituloDoEnvio({ enviadas: 2, pendentes: 0, erros: 0 }), "Mensagem enviada");
});

test("link do WhatsApp com o 55 do Brasil e o texto codificado", () => {
  assert.equal(linkWhatsapp("(11) 99999-0001", "Olá, Maria & cia"), "https://wa.me/5511999990001?text=Ol%C3%A1%2C%20Maria%20%26%20cia");
  assert.equal(linkWhatsapp("5511999990001", "oi"), "https://wa.me/5511999990001?text=oi");
  assert.equal(linkWhatsapp("123", "oi"), null);
  assert.equal(linkWhatsapp(null, "oi"), null);
});

test("cada mensagem nova ganha uma chave diferente", () => {
  const a = novaChaveDeEnvio();
  assert.match(a, /^[0-9a-f-]{36}$/);
  assert.notEqual(a, novaChaveDeEnvio());
});
