import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PREFERENCIAS_PADRAO,
  configuracaoDeSons,
  lerPreferenciasGuardadas,
  preferenciasDaApi,
  preferenciasParaApi,
} from "./preferencias.ts";
import { ARQUIVOS_SOM, deveTocar, SONS_PADRAO } from "./sons.ts";
import { temNovidade } from "./contadores.ts";
import { temaEfetivo } from "./tema.ts";

test("preferências da API viram as do site; campo estranho fica com o padrão", () => {
  assert.deepEqual(
    preferenciasDaApi({ tema: "escuro", sons_ativos: false, volume_sons: 30, som_confirmacao: true, som_notificacao: false, som_erro: true }),
    { tema: "escuro", sonsAtivos: false, volumeSons: 30, somConfirmacao: true, somNotificacao: false, somErro: true }
  );
  assert.deepEqual(preferenciasDaApi(null), PREFERENCIAS_PADRAO);
  const estranhas = preferenciasDaApi({ tema: "azul" as never, volume_sons: 250, sons_ativos: "sim" as never });
  assert.equal(estranhas.tema, "sistema");
  assert.equal(estranhas.volumeSons, 70);
  assert.equal(estranhas.sonsAtivos, true);
});

test("para salvar, vai só o que mudou, no formato da API", () => {
  assert.deepEqual(preferenciasParaApi({ tema: "claro" }), { tema: "claro" });
  assert.deepEqual(preferenciasParaApi({ volumeSons: 42.6, somErro: false }), { volume_sons: 43, som_erro: false });
  assert.deepEqual(preferenciasParaApi({ volumeSons: 180 }), { volume_sons: 100 });
});

test("cópia guardada no navegador: ilegível ou vazia vira o padrão", () => {
  assert.deepEqual(lerPreferenciasGuardadas(null), PREFERENCIAS_PADRAO);
  assert.deepEqual(lerPreferenciasGuardadas("{quebrado"), PREFERENCIAS_PADRAO);
  assert.equal(lerPreferenciasGuardadas(JSON.stringify(preferenciasParaApi({ ...PREFERENCIAS_PADRAO, tema: "escuro" }))).tema, "escuro");
});

test("sons: cada tipo toca o arquivo pedido e respeita as preferências", () => {
  assert.deepEqual(ARQUIVOS_SOM, { confirmacao: "/sons/daylight.wav", notificacao: "/sons/bloom.wav", erro: "/sons/shrug.wav" });
  assert.equal(deveTocar(SONS_PADRAO, "erro"), true);

  const semErro = configuracaoDeSons({ ...PREFERENCIAS_PADRAO, somErro: false });
  assert.equal(deveTocar(semErro, "erro"), false);
  assert.equal(deveTocar(semErro, "confirmacao"), true);

  assert.equal(deveTocar(configuracaoDeSons({ ...PREFERENCIAS_PADRAO, sonsAtivos: false }), "confirmacao"), false);
  assert.equal(deveTocar(configuracaoDeSons({ ...PREFERENCIAS_PADRAO, volumeSons: 0 }), "confirmacao"), false);
  assert.equal(configuracaoDeSons({ ...PREFERENCIAS_PADRAO, volumeSons: 40 }).volume, 0.4);
});

test("som de notificação só quando alguma fila do menu cresce", () => {
  const antes = { alertas: 2, notificacoes: 0, checkins: 1, ocorrencias: 0 };
  assert.equal(temNovidade(antes, { ...antes }), false);
  assert.equal(temNovidade(antes, { ...antes, notificacoes: 1 }), true);
  // Fila diminuindo (alguém resolveu um alerta) não é novidade.
  assert.equal(temNovidade(antes, { ...antes, alertas: 1 }), false);
});

test("tema que aparece na tela para cada escolha das preferências", () => {
  assert.equal(temaEfetivo("escuro", false), "escuro");
  assert.equal(temaEfetivo("claro", true), "claro");
  assert.equal(temaEfetivo("sistema", true), "escuro");
  assert.equal(temaEfetivo("sistema", false), "claro");
});
