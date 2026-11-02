/**
 * Tema do site (claro ou escuro). A escolha fica no navegador; sem
 * escolha, vale o tema do sistema. O atributo data-tema do <html> é o que
 * troca as cores (app/globals.css).
 */
export type Tema = "claro" | "escuro";

export const CHAVE_TEMA = "biofrequencia.tema";

/** Valor guardado, se for um tema válido. */
export function temaEscolhido(valor: string | null | undefined): Tema | null {
  return valor === "claro" || valor === "escuro" ? valor : null;
}

export function temaInicial(guardado: string | null | undefined, sistemaEscuro: boolean): Tema {
  return temaEscolhido(guardado) ?? (sistemaEscuro ? "escuro" : "claro");
}

export function outroTema(tema: Tema): Tema {
  return tema === "escuro" ? "claro" : "escuro";
}

/**
 * Roda no <head> (app/layout.tsx) antes de a página aparecer: aplica o
 * tema já na primeira pintura, sem piscar o claro para quem usa o escuro.
 */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});if(t!=="claro"&&t!=="escuro")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro";document.documentElement.setAttribute("data-tema",t)}catch(e){}})()`;
