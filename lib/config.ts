// Endereços externos usados pelo site, decididos num lugar só.
//
// Antes o endereço da API era "http://localhost/BioFrequenciaApi/" fixo no
// código, trocável só pela tela de login (e guardado no localStorage). No
// site publicado na Vercel, todo navegador novo chamava o localhost da
// própria máquina: o login falhava com erro de rede/CORS, e quem já tinha
// salvo um endereço antigo continuava preso nele.
//
// Agora:
//  - build com NEXT_PUBLIC_API_URL (Vercel: Settings > Environment
//    Variables): é sempre esse endereço, e o que estiver salvo no
//    navegador é ignorado;
//  - build de produção SEM a variável: nenhuma chamada é feita e a tela de
//    login mostra o erro de configuração - nunca cai em localhost;
//  - desenvolvimento (npm run dev): o endereço salvo na tela de login, ou
//    o XAMPP local.
//
// Funções puras (sem window/localStorage) para poderem ser testadas com
// node --test (lib/config.test.ts).

export const API_URL_DESENVOLVIMENTO = "http://localhost/BioFrequenciaApi/";

/** Release fixa que o workflow do app (repositório App) republica a cada build. */
export const APK_URL_PADRAO = "https://github.com/BioFrequencia/App/releases/download/app-mais-recente/biofrequencia.apk";

export function normalizarBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "") + "/";
}

/** NEXT_PUBLIC_API_URL normalizada, ou null se não foi definida no build. */
export function apiUrlDoBuild(valor: string | undefined): string | null {
  const limpo = (valor ?? "").trim();
  return limpo ? normalizarBaseUrl(limpo) : null;
}

/**
 * URL efetiva da API, ou null quando o build de produção não tem
 * NEXT_PUBLIC_API_URL (configuração faltando - não há chamada a fazer).
 */
export function resolverApiUrl(doBuild: string | null, salvaNoNavegador: string | null, producao: boolean): string | null {
  if (doBuild) return doBuild;
  if (producao) return null;
  return salvaNoNavegador && salvaNoNavegador.trim() ? normalizarBaseUrl(salvaNoNavegador) : API_URL_DESENVOLVIMENTO;
}

/** Endereço do APK na página de downloads (NEXT_PUBLIC_APK_URL ou a release padrão). */
export function resolverApkUrl(valor: string | undefined): string {
  const limpo = (valor ?? "").trim();
  return limpo || APK_URL_PADRAO;
}
