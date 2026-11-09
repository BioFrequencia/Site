/**
 * "Carregando" com o símbolo do BioFrequência animado: os cantos da
 * moldura de reconhecimento focam e o check se desenha. Com "tela", ocupa
 * a página toda (abrir o site, conferir a sessão).
 */
export function Carregando({ texto = "Carregando…", tela = false }: { texto?: string; tela?: boolean }) {
  return (
    <div className={tela ? "carregando carregando-tela" : "carregando"} role="status" aria-live="polite">
      <svg className="carregando-simbolo" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path className="logo-moldura carregando-canto canto-1" strokeWidth={5} d="M10 22V15a5 5 0 0 1 5-5h7" />
          <path className="logo-moldura carregando-canto canto-2" strokeWidth={5} d="M42 10h7a5 5 0 0 1 5 5v7" />
          <path className="logo-moldura carregando-canto canto-3" strokeWidth={5} d="M10 42v7a5 5 0 0 0 5 5h7" />
          <path className="logo-moldura carregando-canto canto-4" strokeWidth={5} d="M54 42v7a5 5 0 0 1-5 5h-7" />
          <path className="logo-check carregando-check" strokeWidth={6} d="M21 33l7 7 15-16" />
        </g>
      </svg>
      <span>{texto}</span>
    </div>
  );
}
