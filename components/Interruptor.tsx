"use client";

/** Liga/desliga acessível (role="switch"), usado em Minha conta e em Escola. */
export function Interruptor({
  ligado,
  rotulo,
  desabilitado = false,
  onMudar,
}: {
  ligado: boolean;
  rotulo: string;
  desabilitado?: boolean;
  onMudar: (ligado: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      className={`interruptor${ligado ? " ligado" : ""}`}
      onClick={() => onMudar(!ligado)}
    >
      <span className="interruptor-botao" />
    </button>
  );
}
