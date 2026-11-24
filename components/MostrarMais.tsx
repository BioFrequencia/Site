"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** Quantos itens uma lista longa mostra de início (e a cada "Mostrar mais"). */
export const PASSO_DA_LISTA = 20;

export interface ListaParcial<T> {
  visiveis: T[];
  total: number;
  restantes: number;
  expandida: boolean;
  mostrarMais: () => void;
  recolher: () => void;
}

/**
 * Lista que não cresce sem fim na tela: começa com os primeiros
 * PASSO_DA_LISTA itens e cresce de PASSO_DA_LISTA em PASSO_DA_LISTA no
 * "Mostrar mais". Quando a lista muda de assunto (outro dia, outra turma,
 * outro filtro - a "chave"), volta ao começo.
 */
export function useListaParcial<T>(itens: readonly T[], chave = "", passo = PASSO_DA_LISTA): ListaParcial<T> {
  const [estado, setEstado] = useState({ chave, limite: passo });
  // Chave nova: começa de novo, sem esperar um efeito (sem piscar a lista inteira).
  const limite = estado.chave === chave ? estado.limite : passo;
  return {
    visiveis: itens.slice(0, limite),
    total: itens.length,
    restantes: Math.max(0, itens.length - limite),
    expandida: limite > passo,
    mostrarMais: () => setEstado({ chave, limite: limite + passo }),
    recolher: () => setEstado({ chave, limite: passo }),
  };
}

/**
 * O rodapé da lista parcial: "Mostrando 20 de 154", o "Mostrar mais" e,
 * depois de abrir, o "Recolher". Some quando a lista cabe inteira.
 */
export function MostrarMais<T>({ lista, nome = "itens" }: { lista: ListaParcial<T>; nome?: string }) {
  if (lista.restantes === 0 && !lista.expandida) return null;
  return (
    <div className="mostrar-mais">
      <span className="mostrar-mais-contagem">
        Mostrando {lista.visiveis.length} de {lista.total} {nome}
      </span>
      <div className="mostrar-mais-acoes">
        {lista.expandida && (
          <button type="button" className="btn btn-text btn-sm" onClick={lista.recolher}>
            <Icon name="chevronUp" />
            Recolher
          </button>
        )}
        {lista.restantes > 0 && (
          <button type="button" className="btn btn-sm" onClick={lista.mostrarMais}>
            <Icon name="chevronDown" />
            Mostrar mais {Math.min(lista.restantes, PASSO_DA_LISTA)}
          </button>
        )}
      </div>
    </div>
  );
}
