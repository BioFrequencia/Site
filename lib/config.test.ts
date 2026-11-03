// node --test (ver "npm test"): sem dependências, o Node lê TypeScript direto.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  API_URL_DESENVOLVIMENTO,
  APK_URL_PADRAO,
  DESKTOP_URL_RELEASES,
  apiUrlDoBuild,
  normalizarBaseUrl,
  resolverApiUrl,
  resolverApkUrl,
  resolverDesktopUrl,
} from "./config.ts";

test("normaliza a URL base com uma barra no fim", () => {
  assert.equal(normalizarBaseUrl(" https://api.exemplo.com//"), "https://api.exemplo.com/");
  assert.equal(normalizarBaseUrl("https://api.exemplo.com"), "https://api.exemplo.com/");
});

test("NEXT_PUBLIC_API_URL vazia ou ausente = não definida", () => {
  assert.equal(apiUrlDoBuild(undefined), null);
  assert.equal(apiUrlDoBuild("   "), null);
  assert.equal(apiUrlDoBuild("https://api.onrender.com"), "https://api.onrender.com/");
});

test("produção com a variável: usa sempre a do build, ignorando o que está salvo no navegador", () => {
  // Regressão: o site publicado continuava usando um localhost salvo no localStorage.
  assert.equal(resolverApiUrl("https://api.onrender.com/", "http://localhost/BioFrequenciaApi/", true), "https://api.onrender.com/");
});

test("produção SEM a variável: nunca cai em localhost", () => {
  assert.equal(resolverApiUrl(null, null, true), null);
  assert.equal(resolverApiUrl(null, "http://localhost/BioFrequenciaApi/", true), null);
});

test("desenvolvimento: endereço salvo na tela de login, ou o XAMPP local", () => {
  assert.equal(resolverApiUrl(null, "http://192.168.0.10/api", false), "http://192.168.0.10/api/");
  assert.equal(resolverApiUrl(null, null, false), API_URL_DESENVOLVIMENTO);
  assert.equal(resolverApiUrl(null, "  ", false), API_URL_DESENVOLVIMENTO);
});

test("APK: variável do deploy ou a release fixa do repositório do app", () => {
  assert.equal(resolverApkUrl(undefined), APK_URL_PADRAO);
  assert.equal(resolverApkUrl("https://exemplo.com/app.apk"), "https://exemplo.com/app.apk");
  assert.ok(!APK_URL_PADRAO.includes("jvvvv780"), "o link antigo (repositório pessoal, 404) não pode voltar");
});

test("desktop: só com a variável do deploy - sem ela o card diz \"Em breve\", nunca um link quebrado", () => {
  assert.equal(resolverDesktopUrl(undefined), null);
  assert.equal(resolverDesktopUrl("   "), null);
  assert.equal(resolverDesktopUrl(` ${DESKTOP_URL_RELEASES} `), DESKTOP_URL_RELEASES);
  assert.ok(DESKTOP_URL_RELEASES.endsWith("/releases/latest/download/BioFrequencia.exe"), "o nome do arquivo é o que o workflow do desktop publica");
});
