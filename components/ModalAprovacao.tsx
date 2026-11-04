"use client";

import { useState } from "react";
import { Modal } from "@/components/Modal";
import { ROTULOS_CARGO, ROTULOS_PAPEL, papelSugeridoPeloCargo, type CargoNaEscola, type PapelConta } from "@/lib/types";

const DESCRICAO_PAPEL: Record<PapelConta, string> = {
  gestor: "Configura a escola (horários, calendário e regras), aprova a equipe e apaga registros feitos por engano.",
  coordenador: "Registra entradas e saídas, cuida dos alunos e dos responsáveis e acompanha os alertas.",
};

export interface PedidoDeAcesso {
  nome: string;
  cargo?: CargoNaEscola | null;
  /** A escola ainda não tem gestão ativa: quem for aprovado vira a gestão dela. */
  escolaSemGestao?: boolean;
}

/**
 * Aprovar um pedido de acesso escolhendo a permissão (migração 010): cargo
 * e permissão são coisas diferentes, e é quem aprova que decide. A
 * permissão sugerida pelo cargo vem marcada (direção e vice-direção: Gestão).
 * Abra com uma key por pessoa, para a escolha começar de novo a cada pedido.
 */
export function ModalAprovacao({
  pedido,
  onFechar,
  onAprovar,
}: {
  pedido: PedidoDeAcesso | null;
  onFechar: () => void;
  onAprovar: (papel: PapelConta) => Promise<void>;
}) {
  const sugerido = papelSugeridoPeloCargo(pedido?.cargo);
  const [escolhido, setEscolhido] = useState<PapelConta>(sugerido);
  const [enviando, setEnviando] = useState(false);
  const papel: PapelConta = pedido?.escolaSemGestao ? "gestor" : escolhido;

  async function aprovar() {
    setEnviando(true);
    await onAprovar(papel);
    setEnviando(false);
  }

  return (
    <Modal
      titulo={pedido ? `Aprovar o acesso de ${pedido.nome}` : ""}
      aberto={pedido !== null}
      onFechar={onFechar}
      footer={
        <>
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-primary" onClick={aprovar} disabled={enviando} aria-busy={enviando}>
            {enviando ? "Aprovando…" : `Aprovar como ${ROTULOS_PAPEL[papel]}`}
          </button>
        </>
      }
    >
      <p className="modal-summary">
        {pedido?.cargo ? (
          <>
            Cargo informado no cadastro: <b>{ROTULOS_CARGO[pedido.cargo]}</b>.
          </>
        ) : (
          "Esta conta não informou o cargo."
        )}{" "}
        Escolha o que a pessoa pode fazer no sistema.
      </p>
      {pedido?.escolaSemGestao && (
        <p className="aviso-escola">A escola ainda não tem gestão: quem for aprovado agora vira a gestão dela.</p>
      )}
      <fieldset className="escolha-papel" disabled={pedido?.escolaSemGestao}>
        <legend className="sr-only">Permissão</legend>
        {(["gestor", "coordenador"] as PapelConta[]).map((opcao) => (
          <label key={opcao} className={`opcao-papel${papel === opcao ? " ativa" : ""}`}>
            <input type="radio" name="papel" value={opcao} checked={papel === opcao} onChange={() => setEscolhido(opcao)} />
            <span>
              <b>
                {ROTULOS_PAPEL[opcao]}
                {opcao === sugerido && pedido?.cargo && <span className="selo-sugerido">sugerida pelo cargo</span>}
              </b>
              <small>{DESCRICAO_PAPEL[opcao]}</small>
            </span>
          </label>
        ))}
      </fieldset>
    </Modal>
  );
}
