"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

interface ToastState {
  id: number;
  texto: string;
  erro: boolean;
}

interface ToastContextValue {
  mostrarToast: (texto: string, erro?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/** Quantos avisos cabem na tela ao mesmo tempo antes de empilhar demais. */
const MAXIMO_VISIVEL = 3;
const DURACAO_MS = 4500;

/**
 * Avisos de sucesso/erro.
 *
 * Antes só existia um aviso por vez: um novo substituía o anterior na
 * hora, então uma ação que gerava duas mensagens (ex.: aprovar e
 * recarregar a lista) mostrava só a última, e um erro podia sumir antes
 * de ser lido. Agora eles se acumulam numa pilha, somem sozinhos e podem
 * ser fechados na mão.
 *
 * O erro fica mais tempo que o sucesso de propósito: ler "não foi
 * possível conectar ao servidor" leva mais tempo que ler "salvo".
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([]);
  const proximoId = useRef(0);
  const timeouts = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const fechar = useCallback((id: number) => {
    setToasts((atuais) => atuais.filter((t) => t.id !== id));
    const timeout = timeouts.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeouts.current.delete(id);
    }
  }, []);

  const mostrarToast = useCallback(
    (texto: string, erro = false) => {
      const id = ++proximoId.current;
      setToasts((atuais) => [...atuais, { id, texto, erro }].slice(-MAXIMO_VISIVEL));
      timeouts.current.set(
        id,
        setTimeout(() => fechar(id), erro ? DURACAO_MS * 1.6 : DURACAO_MS)
      );
    },
    [fechar]
  );

  // Sem isto, sair da página com avisos abertos deixava timers rodando
  // contra um componente que não existe mais.
  useEffect(() => {
    const pendentes = timeouts.current;
    return () => {
      pendentes.forEach((timeout) => clearTimeout(timeout));
      pendentes.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      {/* aria-live para leitores de tela anunciarem o aviso sem que o
          foco do teclado precise sair de onde está. */}
      <div className="toast-pilha" role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast${toast.erro ? " error" : ""}`}>
            <span>{toast.texto}</span>
            <button
              type="button"
              className="toast-fechar"
              onClick={() => fechar(toast.id)}
              aria-label="Fechar aviso"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return contexto;
}
