"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  CHAVE_PREFERENCIAS,
  PREFERENCIAS_PADRAO,
  configuracaoDeSons,
  lerPreferenciasGuardadas,
  preferenciasDaApi,
  preferenciasParaApi,
  type Preferencias,
} from "@/lib/preferencias";
import { configurarSons, prepararSons } from "@/lib/sons";
import { aplicarEscolhaDeTema } from "@/lib/tema";

interface PreferenciasContextValue {
  preferencias: Preferencias;
  /** Já vieram da conta (API), e não só da cópia do navegador. */
  daConta: boolean;
  /** Aplica na hora e salva na conta. Devolve a mensagem de erro, ou null. */
  salvar: (mudancas: Partial<Preferencias>) => Promise<string | null>;
}

const PreferenciasContext = createContext<PreferenciasContextValue | null>(null);

function guardarNoNavegador(preferencias: Preferencias): void {
  try {
    localStorage.setItem(CHAVE_PREFERENCIAS, JSON.stringify(preferenciasParaApi(preferencias)));
  } catch {
    // Sem armazenamento: as preferências vêm da conta a cada abertura.
  }
}

/**
 * Preferências da conta (tema e sons) para o site inteiro. Ao abrir,
 * configura os sons pela cópia do navegador; com a sessão aberta, busca
 * as da conta (que valem em qualquer computador); e cada mudança - em
 * Minha conta > Preferências ou no botão de tema - é aplicada na hora e
 * salva na conta.
 */
export function PreferenciasProvider({ children }: { children: ReactNode }) {
  const { autenticado } = useAuth();
  const [preferencias, setPreferencias] = useState<Preferencias>(PREFERENCIAS_PADRAO);
  const [daConta, setDaConta] = useState(false);
  const atuais = useRef(PREFERENCIAS_PADRAO);

  const aplicar = useCallback((novas: Preferencias) => {
    atuais.current = novas;
    setPreferencias(novas);
    configurarSons(configuracaoDeSons(novas));
    guardarNoNavegador(novas);
  }, []);

  useEffect(() => {
    let guardadas = PREFERENCIAS_PADRAO;
    try {
      guardadas = lerPreferenciasGuardadas(localStorage.getItem(CHAVE_PREFERENCIAS));
    } catch {
      // Navegador sem armazenamento: fica o padrão.
    }
    atuais.current = guardadas;
    setPreferencias(guardadas);
    configurarSons(configuracaoDeSons(guardadas));

    // O navegador só libera áudio depois da primeira interação: aí os
    // sons já ficam carregados, para o primeiro não atrasar.
    function aoInteragir() {
      if (atuais.current.sonsAtivos) prepararSons();
    }
    window.addEventListener("pointerdown", aoInteragir, { once: true });
    window.addEventListener("keydown", aoInteragir, { once: true });
    return () => {
      window.removeEventListener("pointerdown", aoInteragir);
      window.removeEventListener("keydown", aoInteragir);
    };
  }, []);

  useEffect(() => {
    if (!autenticado) {
      setDaConta(false);
      return;
    }
    let ativo = true;
    Api.preferencias().then((resposta) => {
      if (!ativo || !resposta.sucesso || !resposta.dados) return;
      const daApi = preferenciasDaApi(resposta.dados);
      aplicar(daApi);
      aplicarEscolhaDeTema(daApi.tema);
      setDaConta(true);
    });
    return () => {
      ativo = false;
    };
  }, [autenticado, aplicar]);

  const salvar = useCallback(
    async (mudancas: Partial<Preferencias>): Promise<string | null> => {
      const anteriores = atuais.current;
      aplicar({ ...anteriores, ...mudancas });
      if (mudancas.tema) aplicarEscolhaDeTema(mudancas.tema);
      // Sem login (tela de entrar, downloads): vale só neste navegador.
      if (!autenticado) return null;

      const resposta = await Api.salvarPreferencias(preferenciasParaApi(mudancas));
      if (resposta.sucesso) return null;
      aplicar(anteriores);
      if (mudancas.tema) aplicarEscolhaDeTema(anteriores.tema);
      return resposta.mensagem || "Não foi possível salvar a preferência.";
    },
    [autenticado, aplicar]
  );

  return <PreferenciasContext.Provider value={{ preferencias, daConta, salvar }}>{children}</PreferenciasContext.Provider>;
}

export function usePreferencias(): PreferenciasContextValue {
  const contexto = useContext(PreferenciasContext);
  if (!contexto) throw new Error("usePreferencias precisa estar dentro de <PreferenciasProvider>");
  return contexto;
}
