"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Api } from "./api";
import { tokenExpirado } from "./sessao";
import type { Coordenacao } from "./types";

interface AuthContextValue {
  coordenacao: Coordenacao | null;
  carregando: boolean;
  autenticado: boolean;
  login: (coordenacaoComToken: Coordenacao & { token: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Páginas que funcionam sem login (fora do grupo (painel)). */
const ROTAS_PUBLICAS = ["/", "/login", "/cadastro", "/downloads"];

/** Sessão salva no navegador, descartando a que já venceu. */
function sessaoSalvaValida(): Coordenacao | null {
  const token = Api.obterToken();
  const coordenacao = Api.obterCoordenacao();
  if (!token || !coordenacao) return null;
  if (tokenExpirado(token, Date.now())) {
    Api.encerrarSessao();
    return null;
  }
  return coordenacao;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [coordenacao, setCoordenacao] = useState<Coordenacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();
  const jaExpirou = useRef(false);

  useEffect(() => {
    // Sem a checagem do "exp", uma sessão de ontem abria o painel com o
    // nome da pessoa e erro em todas as telas até alguma chamada voltar 401.
    setCoordenacao(sessaoSalvaValida());
    setCarregando(false);
  }, []);

  function login(dados: Coordenacao & { token: string }) {
    jaExpirou.current = false;
    Api.iniciarSessao(dados);
    setCoordenacao(dados);
  }

  function logout() {
    Api.encerrarSessao();
    setCoordenacao(null);
    router.replace("/login");
  }

  useEffect(() => {
    // Sem isso, um token ausente/expirado (ex.: sessão de um dia
    // anterior ainda salva no localStorage) fazia cada chamada da API
    // devolver "naoAutenticado", mas nada limpava a sessão nem tirava o
    // usuário da tela - ele ficava preso vendo mensagens de erro em
    // todo painel, achando que estava logado (o nome dele continuava
    // aparecendo na sidebar). Qualquer resposta "naoAutenticado" agora
    // encerra a sessão de verdade e manda pro login.
    function expirar() {
      if (jaExpirou.current) return;
      jaExpirou.current = true;
      Api.encerrarSessao();
      setCoordenacao(null);
      router.replace("/login?motivo=expirada");
    }
    Api.definirCallbackSessaoExpirada(expirar);

    // Aba que ficou aberta: ao voltar para ela depois do vencimento do
    // token, sai na hora em vez de esperar a próxima chamada falhar. Nas
    // páginas públicas (downloads, login) só limpa a sessão, sem desviar.
    function aoVoltarParaAba() {
      const token = Api.obterToken();
      if (document.visibilityState !== "visible" || !token || !tokenExpirado(token, Date.now())) return;
      if (ROTAS_PUBLICAS.includes(window.location.pathname)) {
        Api.encerrarSessao();
        setCoordenacao(null);
      } else {
        expirar();
      }
    }
    document.addEventListener("visibilitychange", aoVoltarParaAba);
    return () => {
      Api.definirCallbackSessaoExpirada(null);
      document.removeEventListener("visibilitychange", aoVoltarParaAba);
    };
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ coordenacao, carregando, autenticado: !!coordenacao, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return contexto;
}
