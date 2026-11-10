/**
 * Símbolo do BioFrequência: a moldura de reconhecimento com o check. As
 * cores seguem o tema (--logo-moldura e --logo-check, em app/globals.css);
 * com a classe "logo-sobre-indigo", sai a versão para fundo índigo.
 */
export function Logo({ tamanho = 32, className }: { tamanho?: number; className?: string }) {
  return (
    <svg
      className={className ? `logo ${className}` : "logo"}
      viewBox="0 0 64 64"
      width={tamanho}
      height={tamanho}
      aria-hidden="true"
      focusable="false"
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path
          className="logo-moldura"
          strokeWidth={5}
          d="M10 22V15a5 5 0 0 1 5-5h7M42 10h7a5 5 0 0 1 5 5v7M10 42v7a5 5 0 0 0 5 5h7M54 42v7a5 5 0 0 1-5 5h-7"
        />
        <path className="logo-check" strokeWidth={6} d="M21 33l7 7 15-16" />
      </g>
    </svg>
  );
}
