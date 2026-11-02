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

/** Tema que aparece na tela para a escolha das preferências ("sistema" segue o computador). */
export function temaEfetivo(escolha: Tema | "sistema", sistemaEscuro: boolean): Tema {
  return escolha === "sistema" ? (sistemaEscuro ? "escuro" : "claro") : escolha;
}

/**
 * Aplica a escolha (do botão de tema ou das preferências da conta) e a
 * guarda para o script do <head>. "sistema" apaga a escolha guardada: a
 * página volta a seguir o computador (components/AplicarTema.tsx).
 */
export function aplicarEscolhaDeTema(escolha: Tema | "sistema"): void {
  try {
    if (escolha === "sistema") localStorage.removeItem(CHAVE_TEMA);
    else localStorage.setItem(CHAVE_TEMA, escolha);
  } catch {
    // Navegador sem armazenamento: vale até recarregar a página.
  }
  const sistemaEscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.setAttribute("data-tema", temaEfetivo(escolha, sistemaEscuro));
}

/**
 * Roda no <head> (app/layout.tsx) antes de a página aparecer: aplica o
 * tema já na primeira pintura, sem piscar o claro para quem usa o escuro.
 */
export const SCRIPT_TEMA = `(function(){try{var t=localStorage.getItem(${JSON.stringify(CHAVE_TEMA)});if(t!=="claro"&&t!=="escuro")t=window.matchMedia("(prefers-color-scheme: dark)").matches?"escuro":"claro";document.documentElement.setAttribute("data-tema",t)}catch(e){}})()`;
