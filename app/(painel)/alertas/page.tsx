"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { useToast } from "@/components/Toast";
import { classeBadgePrioridade, formatarData, iniciais, rotuloTipoAlerta } from "@/lib/format";
import type { Alerta, Sala } from "@/lib/types";

export default function AlertasPage() {
  const { mostrarToast } = useToast();
  const [salas, setSalas] = useState<Sala[]>([]);
  const [idSala, setIdSala] = useState<string>("");
  const [tipo, setTipo] = useState<string>("");
  const [prioridade, setPrioridade] = useState<string>("");
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [encerrando, setEncerrando] = useState<number | null>(null);

  useEffect(() => {
    Api.listarSalas().then((resposta) => {
      if (resposta.sucesso && resposta.dados) setSalas(resposta.dados);
    });
  }, []);

  async function carregar() {
    setCarregando(true);
    const resposta = await Api.alertas(idSala ? Number(idSala) : null, tipo || null, prioridade || null);
    if (resposta.sucesso && resposta.dados) {
      setAlertas(resposta.dados.alertas);
      setErro(null);
    } else {
      setErro(resposta.mensagem);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idSala, tipo, prioridade]);

  async function encerrar(alerta: Alerta) {
    setEncerrando(alerta.id_aluno);
    const resposta = await Api.encerrarAlerta(alerta.id_aluno);
    setEncerrando(null);
    if (!resposta.sucesso) {
      mostrarToast(resposta.mensagem, true);
      return;
    }
    mostrarToast(`Alertas de ${alerta.nome_aluno} encerrados por hoje.`);
    setAlertas((atual) => atual.filter((a) => a.id_aluno !== alerta.id_aluno));
  }

  return (
    <>
      <Topbar titulo="Alertas" subtitulo="Alunos que precisam de atenção agora." />

      <div className="filter-bar">
        <select className="filter-select" value={idSala} onChange={(e) => setIdSala(e.target.value)}>
          <option key="" value="">Todas as turmas</option>
          {salas.map((sala) => (
            <option key={sala.id_sala} value={sala.id_sala}>
              {sala.nome_sala}
            </option>
          ))}
        </select>

        <div className="filter-divider" />

        <div className="pill-group">
          {[
            { valor: "", rotulo: "Todos os tipos" },
            { valor: "frequencia", rotulo: "Frequência" },
            { valor: "faltas", rotulo: "Faltas" },
            { valor: "atrasos", rotulo: "Atrasos" },
          ].map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              className={`filter-pill${tipo === opcao.valor ? " active" : ""}`}
              onClick={() => setTipo(opcao.valor)}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>

        <div className="filter-divider" />

        <div className="pill-group">
          {[
            { valor: "", rotulo: "Todas prioridades" },
            { valor: "alta", rotulo: "Alta" },
            { valor: "media", rotulo: "Média" },
            { valor: "baixa", rotulo: "Baixa" },
          ].map((opcao) => (
            <button
              key={opcao.valor}
              type="button"
              className={`filter-pill${prioridade === opcao.valor ? " active" : ""}`}
              onClick={() => setPrioridade(opcao.valor)}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="error-block">{erro}</div>}
      {carregando && <div className="loading-block">Carregando alertas…</div>}

      {!carregando && (
        <>
          <p className="results-caption">{alertas.length} alerta(s) encontrado(s).</p>

          {alertas.length === 0 ? (
            <div className="empty-state">
              <Icon name="check" />
              <p>Nenhum alerta ativo com esses filtros.</p>
            </div>
          ) : (
            alertas.map((alerta) => (
              <div className="alert-item" data-priority={alerta.prioridade} key={alerta.id_alerta}>
                <div className="avatar">{iniciais(alerta.nome_aluno)}</div>
                <div className="alert-main">
                  <div className="alert-name-row">
                    <Link href={`/turmas/${alerta.id_aluno}`} style={{ fontWeight: 700 }}>
                      {alerta.nome_aluno}
                    </Link>
                    <span className="tag">{alerta.turma ?? "Sem turma"}</span>
                    <span className="tag">{rotuloTipoAlerta(alerta.tipo)}</span>
                  </div>
                  <div className="alert-reason">{alerta.motivo}</div>
                  <div className="alert-meta">Referência: {formatarData(alerta.dta_referencia)}</div>
                </div>
                <div className="alert-side">
                  <span className={classeBadgePrioridade(alerta.prioridade)}>{alerta.prioridade}</span>
                  <div className="alert-actions">
                    <Link href={`/turmas/${alerta.id_aluno}`} className="btn btn-sm">
                      Ver aluno
                    </Link>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => encerrar(alerta)}
                      disabled={encerrando === alerta.id_aluno}
                    >
                      {encerrando === alerta.id_aluno ? "Encerrando…" : "Encerrar"}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </>
  );
}
