"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { formatarDataHora, horarioLocalEscola, iniciais } from "@/lib/format";
import type { CheckinPendente } from "@/lib/types";

// Mesma lógica de BioFrequencia/Windows/CheckinsPendentes.xaml.cs: a
// confirmação só marca o check-in como revisado (digital/confirmarCheckin.php);
// quando o tipo é "atraso", o atraso oficial é gravado com os MESMOS
// endpoints de sempre (marcarAtraso), agora com a coordenação como autora.
export default function CheckinsPage() {
  const { mostrarToast } = useToast();
  const [checkins, setCheckins] = useState<CheckinPendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<number | null>(null);

  async function carregar() {
    setCarregando(true);
    const resposta = await Api.listarCheckinsPendentes();
    if (resposta.sucesso && resposta.dados) {
      setCheckins(resposta.dados);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function confirmar(checkin: CheckinPendente) {
    const rotuloTipo = checkin.tipo === "atraso" ? "atraso" : "presença";
    if (!confirm(`Confirmar o check-in de ${checkin.nome_aluno} e registrar como ${rotuloTipo} oficial?`)) return;

    setConfirmando(checkin.id_checkin);

    // O atraso é lançado ANTES de marcar o check-in como confirmado: se o
    // lançamento falhar, o check-in continua na fila para tentar de novo
    // (antes ficava confirmado sem atraso nenhum). E é do horário do
    // check-in, não de quando a coordenação confirmou - confirmar no dia
    // seguinte lançava o atraso no dia errado.
    let aviso = "Check-in confirmado.";
    if (checkin.tipo === "atraso") {
      const resposta = await Api.marcarAtraso(
        checkin.id_aluno,
        "Confirmado via check-in biométrico do dispositivo do aluno",
        null,
        false,
        horarioLocalEscola(checkin.data_checkin) ?? undefined
      );
      if (resposta.status === 409) {
        aviso = "Check-in confirmado. O atraso desse dia já estava lançado.";
      } else if (!resposta.sucesso) {
        setConfirmando(null);
        mostrarToast(`O atraso não foi lançado: ${resposta.mensagem}`, true);
        return;
      }
    }

    const respostaConfirmacao = await Api.confirmarCheckin(checkin.id_checkin);
    setConfirmando(null);
    if (!respostaConfirmacao.sucesso) {
      mostrarToast(respostaConfirmacao.mensagem, true);
      return;
    }
    mostrarToast(aviso);
    setCheckins((atual) => atual.filter((c) => c.id_checkin !== checkin.id_checkin));
  }

  return (
    <>
      <Topbar titulo="Check-ins" subtitulo={`${checkins.length} check-in(s) pendente(s) de confirmação.`} />

      {erro && <div className="error-block">{erro}</div>}
      {carregando && <div className="loading-block">Carregando check-ins…</div>}

      {!carregando && (
        <div className="panel">
          {checkins.length === 0 ? (
            <div className="empty-state">
              <Icon name="fingerprint" />
              <p>Nenhum check-in pendente. Os check-ins feitos pelo app do aluno aparecem aqui.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>Tipo</th>
                  <th>Método</th>
                  <th>Data</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {checkins.map((checkin) => (
                  <tr key={checkin.id_checkin}>
                    <td>
                      <div className="student-cell">
                        <div className="avatar">{iniciais(checkin.nome_aluno)}</div>
                        <Link href={`/turmas/${checkin.id_aluno}`} className="student-name">
                          {checkin.nome_aluno}
                        </Link>
                      </div>
                    </td>
                    <td>{checkin.nome_sala ?? "-"}</td>
                    <td>
                      <span className={`badge ${checkin.tipo === "atraso" ? "badge--media" : "badge--regular"}`}>
                        {checkin.tipo === "atraso" ? "Atraso" : "Presença"}
                      </span>
                    </td>
                    <td>{checkin.metodo}</td>
                    <td>{formatarDataHora(checkin.data_checkin)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => confirmar(checkin)}
                        disabled={confirmando === checkin.id_checkin}
                      >
                        {confirmando === checkin.id_checkin ? "Confirmando…" : "Confirmar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </>
  );
}
