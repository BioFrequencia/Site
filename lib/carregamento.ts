/**
 * Quantas chamadas à API estão em andamento - a barra no topo da tela
 * (components/BarraProgresso.tsx) aparece enquanto houver alguma. As
 * consultas de segundo plano (contadores do menu a cada 45 s) não entram:
 * a barra piscaria sozinha com a tela parada.
 */
type Ouvinte = () => void;

let pendentes = 0;
const ouvintes = new Set<Ouvinte>();

function avisar(): void {
  ouvintes.forEach((ouvinte) => ouvinte());
}

/** Marca o início de uma chamada; a função devolvida marca o fim (chamar mais de uma vez não conta duas). */
export function iniciarCarregamento(): () => void {
  pendentes += 1;
  avisar();
  let terminou = false;
  return () => {
    if (terminou) return;
    terminou = true;
    pendentes -= 1;
    avisar();
  };
}

export function carregamentosPendentes(): number {
  return pendentes;
}

export function assinarCarregamento(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}
