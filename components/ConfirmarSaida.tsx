"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { useAuth } from "@/lib/auth";

/**
 * "Sair" com confirmação, como no app e no programa do computador: os botões
 * de sair chamam pedirSaida(), que abre "Sair da conta?" com Cancelar e
 * Sair. Só "Sair" encerra a sessão (na API também) e volta para o login;
 * Cancelar (ou Esc, ou clicar fora) fecha a janela e devolve o foco ao botão.
 */
export function useConfirmarSaida() {
  const { logout } = useAuth();
  const [aberto, setAberto] = useState(false);
  const origem = useRef<HTMLElement | null>(null);

  const pedirSaida = useCallback(() => {
    origem.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setAberto(true);
  }, []);

  const cancelar = useCallback(() => {
    setAberto(false);
    // O botão que abriu pode ter sumido (ex.: o menu do celular fechou).
    requestAnimationFrame(() => {
      if (origem.current?.isConnected) origem.current.focus();
    });
  }, []);

  const sair = useCallback(() => {
    setAberto(false);
    logout();
  }, [logout]);

  const dialogoSaida = <DialogoSaida aberto={aberto} onCancelar={cancelar} onSair={sair} />;
  return { pedirSaida, dialogoSaida };
}

function DialogoSaida({ aberto, onCancelar, onSair }: { aberto: boolean; onCancelar: () => void; onSair: () => void }) {
  const botaoCancelar = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // Foco na opção que não muda nada: Enter por engano não tira ninguém da conta.
    if (aberto) botaoCancelar.current?.focus();
  }, [aberto]);

  return (
    <Modal
      titulo="Sair da conta?"
      aberto={aberto}
      onFechar={onCancelar}
      footer={
        <>
          <button ref={botaoCancelar} type="button" className="btn" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={onSair}>
            <Icon name="logout" />
            Sair
          </button>
        </>
      }
    >
      <p className="modal-summary">
        Deseja realmente encerrar a sessão neste aparelho? Para voltar, entre de novo com seu e-mail e sua senha.
      </p>
    </Modal>
  );
}
