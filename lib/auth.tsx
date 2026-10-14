"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Api } from "./api";
import type { Coordenacao } from "./types";

interface AuthContextValue {
  coordenacao: Coordenacao | null;
  carregando: boolean;
  autenticado: boolean;
  login: (coordenacaoComToken: Coordenacao & { token: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [coordenacao, setCoordenacao] = useState<Coordenacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const router = useRouter();
  const jaExpirou = useRef(false);

  useEffect(() => {
    setCoordenacao(Api.obterCoordenacao());
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
    Api.definirCallbackSessaoExpirada(() => {
      if (jaExpirou.current) return;
      jaExpirou.current = true;
      Api.encerrarSessao();
      setCoordenacao(null);
      router.replace("/login?motivo=expirada");
    });
    return () => Api.definirCallbackSessaoExpirada(null);
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
