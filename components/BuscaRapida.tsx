"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./Icon";
import { GRUPOS } from "./Sidebar";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/** Evento que o botão "Buscar" do topo dispara para abrir a busca. */
export const EVENTO_ABRIR_BUSCA = "biofrequencia:abrir-busca";

export function abrirBuscaRapida() {
  window.dispatchEvent(new Event(EVENTO_ABRIR_BUSCA));
}

/** Botão do topo das telas que abre a busca rápida. */
export function BotaoBusca({ className = "" }: { className?: string }) {
  return (
    <button type="button" className={`busca-gatilho ${className}`} onClick={abrirBuscaRapida} aria-keyshortcuts="Control+K" title="Buscar (Ctrl+K)">
      <Icon name="search" />
      <span className="busca-gatilho-texto">Buscar</span>
      <kbd className="busca-gatilho-tecla">Ctrl K</kbd>
    </button>
  );
}

interface Resultado {
  id: string;
  titulo: string;
  detalhe: string;
  icone: string;
  href: string;
  grupo: "Telas" | "Alunos";
}

/** Tira acentos e caixa para comparar "notificacoes" com "Notificações". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Busca rápida (Ctrl+K, ou "/" fora de um campo de texto): leva a qualquer
 * tela do menu e, a partir de duas letras, à ficha de um aluno pelo nome.
 * Setas escolhem, Enter abre, Esc fecha e devolve o foco para onde estava.
 */
