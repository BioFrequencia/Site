"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ToastState {
  id: number;
  texto: string;
  erro: boolean;
}

interface ToastContextValue {
  mostrarToast: (texto: string, erro?: boolean) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const proximoId = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mostrarToast = useCallback((texto: string, erro = false) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const id = ++proximoId.current;
    setToast({ id, texto, erro });
    timeoutRef.current = setTimeout(() => {
      setToast((atual) => (atual?.id === id ? null : atual));
    }, 3200);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrarToast }}>
      {children}
      {toast && <div className={`toast${toast.erro ? " error" : ""}`}>{toast.texto}</div>}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error("useToast precisa estar dentro de <ToastProvider>");
  return contexto;
}
