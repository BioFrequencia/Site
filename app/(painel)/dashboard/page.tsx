"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Topbar } from "@/components/Topbar";
import { Icon } from "@/components/Icon";
import { classeBadgePrioridade, iniciais, rotuloTipoAlerta } from "@/lib/format";
import type { Dashboard } from "@/lib/types";

const RAIO = 80;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

export default function DashboardPage() {
  const { coordenacao } = useAuth();
  const [dados, setDados] = useState<Dashboard | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      setCarregando(true);
      const resposta = await Api.dashboard();
      if (!ativo) return;
      if (resposta.sucesso && resposta.dados) {
        setDados(resposta.dados);
        setErro(null);
      } else {
        setErro(resposta.mensagem);
      }
      setCarregando(false);
    }
    carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const primeiroNome = coordenacao?.nome_coordenacao?.split(" ")[0] ?? "";

  return (
    <>
      <Topbar titulo={`Olá, ${primeiroNome}`} subtitulo="Aqui está um resumo da frequência da sua rede hoje." />

      {erro && <div className="error-block">{erro}</div>}
      {carregando && !dados && <div className="loading-block">Carregando dashboard…</div>}

      {dados && (
        <>
          <div className="hero">
            <div className="hero-gauge">
              <div className="gauge-wrap">
                <svg viewBox="0 0 188 188">
                  <circle cx="94" cy="94" r={RAIO} fill="none" stroke="var(--mist-200)" strokeWidth="14" />
                  <circle
                    cx="94"
                    cy="94"
                    r={RAIO}
                    fill="none"
                    stroke="var(--indigo)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={CIRCUNFERENCIA}
                    strokeDashoffset={CIRCUNFERENCIA * (1 - Math.min(100, Math.max(0, dados.frequencia_geral)) / 100)}
                  />
                </svg>
                <div className="gauge-center">
                  <div className="gauge-value">{dados.frequencia_geral}%</div>
                  <div className="gauge-label">Frequência geral do mês</div>
                </div>
              </div>
              <div className={`gauge-delta${dados.delta_frequencia < 0 ? " negativo" : ""}`}>
                <Icon name="trend" />
                {dados.delta_frequencia >= 0 ? "+" : ""}
                {dados.delta_frequencia}% vs. mês anterior
              </div>
            </div>
            <div className="hero-stats">
              <div className="stat-row">
                <div>
                  <div className="stat-label">Alertas ativos</div>
                  <div className="stat-sub">{dados.alertas_alta_prioridade} de alta prioridade</div>
                </div>
                <div className="stat-value">{dados.alertas_ativos}</div>
              </div>
              <div className="stat-row">
                <div>
                  <div className="stat-label">Alunos em observação</div>
                  <div className="stat-sub">Frequência entre 80% e 90%</div>
                </div>
                <div className="stat-value">{dados.alunos_observacao}</div>
              </div>
              <div className="stat-row">
                <div>
                  <div className="stat-label">Atrasos no mês</div>
                  <div className="stat-sub">
                    {dados.delta_atrasos >= 0 ? "+" : ""}
                    {dados.delta_atrasos} vs. mês anterior
                  </div>
                </div>
                <div className="stat-value">{dados.atrasos_mes}</div>
              </div>
              <div className="stat-row">
                <div>
                  <div className="stat-label">Contatos pendentes</div>
                  <div className="stat-sub">Alunos com alerta sem contato recente</div>
                </div>
                <div className="stat-value">{dados.contatos_pendentes}</div>
              </div>
            </div>
          </div>

          <div className="grid-2">
            <div className="panel">
              <div className="panel-head">
                <h2>Evolução da frequência</h2>
                <span className="panel-meta">Últimos 6 meses</span>
              </div>
              <GraficoEvolucao pontos={dados.evolucao_mensal} />
              <div className="chart-legend">
                <span>
                  <span className="legend-dot" /> Frequência geral (%)
                </span>
              </div>
            </div>

            <div className="panel">
              <div className="panel-head">
                <h2>Frequência por turma</h2>
              </div>
              {dados.turmas.length === 0 && <p className="results-caption">Nenhuma turma cadastrada.</p>}
              {dados.turmas.map((turma) => (
                <div className="turma-row" key={turma.nome_sala}>
                  <span className="turma-name">{turma.nome_sala}</span>
                  <div className="turma-bar-track">
                    <div
                      className="turma-bar-fill"
                      style={{ width: `${turma.frequencia}%`, background: "var(--indigo)" }}
                    />
                  </div>
                  <span className="turma-pct">{turma.frequencia}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Alunos que precisam de atenção</h2>
              <Link href="/alertas" className="panel-meta">
                Ver todos os alertas
              </Link>
            </div>
            {dados.prioridade_lista.length === 0 ? (
              <div className="empty-state">
                <Icon name="check" />
                <p>Nenhum alerta ativo no momento.</p>
              </div>
            ) : (
              <table className="priority-list">
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Tipo</th>
                    <th>Motivo</th>
                    <th>Prioridade</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.prioridade_lista.map((alerta) => (
                    <tr key={alerta.id_alerta}>
                      <td>
                        <div className="student-cell">
                          <div className="avatar">{iniciais(alerta.nome_aluno)}</div>
                          <div>
                            <div className="student-name">{alerta.nome_aluno}</div>
                            <div className="student-turma">{alerta.turma ?? "Sem turma"}</div>
                          </div>
                        </div>
                      </td>
                      <td>{rotuloTipoAlerta(alerta.tipo)}</td>
                      <td>{alerta.motivo}</td>
                      <td>
                        <span className={classeBadgePrioridade(alerta.prioridade)}>{alerta.prioridade}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </>
  );
}

function GraficoEvolucao({ pontos }: { pontos: Dashboard["evolucao_mensal"] }) {
  if (pontos.length === 0) return <p className="results-caption">Sem dados suficientes ainda.</p>;

  const largura = 600;
  const altura = 180;
  const valores = pontos.map((p) => p.frequencia);
  const min = Math.max(0, Math.min(...valores) - 5);
  const max = Math.min(100, Math.max(...valores) + 5) || 100;
  const escalaX = (i: number) => (pontos.length > 1 ? (i / (pontos.length - 1)) * largura : largura / 2);
  const escalaY = (v: number) => altura - ((v - min) / (max - min || 1)) * altura;

  const linha = pontos.map((p, i) => `${escalaX(i)},${escalaY(p.frequencia)}`).join(" ");
  const area = `0,${altura} ${linha} ${largura},${altura}`;

  const nomeMes = (iso: string) => {
    const data = new Date(iso + "T00:00:00");
    return data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
  };

  return (
    <svg className="chart-svg" viewBox={`0 0 ${largura} ${altura + 24}`} preserveAspectRatio="none">
      <polygon points={area} fill="var(--indigo-50)" />
      <polyline points={linha} fill="none" stroke="var(--indigo)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pontos.map((p, i) => (
        <circle key={p.mes} cx={escalaX(i)} cy={escalaY(p.frequencia)} r="3.5" fill="var(--indigo)" />
      ))}
      {pontos.map((p, i) => (
        <text key={p.mes} x={escalaX(i)} y={altura + 18} fontSize="11" fill="var(--ink-500)" textAnchor="middle">
          {nomeMes(p.mes)}
        </text>
      ))}
    </svg>
  );
}
