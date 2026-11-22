"use client";

import { useState, type FormEvent } from "react";
import { Api } from "@/lib/api";
import type { TipoCancelavel } from "@/lib/types";
import { Modal } from "./Modal";

const NOMES: Record<TipoCancelavel, string> = {
  atraso: "entrada atrasada",
  saida: "saída antecipada",
  presenca: "presença",
};

/** O registro a cancelar ou restaurar, e como a tela o descreve para confirmar. */
export interface AlvoCorrecao {
  acao: "cancelar" | "restaurar";
  tipo: TipoCancelavel;
  id: number;
  /** Ex.: "Ana Lima (6º A) · entrada atrasada em 19/11/2026 às 07:31" */
  descricao: string;
}

/**
 * Cancelar ou restaurar um registro (migração 012). Nada é apagado: o
 * cancelado continua na ficha do aluno, marcado, e sai das contas. Cancelar
 * pede o motivo, que fica no histórico de correções com quem fez e quando.
 */
export function ModalCorrecaoRegistro({
  alvo,
  onFechar,
  onConcluido,
}: {
  alvo: AlvoCorrecao | null;
  onFechar: () => void;
  onConcluido: (mensagem: string) => void;
}) {
  if (!alvo) return null;
  // A chave recria o formulário a cada registro: o motivo não passa de um para outro.
  return <FormularioCorrecao key={`${alvo.acao}-${alvo.tipo}-${alvo.id}`} alvo={alvo} onFechar={onFechar} onConcluido={onConcluido} />;
}

function FormularioCorrecao({
  alvo,
  onFechar,
  onConcluido,
}: {
  alvo: AlvoCorrecao;
  onFechar: () => void;
  onConcluido: (mensagem: string) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const nome = NOMES[alvo.tipo];
  const cancelar = alvo.acao === "cancelar";

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    const texto = motivo.trim();
    if (cancelar && texto.length < 3) {
      setErro("Escreva o motivo do cancelamento (ex.: aluno errado, lançado em dobro).");
      return;
    }
    setEnviando(true);
    const resposta = cancelar
      ? await Api.cancelarRegistro(alvo.tipo, alvo.id, texto)
      : await Api.restaurarRegistro(alvo.tipo, alvo.id, texto || null);
    setEnviando(false);
    if (!resposta.sucesso) {
      setErro(resposta.mensagem);
      return;
    }
    onConcluido(resposta.mensagem);
  }

  return (
    <Modal titulo={cancelar ? `Cancelar ${nome}` : `Restaurar ${nome}`} aberto onFechar={onFechar}>
      <form onSubmit={enviar} noValidate>
        <p className="modal-summary">{alvo.descricao}</p>
        <p className="correcao-explicacao">
          {cancelar
            ? `O registro não é apagado: fica na ficha do aluno como cancelado, com o seu nome, a data e o motivo, e deixa de contar nas porcentagens, nos alertas e nos relatórios.${
                alvo.tipo === "presenca" ? " A entrada atrasada que esta presença gerou também é cancelada." : ""
              } Avisos que já foram para a família não voltam.`
            : "O registro volta a contar nas porcentagens, nos alertas e nos relatórios. A restauração também fica no histórico de correções."}
        </p>
        <div className="modal-field">
          <label htmlFor="motivo-correcao">{cancelar ? "Motivo do cancelamento" : "Motivo (opcional)"}</label>
          <textarea
            id="motivo-correcao"
            value={motivo}
            maxLength={200}
            rows={3}
            // O foco vai para o motivo ao abrir: dá para escrever e confirmar só pelo teclado.
            autoFocus
            required={cancelar}
            aria-invalid={erro !== null}
            aria-describedby={erro !== null ? "erro-correcao" : undefined}
            onChange={(e) => {
              setMotivo(e.target.value);
              if (erro) setErro(null);
            }}
          />
        </div>
        {erro && (
          <p className="field-error show" id="erro-correcao" role="alert">
            {erro}
          </p>
        )}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onFechar}>
            Voltar
          </button>
          <button type="submit" className={cancelar ? "btn btn-danger" : "btn btn-primary"} disabled={enviando} aria-busy={enviando}>
            {enviando ? "Salvando…" : cancelar ? `Cancelar ${nome}` : `Restaurar ${nome}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
