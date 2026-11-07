import { Icon } from "./Icon";

// Calendário, relógio, turma, presença, frequência e caderno: o dia a dia
// da coordenação. Ficam nas bordas do painel, longe do texto do meio.
const ICONES = [
  { nome: "calendar", x: "9%", y: "10%" },
  { nome: "clock", x: "78%", y: "12%" },
  { nome: "users", x: "84%", y: "46%" },
  { nome: "userCheck", x: "72%", y: "80%" },
  { nome: "trend", x: "10%", y: "84%" },
  { nome: "book", x: "42%", y: "90%" },
] as const;

/** Um ícone aparece a cada 3 segundos; cada um fica visível por uns 10. */
const INTERVALO_SEGUNDOS = 3;

/**
 * Ícones da escola que aparecem, sobem um pouco e somem, um depois do
 * outro, no painel índigo das telas de entrada (login, cadastro e senha).
 * Decorativos e discretos: translúcidos, devagar, atrás do texto e sem
 * competir com o formulário. Com "reduzir movimento" ficam parados.
 */
export function IconesEscola() {
  return (
    <div className="auth-icones" aria-hidden="true">
      {ICONES.map((icone, indice) => (
        <span
          key={icone.nome}
          className="auth-icone"
          style={{ left: icone.x, top: icone.y, animationDelay: `${indice * INTERVALO_SEGUNDOS}s` }}
        >
          <Icon name={icone.nome} />
        </span>
      ))}
    </div>
  );
}
