import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Esta regra reprova o padrão "buscar dados no useEffect ao montar"
      // e "resetar campos do formulário quando um modal abre" - é
      // exatamente como toda tela deste site carrega dados da API (sem
      // uma lib de data-fetching como SWR/React Query, fora de escopo
      // aqui) e como os modais são reabertos com o formulário limpo.
      // Não há bug nesses efeitos; é só um estilo mais novo que a regra
      // (ainda recente no eslint-config-next) força.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
