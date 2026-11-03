"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Api } from "@/lib/api";
import { Modal } from "./Modal";
import { useToast } from "./Toast";
import { mensagemDoRegistro } from "@/lib/avisos";
import { horarioLocalEscola } from "@/lib/format";
import type { TipoRegistro } from "@/lib/types";

interface AlunoDoRegistro {
  id_aluno: number;
  nome_aluno: string;
  turma?: string | null;
}

/**
 * Registrar entrada atrasada ou saída antecipada. Com "aluno", o registro
 * é dele (ficha do aluno); com "alunos", a pessoa escolhe na lista (tela
 * Entradas e saídas, na portaria).
 *
 * A data e a hora começam em "agora" e podem ser corrigidas (registro do
 * que aconteceu mais cedo). A API recusa com a explicação quando não há
 * aula no dia, quando o horário está fora do período da turma ou dentro
 * da tolerância - a mensagem aparece aqui mesmo, com o som de erro.
 */
export function ModalRegistro({
  tipo,
  aluno,
  alunos,
  onFechar,
  onConfirmado,
}: {
  tipo: TipoRegistro | null;
  aluno?: AlunoDoRegistro;
  alunos?: AlunoDoRegistro[];
  onFechar: () => void;
  onConfirmado: (mensagem: string) => void;
}) {
  const { mostrarToast } = useToast();
  const [idAluno, setIdAluno] = useState<number | null>(aluno?.id_aluno ?? null);
  const [buscaAluno, setBuscaAluno] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");
  const [justificado, setJustificado] = useState(false);
  const [retiradoPor, setRetiradoPor] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!tipo) return;
    const agora = horarioLocalEscola(new Date().toISOString()) ?? "";
    setData(agora.slice(0, 10));
    setHora(agora.slice(11, 16));
    setIdAluno(aluno?.id_aluno ?? null);
    setBuscaAluno("");
    setMotivo("");
    setObservacao("");
    setJustificado(false);
    setRetiradoPor("");
    setErro(null);
  }, [tipo, aluno?.id_aluno]);

  const filtrados = useMemo(() => {
    const termo = buscaAluno.trim().toLowerCase();
    const lista = alunos ?? [];
    return (termo ? lista.filter((a) => a.nome_aluno.toLowerCase().includes(termo)) : lista).slice(0, 8);
  }, [alunos, buscaAluno]);

  const escolhido = aluno ?? alunos?.find((a) => a.id_aluno === idAluno) ?? null;
  const ehAtraso = tipo === "atraso";

  async function aoEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (!escolhido) {
      setErro("Escolha o aluno.");
      return;
    }
    if (!data || !hora) {
      setErro("Informe a data e o horário.");
      return;
    }
    setEnviando(true);
    setErro(null);
    const quando = `${data} ${hora}`;
    const resposta = ehAtraso
      ? await Api.marcarAtraso(escolhido.id_aluno, motivo.trim() || null, observacao.trim() || null, justificado, quando)
      : await Api.marcarSaida(escolhido.id_aluno, motivo.trim() || null, observacao.trim() || null, justificado, retiradoPor.trim() || null, quando);
    setEnviando(false);
    if (!resposta.sucesso) {
      setErro(resposta.mensagem);
      mostrarToast(resposta.mensagem, true);
      return;
    }
    onConfirmado(mensagemDoRegistro(tipo ?? "atraso", resposta.dados?.avisos));
  }

  return (
    <Modal titulo={ehAtraso ? "Registrar entrada atrasada" : "Registrar saída antecipada"} aberto={!!tipo} onFechar={onFechar}>
      <form onSubmit={aoEnviar}>
        {aluno ? (
          <div className="modal-summary">
            Aluno: <b>{aluno.nome_aluno}</b>
            {aluno.turma && <> · {aluno.turma}</>}
          </div>
        ) : (
          <div className="modal-field">
            <label htmlFor="buscaAlunoRegistro">Aluno</label>
            {escolhido ? (
              <div className="escolhido">
                <span>
                  <b>{escolhido.nome_aluno}</b>
                  {escolhido.turma && <> · {escolhido.turma}</>}
                </span>
                <button type="button" className="btn-text" onClick={() => setIdAluno(null)}>
                  Trocar
                </button>
              </div>
            ) : (
              <>
                <input
                  id="buscaAlunoRegistro"
                  value={buscaAluno}
                  onChange={(e) => setBuscaAluno(e.target.value)}
                  placeholder="Digite o nome do aluno"
                  autoComplete="off"
                  autoFocus
                />
                <div className="lista-escolha" role="listbox" aria-label="Alunos">
                  {filtrados.map((a) => (
                    <button type="button" role="option" aria-selected={false} key={a.id_aluno} onClick={() => setIdAluno(a.id_aluno)}>
                      <span>{a.nome_aluno}</span>
                      <span className="panel-meta">{a.turma ?? ""}</span>
                    </button>
                  ))}
                  {filtrados.length === 0 && <p className="results-caption">Nenhum aluno com esse nome.</p>}
                </div>
              </>
            )}
          </div>
        )}
        <div className="modal-field-row">
          <div className="modal-field">
            <label htmlFor="dataRegistro">Data</label>
            <input id="dataRegistro" type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </div>
          <div className="modal-field">
            <label htmlFor="horaRegistro">{ehAtraso ? "Horário da chegada" : "Horário da saída"}</label>
            <input id="horaRegistro" type="time" value={hora} onChange={(e) => setHora(e.target.value)} required />
          </div>
        </div>
        <div className="modal-field">
          <label htmlFor="motivoRegistro">Motivo</label>
          <input
            id="motivoRegistro"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder={ehAtraso ? "Opcional. Ex.: ônibus atrasou" : "Opcional. Ex.: consulta médica"}
            maxLength={150}
          />
        </div>
        {!ehAtraso && (
          <div className="modal-field">
            <label htmlFor="retiradoPor">Quem buscou o aluno</label>
            <input
              id="retiradoPor"
              value={retiradoPor}
              onChange={(e) => setRetiradoPor(e.target.value)}
              placeholder="Opcional. Ex.: Maria (mãe)"
              maxLength={150}
            />
          </div>
        )}
        <div className="modal-field">
          <label htmlFor="observacaoRegistro">Observação</label>
          <textarea id="observacaoRegistro" value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>
        <div className="modal-field checkbox-field">
          <input id="justificadoRegistro" type="checkbox" checked={justificado} onChange={(e) => setJustificado(e.target.checked)} />
          <label htmlFor="justificadoRegistro" style={{ margin: 0 }}>
            Justificado (com atestado, comunicado da família…)
          </label>
        </div>
        {erro && <p className="field-error show">{erro}</p>}
        <div className="modal-actions">
          <button type="button" className="btn" onClick={onFechar}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={enviando}>
            {enviando ? "Salvando…" : "Registrar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