export function BuscaRapida() {
  const router = useRouter();
  const { coordenacao } = useAuth();
  const [aberta, setAberta] = useState(false);
  const [termo, setTermo] = useState("");
  const [alunos, setAlunos] = useState<Resultado[]>([]);
  const [buscandoAlunos, setBuscandoAlunos] = useState(false);
  const [indice, setIndice] = useState(0);
  const campo = useRef<HTMLInputElement>(null);
  const focoAnterior = useRef<HTMLElement | null>(null);
  const idLista = useId();

  const abrir = useCallback(() => {
    focoAnterior.current = document.activeElement as HTMLElement | null;
    setTermo("");
    setAlunos([]);
    setIndice(0);
    setAberta(true);
  }, []);

  const fechar = useCallback(() => {
    setAberta(false);
    focoAnterior.current?.focus?.();
  }, []);

  // Atalhos globais e o botão do topo.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      const alvo = evento.target as HTMLElement | null;
      const digitando = !!alvo && (alvo.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(alvo.tagName));
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === "k") {
        evento.preventDefault();
        abrir();
      } else if (evento.key === "/" && !digitando && !evento.ctrlKey && !evento.metaKey && !evento.altKey) {
        evento.preventDefault();
        abrir();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener(EVENTO_ABRIR_BUSCA, abrir);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener(EVENTO_ABRIR_BUSCA, abrir);
    };
  }, [abrir]);

  useEffect(() => {
    if (aberta) campo.current?.focus();
  }, [aberta]);

  // Alunos pelo nome, depois de uma pausa na digitação (sem a barra de carregamento do topo).
  useEffect(() => {
    if (!aberta) return;
    const busca = termo.trim();
    if (busca.length < 2) {
      setAlunos([]);
      setBuscandoAlunos(false);
      return;
    }
    let valida = true;
    setBuscandoAlunos(true);
    const espera = setTimeout(async () => {
      const resposta = await Api.filtrarAlunos(busca, null, null, 1, 6, { segundoPlano: true });
      if (!valida) return;
      setBuscandoAlunos(false);
      setAlunos(
        (resposta.dados?.alunos ?? []).map((aluno) => ({
          id: `aluno-${aluno.id_aluno}`,
          titulo: aluno.nome_aluno,
          detalhe: aluno.turma ?? "Sem turma",
          icone: "student",
          href: `/turmas/${aluno.id_aluno}`,
          grupo: "Alunos" as const,
        }))
      );
    }, 250);
    return () => {
      valida = false;
      clearTimeout(espera);
    };
  }, [termo, aberta]);

  const telas = useMemo<Resultado[]>(() => {
    const visivel = (so?: "gestao" | "equipe") =>
      !so || (so === "equipe" ? !!coordenacao?.administrador : coordenacao?.papel === "gestor");
    const busca = normalizar(termo);
    return GRUPOS.flatMap((grupo) =>
      grupo.itens
        .filter((item) => visivel(item.so))
        .map((item) => ({
          id: `tela-${item.href}`,
          titulo: item.label,
          detalhe: grupo.titulo,
          icone: item.icone,
          href: item.href,
          grupo: "Telas" as const,
        }))
    ).filter((tela) => !busca || normalizar(`${tela.titulo} ${tela.detalhe}`).includes(busca));
  }, [termo, coordenacao]);

  const resultados = useMemo(() => [...telas, ...alunos], [telas, alunos]);

  useEffect(() => {
    setIndice((atual) => Math.min(atual, Math.max(resultados.length - 1, 0)));
  }, [resultados.length]);

  function ir(resultado: Resultado | undefined) {
    if (!resultado) return;
    setAberta(false);
    router.push(resultado.href);
  }

  function aoTeclarNoCampo(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndice((atual) => (resultados.length ? (atual + 1) % resultados.length : 0));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndice((atual) => (resultados.length ? (atual - 1 + resultados.length) % resultados.length : 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      ir(resultados[indice]);
    } else if (evento.key === "Escape") {
      evento.preventDefault();
      fechar();
    } else if (evento.key === "Tab") {
      // O foco fica no campo enquanto a busca está aberta.
      evento.preventDefault();
    }
  }

  if (!aberta) return null;

  const idOpcao = (i: number) => `${idLista}-opcao-${i}`;
  let grupoAnterior: Resultado["grupo"] | null = null;

  return (
    <div className="busca-fundo" onMouseDown={fechar}>
      <div className="busca" role="dialog" aria-modal="true" aria-label="Busca rápida" onMouseDown={(evento) => evento.stopPropagation()}>
        <div className="busca-campo">
          <Icon name="search" />
          <input
            ref={campo}
            type="text"
            value={termo}
            onChange={(evento) => {
              setTermo(evento.target.value);
              setIndice(0);
            }}
            onKeyDown={aoTeclarNoCampo}
            placeholder="Buscar uma tela ou um aluno pelo nome…"
            role="combobox"
            aria-expanded="true"
            aria-controls={idLista}
            aria-activedescendant={resultados.length ? idOpcao(indice) : undefined}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="busca-tecla">Esc</kbd>
        </div>
        <ul className="busca-lista" id={idLista} role="listbox" aria-label="Resultados">
          {resultados.map((resultado, i) => {
            const titulo = resultado.grupo !== grupoAnterior ? resultado.grupo : null;
            grupoAnterior = resultado.grupo;
            return (
              <li key={resultado.id} role="presentation">
                {titulo && (
                  <div className="busca-grupo" role="presentation">
                    {titulo}
                  </div>
                )}
                <div
                  id={idOpcao(i)}
                  role="option"
                  aria-selected={i === indice}
                  className={`busca-item${i === indice ? " ativo" : ""}`}
                  onMouseMove={() => setIndice(i)}
                  onClick={() => ir(resultado)}
                >
                  <span className="busca-item-icone">
                    <Icon name={resultado.icone} />
                  </span>
                  <span className="busca-item-texto">
                    <b>{resultado.titulo}</b>
                    <span>{resultado.detalhe}</span>
                  </span>
                  <Icon name="arrowRight" className="icon busca-item-seta" />
                </div>
              </li>
            );
          })}
        </ul>
        {resultados.length === 0 && !buscandoAlunos && <p className="busca-vazia">Nada encontrado para “{termo}”.</p>}
        {buscandoAlunos && <p className="busca-vazia">Procurando alunos…</p>}
        <div className="busca-rodape" aria-hidden="true">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> escolher
          </span>
          <span>
            <kbd>Enter</kbd> abrir
          </span>
          <span>
            <kbd>Ctrl</kbd>
            <kbd>K</kbd> abre de qualquer tela
          </span>
        </div>
      </div>
    </div>
  );
}
